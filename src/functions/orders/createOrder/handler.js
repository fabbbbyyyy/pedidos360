const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { BatchGetCommand, GetCommand, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { getUserFromEvent } = require('../../../libs/middlewares/auth');
const { createOrderSchema } = require('../../../models/order.model');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const CATALOG_TABLE = process.env.CATALOG_TABLE;

const orderKey = (id) => ({ pk: `ORDER#${id}`, sk: `ORDER#${id}` });
const idempotencyKey = (key) => ({ pk: `IDEMPOTENCY#${key}`, sk: `IDEMPOTENCY#${key}` });
const encodeHash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const data = createOrderSchema.parse(body);
  const user = event.user || getUserFromEvent(event);
  const customerId = user.oid || user.email;
  const requestIdempotencyKey = event.headers?.['Idempotency-Key'] || event.headers?.['idempotency-key'];

  if (!requestIdempotencyKey) {
    const e = new Error('Falta el header Idempotency-Key');
    e.statusCode = 400;
    throw e;
  }

  const requestHash = encodeHash({ customerId, items: data.items });
  const existing = await dynamoDb.send(new GetCommand({
    TableName: ORDERS_TABLE,
    Key: idempotencyKey(requestIdempotencyKey),
  }));

  if (existing.Item) {
    if (existing.Item.requestHash !== requestHash) {
      const e = new Error('La idempotency key ya fue usada con otro pedido');
      e.statusCode = 409;
      throw e;
    }
    const order = await dynamoDb.send(new GetCommand({
      TableName: ORDERS_TABLE,
      Key: orderKey(existing.Item.orderId),
    }));
    return success(order.Item, 201);
  }

  const productsResult = await dynamoDb.send(new BatchGetCommand({
    RequestItems: {
      [CATALOG_TABLE]: { Keys: data.items.map((item) => ({ id: item.productId })) },
    },
  }));
  const products = new Map((productsResult.Responses?.[CATALOG_TABLE] || []).map((product) => [product.id, product]));
  const missingProduct = data.items.find((item) => !products.has(item.productId));
  if (missingProduct) {
    const e = new Error(`Producto no encontrado: ${missingProduct.productId}`);
    e.statusCode = 404;
    throw e;
  }

  const now = new Date().toISOString();
  const orderId = uuidv4();
  const items = data.items.map((item) => {
    const product = products.get(item.productId);
    const lineTotal = item.quantity * product.price;
    return {
      productId: item.productId,
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal,
    };
  });
  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const order = {
    ...orderKey(orderId),
    id: orderId,
    entityType: 'ORDER',
    customerId,
    createdBy: user.email || customerId,
    status: 'PENDING',
    items,
    subtotal,
    total: subtotal,
    currency: 'CLP',
    createdAt: now,
    updatedAt: now,
    version: 1,
    gsi1pk: `CUSTOMER#${customerId}`,
    gsi1sk: now,
    gsi2pk: 'ORDERS',
    gsi2sk: `${now}#${orderId}`,
  };

  // "Coordinación de stock" (responsabilidad de ms-pedidos360-orders):
  // se descuenta el stock de cada producto de forma atómica en la misma
  // transacción en que se crea el pedido. Si el stock no alcanza para
  // algún ítem, TODA la operación se cancela (no queda nada a medias).
  const transactItems = [
    ...items.map((item) => ({
      Update: {
        TableName: CATALOG_TABLE,
        Key: { id: item.productId },
        UpdateExpression: 'SET stock = stock - :qty',
        ConditionExpression: 'attribute_exists(id) AND stock >= :qty',
        ExpressionAttributeValues: { ':qty': item.quantity },
      },
    })),
    {
      Put: {
        TableName: ORDERS_TABLE,
        Item: order,
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    },
    {
      Put: {
        TableName: ORDERS_TABLE,
        Item: { ...idempotencyKey(requestIdempotencyKey), entityType: 'IDEMPOTENCY', orderId, requestHash },
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    },
  ];

  try {
    await dynamoDb.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (err) {
    if (err.name === 'TransactionCanceledException') {
      const e = new Error('Stock insuficiente para uno o más productos del pedido, o producto inexistente');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }

  return success(order, 201);
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.create)(handler)),};

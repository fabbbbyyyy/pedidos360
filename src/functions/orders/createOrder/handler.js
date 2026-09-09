const { v4: uuidv4 } = require('uuid');
const { TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { getUserFromEvent } = require('../../../libs/middlewares/auth');
const { createOrderSchema } = require('../../../models/order.model');

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const data = createOrderSchema.parse(body);
  const user = getUserFromEvent(event);

  const now = new Date().toISOString();
  const orderId = uuidv4();
  const total = data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  // "Coordinación de stock" (responsabilidad de ms-pedidos360-orders):
  // se descuenta el stock de cada producto de forma atómica en la misma
  // transacción en que se crea el pedido. Si el stock no alcanza para
  // algún ítem, TODA la operación se cancela (no queda nada a medias).
  const transactItems = [
    ...data.items.map((item) => ({
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
        Item: {
          id: orderId,
          customerId: data.customerId,
          items: data.items,
          total,
          status: 'PENDING',
          createdBy: user?.email || 'unknown',
          createdAt: now,
          updatedAt: now,
        },
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

  return success({ id: orderId, status: 'PENDING', total }, 201);
};

module.exports = { handler: withErrorHandler(handler) };

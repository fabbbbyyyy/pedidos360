const { GetCommand, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { ORDER_TRANSITIONS, updateOrderStatusSchema } = require('../../../models/order.model');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;
  const body = JSON.parse(event.body || '{}');
  const { status, expectedVersion } = updateOrderStatusSchema.parse(body);
  const user = event.user;
  const key = { pk: `ORDER#${id}`, sk: `ORDER#${id}` };
  const currentResult = await dynamoDb.send(new GetCommand({ TableName: ORDERS_TABLE, Key: key }));
  const current = currentResult.Item;

  if (!current) return error('Pedido no encontrado', 404);
  if (user.roles.includes('cliente') && current.customerId !== (user.oid || user.email)) {
    return error('No tienes permiso para modificar este pedido', 403);
  }
  if (!(ORDER_TRANSITIONS[current.status] || []).includes(status)) {
    return error(`Transición inválida: ${current.status} -> ${status}`, 409);
  }
  if (expectedVersion !== undefined && expectedVersion !== current.version) {
    return error('La versión del pedido está desactualizada', 409);
  }

  const version = current.version || 1;
  const updatedAt = new Date().toISOString();
  const transactItems = [{
    Update: {
      TableName: ORDERS_TABLE,
      Key: key,
      ConditionExpression: '#status = :currentStatus AND version = :version',
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, version = :nextVersion',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':currentStatus': current.status,
        ':status': status,
        ':updatedAt': updatedAt,
        ':version': version,
        ':nextVersion': version + 1,
      },
    },
  }];

  if (status === 'CANCELLED') {
    transactItems.push(...(current.items || []).map((item) => ({
      Update: {
        TableName: process.env.CATALOG_TABLE,
        Key: { id: item.productId },
        UpdateExpression: 'SET stock = stock + :qty',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeValues: { ':qty': item.quantity },
      },
    })));
  }

  try {
    await dynamoDb.send(new TransactWriteCommand({ TransactItems: transactItems }));
    return success({ ...current, status, updatedAt, version: version + 1 });
  } catch (err) {
    if (err.name === 'TransactionCanceledException') {
      return error('El pedido cambió antes de actualizarse; vuelve a intentarlo', 409);
    }
    throw err;
  }
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.updateStatus)(handler)),};

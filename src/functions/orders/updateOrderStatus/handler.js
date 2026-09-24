const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { ORDER_TRANSITIONS, updateOrderStatusSchema } = require('../../../models/order.model');
const { changeOrderStatus } = require('../services/changeOrderStatus');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const { authorizeOrderAccess } = require('../../../libs/middlewares/auth');
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
  if (!authorizeOrderAccess(user, current)) {
    return error('No tienes permiso para modificar este pedido', 403);
  }
  if (!(ORDER_TRANSITIONS[current.status] || []).includes(status)) {
    return error(`Transición inválida: ${current.status} -> ${status}`, 409);
  }
  if (expectedVersion !== undefined && expectedVersion !== current.version) {
    return error('La versión del pedido está desactualizada', 409);
  }

  return success(await changeOrderStatus({
    order: current,
    status,
    expectedVersion: expectedVersion ?? (current.version || 1),
    user,
  }));
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.updateStatus)(handler)),};

const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');
const { changeOrderStatus } = require('../services/changeOrderStatus');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;

  const result = await dynamoDb.send(new GetCommand({
    TableName: ORDERS_TABLE,
    Key: { pk: `ORDER#${id}`, sk: `ORDER#${id}` },
  }));
  if (!result.Item) return error('Pedido no encontrado', 404);
  const user = event.user;
  if (user.roles.includes('cliente') && result.Item.customerId !== (user.oid || user.email)) {
    return error('No tienes permiso para cancelar este pedido', 403);
  }
  if (result.Item.status !== 'PENDING' && result.Item.status !== 'CONFIRMED') {
    return error('Solo se pueden cancelar pedidos pendientes o confirmados', 409);
  }

  return success(await changeOrderStatus({
    order: result.Item,
    status: 'CANCELLED',
    expectedVersion: result.Item.version || 1,
  }));
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.delete)(handler)),};

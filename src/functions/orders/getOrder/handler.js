const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const { authorizeOrderAccess } = require('../../../libs/middlewares/auth');
const PERMISSIONS = require('../../../libs/constants/permissions');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;
  const user = event.user;

  const result = await dynamoDb.send(
    new GetCommand({ TableName: ORDERS_TABLE, Key: { pk: `ORDER#${id}`, sk: `ORDER#${id}` } })
  );

  if (!result.Item) return error('Pedido no encontrado', 404);
  if (!authorizeOrderAccess(user, result.Item)) {
    return error('No tienes permiso para acceder a este pedido', 403);
  }
  return success(result.Item);
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.read)(handler)),};

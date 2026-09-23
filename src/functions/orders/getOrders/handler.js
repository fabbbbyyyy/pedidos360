const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const status = event.queryStringParameters?.status;

  const params = { TableName: ORDERS_TABLE };

  // NOTA: se usa Scan por simplicidad en esta primera versión.
  // Si el volumen de pedidos crece, conviene agregar un GSI por
  // "status" y reemplazar esto por una Query.
  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }

  const result = await dynamoDb.send(new ScanCommand(params));
  return success(result.Items || []);
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.read)(handler)),};

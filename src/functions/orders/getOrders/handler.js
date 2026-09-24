const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const status = event.queryStringParameters?.status;
  const limit = Math.min(Number(event.queryStringParameters?.limit) || 20, 100);
  const user = event.user;
  const isClient = user.roles.includes('cliente');
  const params = {
    TableName: ORDERS_TABLE,
    Limit: limit,
    ScanIndexForward: false,
  };

  if (isClient) {
    params.IndexName = 'GSI1';
    params.KeyConditionExpression = 'gsi1pk = :customerId';
    params.ExpressionAttributeValues = { ':customerId': `CUSTOMER#${user.oid || user.email}` };
  } else {
    params.IndexName = 'GSI2';
    params.KeyConditionExpression = 'gsi2pk = :orders';
    params.ExpressionAttributeValues = { ':orders': 'ORDERS' };
  }

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }

  if (event.queryStringParameters?.nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(event.queryStringParameters.nextToken, 'base64url').toString());
  }

  const result = await dynamoDb.send(new QueryCommand(params));
  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
    : null;
  return success({ items: result.Items || [], nextToken });
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.read)(handler)),};

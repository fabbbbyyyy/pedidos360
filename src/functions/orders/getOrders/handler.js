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
    params.ExpressionAttributeValues = { ':customerId': `CUSTOMER#${user.customerId}` };
  } else {
    params.IndexName = 'GSI3';
    params.KeyConditionExpression = 'gsi3pk = :tenantId';
    params.ExpressionAttributeValues = { ':tenantId': `TENANT#${user.tenantId}` };
  }

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }

  if (event.queryStringParameters?.nextToken || event.queryStringParameters?.cursor) {
    const cursorToken = event.queryStringParameters.nextToken || event.queryStringParameters.cursor;
    params.ExclusiveStartKey = JSON.parse(Buffer.from(cursorToken, 'base64url').toString());
  }

  const result = await dynamoDb.send(new QueryCommand(params));
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
    : null;
  return success({ items: result.Items || [], nextCursor, nextToken: nextCursor });
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.read)(handler)),};

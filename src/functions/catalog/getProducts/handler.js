const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const category = event.queryStringParameters?.category;

  const params = { TableName: CATALOG_TABLE };

  if (category) {
    params.FilterExpression = 'category = :category';
    params.ExpressionAttributeValues = { ':category': category };
  }

  const result = await dynamoDb.send(new ScanCommand(params));
  return success(result.Items || []);
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.catalog.read)(handler)),};

const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;

  try {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: CATALOG_TABLE,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
      })
    );
    return success({ id });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return error('Producto no encontrado', 404);
    }
    throw err;
  }
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.catalog.delete)(handler)),};

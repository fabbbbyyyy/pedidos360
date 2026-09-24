const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');
const { getImageUrl } = require('../../../libs/db/s3Client');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;

  const result = await dynamoDb.send(
    new GetCommand({ TableName: CATALOG_TABLE, Key: { id } })
  );

  if (!result.Item) return error('Producto no encontrado', 404);
  return success({
    ...result.Item,
    imageUrl: await getImageUrl(result.Item.imageKey),
  });
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.catalog.read)(handler)),};

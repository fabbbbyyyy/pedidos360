const { DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');
const { s3, IMAGES_BUCKET } = require('../../../libs/db/s3Client');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;

  try {
    const currentProduct = await dynamoDb.send(
      new GetCommand({ TableName: CATALOG_TABLE, Key: { id } })
    );
    if (!currentProduct.Item) return error('Producto no encontrado', 404);

    await dynamoDb.send(
      new DeleteCommand({
        TableName: CATALOG_TABLE,
        Key: { id },
      })
    );
    if (currentProduct.Item.imageKey) {
      await s3.send(new DeleteObjectCommand({
        Bucket: IMAGES_BUCKET,
        Key: currentProduct.Item.imageKey,
      }));
    }
    return success({ id });
  } catch (err) {
    throw err;
  }
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.catalog.delete)(handler)),};

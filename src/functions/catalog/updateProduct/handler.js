const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { updateProductSchema, productImageSchema } = require('../../../models/product.model');
const { s3, IMAGES_BUCKET } = require('../../../libs/db/s3Client');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;
  const body = JSON.parse(event.body || '{}');
  const { imageKey, ...productFields } = body;
  const data = updateProductSchema.parse(productFields);
  const hasImageChange = Object.prototype.hasOwnProperty.call(body, 'imageKey');

  if (hasImageChange) {
    productImageSchema.parse({ imageKey });
    if (imageKey && !imageKey.startsWith(`products/${id}/`)) {
      return error('La imagen no pertenece al producto', 400);
    }
  }
  if (hasImageChange && imageKey) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: IMAGES_BUCKET, Key: imageKey }));
    } catch (err) {
      if (err.name === 'NotFound' || err.name === 'NoSuchKey') {
        return error('La imagen no existe en S3', 400);
      }
      throw err;
    }
  }

  const fields = Object.keys(data);
  if (fields.length === 0 && !hasImageChange) return error('No hay campos para actualizar', 400);

  const currentProduct = await dynamoDb.send(
    new GetCommand({ TableName: CATALOG_TABLE, Key: { id } })
  );
  if (!currentProduct.Item) return error('Producto no encontrado', 404);

  const updateFields = [...fields, ...(hasImageChange ? ['imageKey'] : [])];
  const updateExpression =
    'SET ' + updateFields.map((f, i) => `#f${i} = :v${i}`).join(', ') + ', updatedAt = :updatedAt';
  const expressionAttributeNames = updateFields.reduce(
    (acc, f, i) => ({ ...acc, [`#f${i}`]: f }),
    {}
  );
  const expressionAttributeValues = fields.reduce(
    (acc, f, i) => ({ ...acc, [`:v${i}`]: data[f] }),
    { ':updatedAt': new Date().toISOString() }
  );
  if (hasImageChange) expressionAttributeValues[':v' + fields.length] = imageKey;

  try {
    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: CATALOG_TABLE,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );
    if (hasImageChange && currentProduct.Item.imageKey && currentProduct.Item.imageKey !== imageKey) {
      await s3.send(new DeleteObjectCommand({
        Bucket: IMAGES_BUCKET,
        Key: currentProduct.Item.imageKey,
      }));
    }
    return success(result.Attributes);
  } catch (err) {
    throw err;
  }
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.catalog.update)(handler)),};

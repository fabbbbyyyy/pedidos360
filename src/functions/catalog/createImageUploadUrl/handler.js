const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { IMAGES_BUCKET } = require('../../../libs/db/s3Client');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');
const { s3 } = require('../../../libs/db/s3Client');

const CATALOG_TABLE = process.env.CATALOG_TABLE;
const UPLOAD_URL_EXPIRATION_SECONDS = 300;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(120),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  fileSize: z.number().int().positive().max(MAX_IMAGE_SIZE_BYTES),
});

const sanitizeFileName = (fileName) =>
  fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

const handler = async (event) => {
  const { id } = event.pathParameters;
  const body = uploadRequestSchema.parse(JSON.parse(event.body || '{}'));

  const product = await dynamoDb.send(
    new GetCommand({ TableName: CATALOG_TABLE, Key: { id } })
  );
  if (!product.Item) return error('Producto no encontrado', 404);

  const imageKey = `products/${id}/${uuidv4()}-${sanitizeFileName(body.fileName)}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: IMAGES_BUCKET,
      Key: imageKey,
      ContentType: body.contentType,
    }),
    { expiresIn: UPLOAD_URL_EXPIRATION_SECONDS }
  );

  return success({
    uploadUrl,
    imageKey,
    expiresIn: UPLOAD_URL_EXPIRATION_SECONDS,
    maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
  });
};

module.exports = {
  handler: withErrorHandler(
    requireRoles(...PERMISSIONS.catalog.update)(handler)
  ),
};

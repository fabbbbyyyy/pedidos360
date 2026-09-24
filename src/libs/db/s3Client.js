const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const IMAGES_BUCKET = process.env.S3_BUCKET;
const IMAGE_URL_EXPIRATION_SECONDS = 900;

const getImageUrl = async (imageKey) => {
  if (!imageKey) return null;

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: IMAGES_BUCKET, Key: imageKey }),
    { expiresIn: IMAGE_URL_EXPIRATION_SECONDS }
  );
};

module.exports = {
  s3,
  IMAGES_BUCKET,
  IMAGE_URL_EXPIRATION_SECONDS,
  getImageUrl,
};

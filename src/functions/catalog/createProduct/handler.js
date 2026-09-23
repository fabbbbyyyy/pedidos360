const { v4: uuidv4 } = require('uuid');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { createProductSchema } = require('../../../models/product.model');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const data = createProductSchema.parse(body);

  const now = new Date().toISOString();
  const item = { id: uuidv4(), ...data, createdAt: now, updatedAt: now };

  await dynamoDb.send(new PutCommand({ TableName: CATALOG_TABLE, Item: item }));
  return success(item, 201);
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.catalog.create)(handler)),};

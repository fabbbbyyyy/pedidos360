const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { updateProductSchema } = require('../../../models/product.model');

const CATALOG_TABLE = process.env.CATALOG_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;
  const body = JSON.parse(event.body || '{}');
  const data = updateProductSchema.parse(body);

  const fields = Object.keys(data);
  if (fields.length === 0) return error('No hay campos para actualizar', 400);

  const updateExpression =
    'SET ' + fields.map((f, i) => `#f${i} = :v${i}`).join(', ') + ', updatedAt = :updatedAt';
  const expressionAttributeNames = fields.reduce(
    (acc, f, i) => ({ ...acc, [`#f${i}`]: f }),
    {}
  );
  const expressionAttributeValues = fields.reduce(
    (acc, f, i) => ({ ...acc, [`:v${i}`]: data[f] }),
    { ':updatedAt': new Date().toISOString() }
  );

  try {
    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: CATALOG_TABLE,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );
    return success(result.Attributes);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return error('Producto no encontrado', 404);
    }
    throw err;
  }
};

module.exports = { handler: withErrorHandler(handler) };

const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;

  try {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: ORDERS_TABLE,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
      })
    );
    return success({ id });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return error('Pedido no encontrado', 404);
    }
    throw err;
  }
};

module.exports = { handler: withErrorHandler(handler) };

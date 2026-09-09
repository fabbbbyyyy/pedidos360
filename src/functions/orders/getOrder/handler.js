const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;

  const result = await dynamoDb.send(
    new GetCommand({ TableName: ORDERS_TABLE, Key: { id } })
  );

  if (!result.Item) return error('Pedido no encontrado', 404);
  return success(result.Item);
};

module.exports = { handler: withErrorHandler(handler) };

const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../../../libs/db/dynamoClient');
const { success, error } = require('../../../libs/utils/response');
const { withErrorHandler } = require('../../../libs/middlewares/errorHandler');
const { updateOrderStatusSchema } = require('../../../models/order.model');
const { requireRoles } = require('../../../libs/middlewares/requireRoles');
const PERMISSIONS = require('../../../libs/constants/permissions');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const handler = async (event) => {
  const { id } = event.pathParameters;
  const body = JSON.parse(event.body || '{}');
  const { status } = updateOrderStatusSchema.parse(body);

  try {
    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return success(result.Attributes);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return error('Pedido no encontrado', 404);
    }
    throw err;
  }
};

module.exports = {handler: withErrorHandler(requireRoles(...PERMISSIONS.orders.updateStatus)(handler)),};

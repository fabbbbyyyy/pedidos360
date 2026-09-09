const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// NOTA: NO seteamos "region" desde una variable de entorno propia.
// AWS_REGION es una variable reservada que Lambda inyecta automáticamente
// en tiempo de ejecución (no se puede sobreescribir vía "environment:"
// en serverless.yml). El SDK la toma sola.
const client = new DynamoDBClient({});

const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

module.exports = { dynamoDb };

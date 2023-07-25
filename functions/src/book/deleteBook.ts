import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventV2WithJWTAuthorizer, Context } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const client = new DynamoDBClient({});
const dbClient = DynamoDBDocumentClient.from(client);

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context
) {
  // Check id
  const id = 'id' in event.pathParameters! ? event.pathParameters.id : null;

  try {
    // check auth
    const authPayload = await jwtVerifier.verify(event.headers.authorization!);
    console.info('you are logged in as:', authPayload['cognito:username']);

    // Delete data if id in request parameter exist
    if (id) await deleteData(authPayload['cognito:username'], id);

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'success' }),
    };
    return response;
  } catch (err) {
    console.error(err);
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: 'readingID not found. Failed to delete data',
      }),
    };
  }
}

async function deleteData(username: string, readingId: string) {
  const command = new DeleteCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      userID: username,
      readingID: readingId,
    },
    ConditionExpression: '(readingID = :rid) and (userID = :uid)',
    ExpressionAttributeValues: {
      ':uid': username,
      ':rid': readingId,
    },
    ReturnValues: 'ALL_OLD',
  });

  const response = await dbClient.send(command);
  return response;
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventV2WithJWTAuthorizer, Context } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { UserReadingList } from '../types/Book';

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
  try {
    const payload = await jwtVerifier.verify(event.headers.authorization!);
    console.info('you are logged in as:', payload['cognito:username']);
    const data = await listBook(payload['cognito:username']);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ data: data }),
    };

    return response;
  } catch (err) {
    console.error('Access forbidden:', err);
    return {
      isAuthorized: false,
    };
  }
}

async function listBook(username: string): Promise<UserReadingList[]> {
  const command = new ScanCommand({
    TableName: process.env.TABLE_NAME,
  });

  let dbRecords = [];
  const response = await dbClient.send(command);
  for (const book of <UserReadingList[]>response.Items!) {
    if (book.userID === username) {
      dbRecords.push(book);
    }
  }
  return dbRecords;
}

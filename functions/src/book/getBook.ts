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
  let body;
  let statusCode = 200;
  // Check id
  const id = 'id' in event.pathParameters! ? event.pathParameters.id : null;

  try {
    let detailBook: UserReadingList[];
    const payload = await jwtVerifier.verify(event.headers.authorization!);
    console.info('you are logged in as:', payload['cognito:username']);

    if (id) detailBook = await getBook(payload['cognito:username'], id);

    if (detailBook!.length === 0) {
      statusCode = 404;
      body = JSON.stringify({ message: 'Not found.' });
    } else {
      body = JSON.stringify({ data: detailBook! });
    }

    const response = {
      statusCode,
      body,
    };
    return response;
  } catch (err) {
    console.error(err);
  }
}

async function getBook(
  username: string,
  readingId: string
): Promise<UserReadingList[]> {
  const command = new ScanCommand({
    TableName: process.env.TABLE_NAME,
    FilterExpression: 'userID = :uid and readingID = :rid',
    ExpressionAttributeValues: {
      ':uid': username,
      ':rid': readingId,
    },
  });

  const response = await dbClient.send(command);

  const bookList = <UserReadingList[]>response.Items;
  return bookList;
}

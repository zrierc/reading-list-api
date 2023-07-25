import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventV2WithJWTAuthorizer, Context } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { v4 as uuidv4 } from 'uuid';
import { UserReadingList } from '../types/Book';

const client = new DynamoDBClient({});
const dbClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  context: Context
) {
  // Load data
  const apiPayload = <UserReadingList | UserReadingList[]>(
    JSON.parse(event.body!)
  );

  try {
    // check auth
    const authPayload = await jwtVerifier.verify(event.headers.authorization!);
    console.info('you are logged in as:', authPayload['cognito:username']);

    // Send data
    readingListParser(authPayload['cognito:username'], apiPayload).forEach(
      async book => await saveToDb(book)
    );

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'success' }),
    };
    return response;
  } catch (err) {
    console.error(err);
  }
}

async function saveToDb(book: UserReadingList) {
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      readingID: book.readingID,
      userID: book.userID,
    },
    UpdateExpression:
      'SET bookTitle = :bt, bookAuthor = :ba, lastPageRead = :lpr, readingStatus = :rs, dateAdded = if_not_exists(dateAdded, :da), lastUpdated = :lu, dateFinished = :df',
    ExpressionAttributeValues: {
      ':bt': book.bookTitle,
      ':ba': book.bookAuthor,
      ':lpr': book.lastPageRead,
      ':rs': book.readingStatus,
      ':da': book.dateAdded,
      ':lu': book.lastUpdated,
      ':df': book.dateFinished,
    },
    ReturnValues: 'ALL_NEW',
  });

  const response = await dbClient.send(command);
  return response;
}

function readingListParser(
  username: string,
  readingList: UserReadingList | UserReadingList[]
): UserReadingList[] {
  const payload = Array.isArray(readingList) ? readingList : [readingList];
  const now = Date.now();
  const addMissingFields = (book: UserReadingList) => {
    if (!book.userID) book.userID = username;
    if (!book.readingID) book.readingID = String(uuidv4());
    if (!book.dateAdded) book.dateAdded = now;
    if (!book.readingStatus) book.readingStatus = 'added';
    if (!book.dateFinished) book.dateFinished = null;
    if (!book.lastPageRead) book.lastPageRead = null;
    if (book.readingStatus === 'finished') book.dateFinished = now;
    book.lastUpdated = now;
  };

  payload.forEach(addMissingFields);
  return payload;
}

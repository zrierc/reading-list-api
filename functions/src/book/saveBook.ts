import {
  BatchWriteItemCommand,
  DynamoDBClient,
  PutRequest,
  WriteRequest,
} from '@aws-sdk/client-dynamodb';
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

    // manipulate payload
    const books = readingListParser(
      authPayload['cognito:username'],
      apiPayload
    );
    const newBooks: WriteRequest[] = books.map(book => {
      return {
        PutRequest: {
          Item: {
            readingID: { S: book.readingID },
            userID: { S: book.userID },
            bookTitle: { S: book.bookTitle },
            bookAuthor: { S: book.bookAuthor },
            lastUpdated: { N: String(book.lastUpdated) },
            readingStatus: { S: book.readingStatus! },
            dateAdded: book.dateAdded
              ? { N: String(book.dateAdded) }
              : { NULL: true },
            lastPageRead: book.lastPageRead
              ? { S: book.lastPageRead }
              : { NULL: true },
            dateFinished: book.dateFinished
              ? { N: String(book.dateFinished) }
              : { NULL: true },
          },
        },
      };
    });

    // Send data
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [process.env.TABLE_NAME!]: newBooks,
      },
    });
    const sendData = await client.send(command);

    // return response
    const response = {
      statusCode: sendData.$metadata.httpStatusCode,
      body: JSON.stringify({
        message:
          sendData.$metadata.httpStatusCode === 200
            ? 'success'
            : 'failed to add books',
      }),
    };
    return response;
  } catch (err) {
    console.error('You got an error:', err);
    return err;
  }
}

function readingListParser(
  username: string,
  readingList: UserReadingList | UserReadingList[]
): UserReadingList[] {
  const now = Date.now();

  // change to array
  const payload = Array.isArray(readingList) ? readingList : [readingList];

  // Add default value
  const addMissingFields = (book: UserReadingList) => {
    book.readingID = String(uuidv4());
    book.dateAdded = now;
    book.lastUpdated = now;
    book.userID = username;
    book.dateFinished = null;
    book.lastPageRead = null;
    if (!book.readingStatus) book.readingStatus = 'added';
    if (book.readingStatus === 'finished') book.dateFinished = now;
  };
  payload.forEach(addMissingFields);

  return payload;
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

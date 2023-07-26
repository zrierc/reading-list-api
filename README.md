# Reading List API

#### Tables of Contents:

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Setup Environment](#setup-environment)
  - [Lambda](#lambda)
  - [API Gateway](#api-gateway)
  - [Cognito](#cognito)
- [Testing](#🧪-testing)
- [Clean Up Resources](#clean-up-resources)

---

## Overview

Welcome to this mini workshop! Here you will learn to build and deploy Reading List API using RESTful API, AWS Lambda, Amazon API Gateway, Amazon Cognito, and Amazon DynamoDB. Please take a look the architecture below.

<p align="center">
<img src="./architecture.png">
</p>

> The content of this mini workshop may be updated and if you have questions or find issues in this mini workshop, please file them as an Issue.

## Project Structure

```md
reading-list-api/
├─ functions/
├─ .gitignore
├─ architecture.png
├─ LICENSE
├─ README.md
```

- [`functions/`](/functions/) contains lambda function code for the API.
- [`architecture.png`](/architecture.png) is an overview of the resources to be deployed.
- [`README.md`](/README.md) contains guide for this mini workshop.

## Requirements

Before starting this mini workshop, the following runtime/tools must be met and configured properly.

- Active [AWS Account](https://aws.amazon.com/).
- [NodeJS](https://nodejs.org/en) `v16` or latest with [npm](https://www.npmjs.com/) or [yarn](https://classic.yarnpkg.com/lang/en/) installed.
- [AWS CLI version 2](https://aws.amazon.com/cli/).
- API Testing Tools.
  > **Note** </br>
  > This mini workshop will use [`curl`](https://curl.se/) to test the APIs. However, you can use your favorite API testing tools (e.g. Postman/Insomnia/Thunder Client/etc).
- (optional) OS based on Linux.
  > **Note** </br>
  > Build script for package lambda function code and it's dependecies require Linux/Unix shell to operate. If you are using an OS other than Linux and/or your device doesn't support Linux shell commands you can customize [this build script](/functions/build.sh) to make sure it runs properly.

### AWS Resources

Some of the services from AWS that are used in this mini workshop are as follows:

- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [Amazon Cognito](https://aws.amazon.com/cognito/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)

---

## Setup Environment

> **Note** </br>
> If the settings/configurations are not specified in this guide, you can leave them as default or you can specify the values with your own.

### DynamoDB

1. Select AWS region.

2. Create dynamoDB tables with following configuration:

   - Table name: `reading-list-db`
   - Partition key: `readingID` (string)
   - Sort key: `userID` (string)
   - Table class: DynamoDB Standard
   - Capacity mode: On-demand

### Cognito

1. Select AWS region.

2. Create Cognito User pool with following configurations:

   i. Sign-In Experience

   - Provider type: Cognito user pool
   - Cognito user pool sign-in options: `username`, `email`
   - Multi-factor authentication: No MFA

   ii. Sign-Up Experience

   - Enable Self-registration: true
   - Allow Cognito to automatically send messages to verify and confirm: true

   iii. Messaging / Message Delivery

   - Email provider: Send email with Cognito

   iv. App Integration

   - User pool name: `user-auth-reading-list-api`
   - App type: Public client
   - App client name: lambda-jwt-auth
   - Authentication flow: `ALLOW_CUSTOM_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH`
   - (optional) Enable Cognito Hosted UI: true
     > **Note** </br>
     > For Domain section, you can use either Cognito domain or custom domain if you have. If you choose Cognito domain, make sure it unique. For example, you can use your name for your cognito domain (e.g `https://shinji-reading-list-api.auth.ap-southeast-1.amazoncognito.com`).
     - Callback URLs: `http://localhost`
       > This URL is used for testing purposes only. You can change it to your site or your API endpoint afterwards.
     - OpenID Connect scopes: Email, OpenID, Phone, Profile
     - Access token expiration: 1 day(s)
     - ID token expiration: 1 day(s)

3. Attach Lambda trigger to Cognito user pool.

   > 💡 TIP
   >
   > You can setup this after completing [the Lambda section](#lambda).

   - Trigger type: Authentication
   - Authentication: Pre token generation trigger
   - Lambda function: use Lambda [Pre-Token Generation](#3-deploy-pre-token-generation-function).

### Lambda

#### 1. Build Code

- Clone this repository

- Navigate to [`functions/`](/functions/)

  ```bash
  cd functions/
  ```

- Install required dependencies

  ```bash
  yarn
  ```

  or

  ```bash
  npm i
  ```

- Build your lambda functions code and dependencies to zip

  ```bash
  yarn build
  ```

  or

  ```bash
  npm run build
  ```

#### 2. Select AWS Region

#### 3. Create IAM Role for Lambda

- Role name: `reading-list-fn-role`
- Trusted entitiy Type: AWS service
- Use cases: Lambda
- Permission policies:
  - `AWSLambdaBasicExecutionRole` (AWS Managed)
  - `AmazonDynamoDBFullAccess` (AWS Managed)

#### 4. Deploy Pre-Token Generation Function

i. Create Lambda function with following configurations:

- Function name: `preTokenGenerationFn`
- Runtime: Node.js 16.x
- Handler: `cognito-auth/preTokenGeneration.handler`
- Timeout: 60s

ii. Publish [functions code](#1-build-code) that you already build before.

- Navigate to [`functions/`](/functions/) directory

  ```bash
  cd functions/
  ```

- Publish code via [AWS CLI](https://aws.amazon.com/cli/)

  ```bash
  aws lambda update-function-code \
    --function-name preTokenGenerationFn \
    --zip-file fileb://functions.zip
  ```

#### 5. Deploy List Book Function

i. Create Lambda function with following configurations:

- Function name: `listBookFn`
- Runtime: Node.js 16.x
- Handler: `book/listBook.handler`
- Execution role: select [`reading-list-fn-role`](#3-create-iam-role-for-lambda) that you already created before.
- Timeout: 60s
- Environment variables:
  - `TABLE_NAME`: dynamoDB table name (`reading-list-db`).
  - `COGNITO_USER_POOL_ID`: Id of Amazon Cognito user pool that you already created before.
  - `COGNITO_CLIENT_ID`: Id of user pool app client that you already created before.

ii. Publish [functions code](#1-build-code) that you already build before.

- Navigate to [`functions/`](/functions/) directory

  ```bash
  cd functions/
  ```

- Publish code via [AWS CLI](https://aws.amazon.com/cli/)

  ```bash
  aws lambda update-function-code \
    --function-name listBookFn \
    --zip-file fileb://functions.zip
  ```

#### 6. Deploy Get Detail Book Function

i. Create Lambda function with following configurations:

- Function name: `getBookFn`
- Runtime: Node.js 16.x
- Handler: `book/getBook.handler`
- Execution role: select [`reading-list-fn-role`](#3-create-iam-role-for-lambda) that you already created before.
- Timeout: 60s
- Environment variables:
  - `TABLE_NAME`: dynamoDB table name (`reading-list-db`).
  - `COGNITO_USER_POOL_ID`: Id of Amazon Cognito user pool that you already created before.
  - `COGNITO_CLIENT_ID`: Id of user pool app client that you already created before.

ii. Publish [functions code](#1-build-code) that you already build before.

- Navigate to [`functions/`](/functions/) directory

  ```bash
  cd functions/
  ```

- Publish code via [AWS CLI](https://aws.amazon.com/cli/)

  ```bash
  aws lambda update-function-code \
    --function-name getBookFn \
    --zip-file fileb://functions.zip
  ```

#### 7. Deploy Add New Book Function

i. Create Lambda function with following configurations:

- Function name: `saveBookFn`
- Runtime: Node.js 16.x
- Handler: `book/saveBook.handler`
- Execution role: select [`reading-list-fn-role`](#3-create-iam-role-for-lambda) that you already created before.
- Timeout: 60s
- Environment variables:
  - `TABLE_NAME`: dynamoDB table name (`reading-list-db`).
  - `COGNITO_USER_POOL_ID`: Id of Amazon Cognito user pool that you already created before.
  - `COGNITO_CLIENT_ID`: Id of user pool app client that you already created before.

ii. Publish [functions code](#1-build-code) that you already build before.

- Navigate to [`functions/`](/functions/) directory

  ```bash
  cd functions/
  ```

- Publish code via [AWS CLI](https://aws.amazon.com/cli/)

  ```bash
  aws lambda update-function-code \
    --function-name saveBookFn \
    --zip-file fileb://functions.zip
  ```

#### 8. Deploy Delete Book Function

i. Create Lambda function with following configurations:

- Function name: `deleteBookFn`
- Runtime: Node.js 16.x
- Handler: `book/deleteBook.handler`
- Execution role: select [`reading-list-fn-role`](#3-create-iam-role-for-lambda) that you already created before.
- Timeout: 60s
- Environment variables:
  - `TABLE_NAME`: dynamoDB table name (`reading-list-db`).
  - `COGNITO_USER_POOL_ID`: Id of Amazon Cognito user pool that you already created before.
  - `COGNITO_CLIENT_ID`: Id of user pool app client that you already created before.

ii. Publish [functions code](#1-build-code) that you already build before.

- Navigate to [`functions/`](/functions/) directory

  ```bash
  cd functions/
  ```

- Publish code via [AWS CLI](https://aws.amazon.com/cli/)

  ```bash
  aws lambda update-function-code \
    --function-name deleteBookFn \
    --zip-file fileb://functions.zip
  ```

### API Gateway

1. Select AWS region.

2. Create Amazon API Gateway with following configurations:

   - API type: HTTP API
   - API name: `reading-list-api`

3. Create routes:

   1. Route for list books

      - method: `GET`
      - path: `/book`

   2. Route for add new books

      - method: `POST`
      - path: `/book`

   3. Route for get detail book

      - method: `GET`
      - path: `/book/{id}`

   4. Route for delete book

      - method: `DELETE`
      - path: `/book/{id}`

4. Attach lambda integrations:

   > **Note** </br>
   > Make sure you enable 'Grant API Gateway permission to invoke your Lambda function' option.

   1. Integration for list books API

      - Route: `GET  /book`
      - Integration type: Lambda function
      - Target: choose [`listBookFn`](#5-deploy-list-book-function)

   2. Integration for add new books API

      - Route: `POST  /book`
      - Integration type: Lambda function
      - Target: choose [`saveBookFn`](#7-deploy-add-new-book-function)

   3. Integration for get detail book API

      - Route: `GET  /book/{id}`
      - Integration type: Lambda function
      - Target: choose [`getBookFn`](#6-deploy-get-detail-book-function)

   4. Integration for delete book API

      - Route: `DELETE  /book`
      - Integration type: Lambda function
      - Target: choose [`deleteBookFn`](#8-deploy-delete-book-function)

5. Add cognito as API authorization:

   1. Create authorizer with following configurations:

      - Authorizer type: JWT
      - Name: `JWTCognitoAuth`
      - Issuer URL: `https://cognito-idp.<aws-region>.amazonaws.com/<your_cognito_userpool_id>`
      - Audience: `<cognito_app_client_id_of_userpool>`

      > 💡 TIP
      >
      > `<your_cognito_userpool_id>` in Issuer URL **should be same** as `COGNITO_USER_POOL_ID` value on Lambda environment variables. While, Audience value **should be same** as `COGNITO_CLIENT_ID` value on Lambda enviroment variables.

   2. Attach authorizer for all routes.

---

## 🧪 Testing

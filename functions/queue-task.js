const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqsClient = new SQSClient();
const middy = require('@middy/core');
const cors = require('@middy/http-cors');

/**
 * 
 * @param {import('aws-lambda').APIGatewayProxyEvent} event 
 * @returns {Promise<import('aws-lambda').APIGatewayProxyResult>}
 */
module.exports.handler = middy(async (event) => {
  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.TASK_QUEUE_URL,
      MessageBody: JSON.stringify({
        userId: event.requestContext.authorizer.claims.sub,
        payload: event.body
      })
    }));

    return {
      statusCode: 202,
    };
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify('Failed to enqueue task')
    };
  }
}).use(cors());
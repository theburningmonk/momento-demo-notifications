const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqsClient = new SQSClient();

/**
 * 
 * @param {import('aws-lambda').APIGatewayProxyEvent} event 
 * @returns {Promise<import('aws-lambda').APIGatewayProxyResult>}
 */
module.exports.handler = async (event) => {
  const payload = JSON.parse(event.body);  

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.TASK_QUEUE_URL,
      MessageBody: JSON.stringify({
        userId: event.requestContext.authorizer.claims.sub,
        payload: payload
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
};

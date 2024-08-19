const { initClient, publish } = require('../lib/momento');
const middy = require('@middy/core');
const ssm = require('@middy/ssm');
const { Logger } = require('@aws-lambda-powertools/logger');
const logger = new Logger({ serviceName: process.env.SERVICE_NAME });

/**
 * 
 * @param {import('aws-lambda').SQSEvent} event 
 * @returns {Promise<import('aws-lambda').SQSBatchResponse>}
 */
module.exports.handler = middy(async (event, context) => {
  await initClient(context.MOMENTO_API_KEY);

  for (const record of event.Records) {
    logger.debug('Processing task', { record });

    await sleep(5000);

    await publish(record.topicName, record.message);
  }
}).use(ssm({
  cache: true,
  cacheExpiry: 5 * 60 * 1000,
  setToContext: true,
  fetchData: {
    MOMENTO_API_KEY: process.env.MOMENTO_API_KEY_PARAM_NAME
  }
}));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
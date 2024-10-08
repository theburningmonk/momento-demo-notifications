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
const handler = async (event, context) => {
  await initClient(context.MOMENTO_API_KEY);

  for (const record of event.Records) {
    const { body } = record;
    const task = JSON.parse(body);
    const payload = JSON.parse(task.payload);
    logger.debug('Processing task', { task });

    await sleep(5000);

    await publish(task.userId, `Finished task: ${payload.data}`);
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.handler = middy(handler)
.use(ssm({
  cache: true,
  cacheExpiry: 5 * 60 * 1000,
  setToContext: true,
  fetchData: {
    MOMENTO_API_KEY: process.env.MOMENTO_API_KEY_PARAM_NAME
  }
}));

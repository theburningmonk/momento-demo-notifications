const { 
  TopicClient, 
  TopicPublishResponse, 
  TopicConfigurations, 
  CredentialProvider
} = require('@gomomento/sdk');

const { Logger } = require('@aws-lambda-powertools/logger');
const logger = new Logger({ serviceName: 'leaderboard-api' });

const { MOMENTO_CACHE_NAME } = global.process.env;

let topicClient;

async function initClient(apiKey) {
  if (!topicClient) {
    logger.info('Initializing Momento topic client');
    
    topicClient = await TopicClient({
      configuration: TopicConfigurations.Lambda.latest(),
      credentialProvider: CredentialProvider.fromString(apiKey)
    });

    logger.info('Initialized Momento topic client');
  }
};

async function publish(topicName, message) {
  const result = await topicClient.publish(MOMENTO_CACHE_NAME, topicName, message);

  if (result.type === TopicPublishResponse.Error) {
    logger.error('Failed to publish message to topic', {
      error: result.innerException(),
      errorMessage: result.message()
    });

    throw result.innerException();
  }
}

module.exports = { 
  initClient,
  publish,
};
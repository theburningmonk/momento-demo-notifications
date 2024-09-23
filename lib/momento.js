const { 
  TopicClient, 
  TopicPublishResponse, 
  TopicConfigurations, 
  CredentialProvider,
  AuthClient,
  DisposableTokenScopes,
  ExpiresIn,
  GenerateDisposableTokenResponse
} = require('@gomomento/sdk');

const { Logger } = require('@aws-lambda-powertools/logger');
const logger = new Logger({ serviceName: 'notification-api' });

const { MOMENTO_CACHE_NAME } = global.process.env;

let topicClient, authClient;

async function initClient(apiKey) {
  if (!topicClient) {
    logger.info('Initializing Momento topic client');
    
    topicClient = new TopicClient({
      configuration: TopicConfigurations.Lambda.latest(),
      credentialProvider: CredentialProvider.fromString(apiKey)
    });

    logger.info('Initialized Momento topic client');
  }
};

async function initAuthClient(apiKey) {
  if (!authClient) {
    logger.info('Initializing Momento auth client');
    
    authClient = new AuthClient({
      credentialProvider: CredentialProvider.fromString(apiKey)
    });

    logger.info('Initialized Momento auth client');
  }
};

async function publish(topicName, value) {
  logger.debug('Publishing message to topic', { 
    cacheName: MOMENTO_CACHE_NAME, 
    topicName,
    value
  });

  const result = await topicClient.publish(MOMENTO_CACHE_NAME, topicName, value);

  if (result.type === TopicPublishResponse.Error) {
    logger.error('Failed to publish message to topic', {
      error: result.innerException(),
      errorMessage: result.message()
    });

    throw result.innerException();
  }
}

async function generateToken(userId) {
  const result = await authClient.generateDisposableToken(
    DisposableTokenScopes.topicSubscribeOnly(MOMENTO_CACHE_NAME, userId),
    ExpiresIn.minutes(30)
  );

  if (result.type === GenerateDisposableTokenResponse.Error) {
    logger.error('Failed to generate disposable token', {
      error: result.innerException(),
      errorMessage: result.message()
    });

    throw result.innerException();
  }

  return {
    endpoint: result.endpoint,
    token: result.authToken,
    cacheName: MOMENTO_CACHE_NAME,
    expiresAt: result.expiresAt
  };
}

module.exports = { 
  initClient,
  initAuthClient,
  publish,
  generateToken,
};
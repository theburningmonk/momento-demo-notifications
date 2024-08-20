const { initAuthClient, generateToken } = require('../lib/momento');
const middy = require('@middy/core');
const cors = require('@middy/http-cors');
const ssm = require('@middy/ssm');

/**
 * @param {import('aws-lambda').APIGatewayProxyEvent} event 
 * @returns {Promise<import('aws-lambda').APIGatewayProxyResult>}
 */
module.exports.handler = middy(async (event, context) => {  
  await initAuthClient(context.MOMENTO_API_KEY);

  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const tokenResult = await generateToken(userId);

    return {
      statusCode: 200,
      body: JSON.stringify(tokenResult)
    }
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify('Failed to generate token')
    };
  }
})
.use(cors())
.use(ssm({
  cache: true,
  cacheExpiry: 5 * 60 * 1000,
  setToContext: true,
  fetchData: {
    MOMENTO_API_KEY: process.env.MOMENTO_API_KEY_PARAM_NAME
  }
}));
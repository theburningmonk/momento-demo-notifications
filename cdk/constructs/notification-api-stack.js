const { Stack, Duration, CfnOutput } = require('aws-cdk-lib');
const { Runtime } = require('aws-cdk-lib/aws-lambda');
const { NodejsFunction } = require('aws-cdk-lib/aws-lambda-nodejs');
const { RestApi, LambdaIntegration, CfnAuthorizer, AuthorizationType } = require('aws-cdk-lib/aws-apigateway');
const iam = require('aws-cdk-lib/aws-iam');
const sqs = require('aws-cdk-lib/aws-sqs');
const { SqsEventSource } = require('aws-cdk-lib/aws-lambda-event-sources');
const { UserPool, UserPoolClient } = require('aws-cdk-lib/aws-cognito');

const MOMENTO_CACHE_NAME = 'notifications';

class NotificationApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new RestApi(this, `${props.stageName}-NotificationApi`, {
      deployOptions: {
        stageName: props.stageName,
        tracingEnabled: true
      }
    });

    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${props.serviceName}-${props.stageName}-UserPool`,
    });

    const webUserPoolClient = new UserPoolClient(this, 'WebUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true
      },
      preventUserExistenceErrors: true
    });

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: webUserPoolClient.userPoolClientId });

    this.momentoApiKeyParamName = `/${props.serviceName}/${props.ssmStageName}/momento-api-key`;
    this.momentoApiKeyParamArn = `arn:aws:ssm:${this.region}:${this.account}:parameter${this.momentoApiKeyParamName}`;

    const taskQueue = this.createTaskQueue(props);
    this.createProcessTaskFunction(props, taskQueue);

    const queueTaskFunction = this.createQueueTaskFunction(props);

    this.createApiEndpoints(api, userPool, {
      queueTask: queueTaskFunction,
    });
  }

  createTaskQueue(props) {
    return new sqs.Queue(this, 'TaskQueue', {
      queueName: `${props.serviceName}-${props.stageName}-tasks`      
    });
  }

  createQueueTaskFunction(props) {
    return this.createFunction(props, 'queue-task.js', 'QueueTaskFunction');
  }

  /**
   * @param {sqs.Queue} queue
   */
  createProcessTaskFunction(props, queue) {
    const func = this.createFunction(props, 'process-task.js', 'ProcessTaskFunction', 10);

    func.addEventSource(new SqsEventSource(queue, {
      reportBatchItemFailures: true
    }));

    return func;
  }

  createFunction(props, filename, logicalId, timeoutSeconds = 3) {
    const func = new NodejsFunction(this, logicalId, {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: `functions/${filename}`,
      memorySize: 1024,
      timeout: Duration.seconds(timeoutSeconds),
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        MOMENTO_API_KEY_PARAM_NAME: this.momentoApiKeyParamName,
        MOMENTO_CACHE_NAME,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG'
      }
    });

    func.role.attachInlinePolicy(new iam.Policy(this, `${logicalId}SsmPolicy`, {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [ 'ssm:GetParameter*' ],
          resources: [ this.momentoApiKeyParamArn ]
        })
      ]
    }));

    return func;
  }

  /**
   * 
   * @param {RestApi} api
   * @param {UserPool} userPool
   */
  createApiEndpoints(api, userPool, functions) {
    const authorizer = new CfnAuthorizer(this, 'CognitoAuthorizer', {
      name: 'CognitoAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
      restApiId: api.restApiId,
    });

    const taskResource = api.root.addResource('task');

    // POST /task
    taskResource.addMethod('POST', new LambdaIntegration(functions.queueTask), {
      authorizer: {
        authorizationType: AuthorizationType.COGNITO,
        authorizerId: authorizer.ref
      }
    });
  }
}

module.exports = { NotificationApiStack }

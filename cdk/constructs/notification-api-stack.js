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

    const userPool = new UserPool(this, 'CognitoUserPool', {
      userPoolName: `${props.serviceName}-${props.stageName}-UserPool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true }
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

    this.taskQueue = this.createTaskQueue(props);

    this.createProcessTaskFunction(props);

    const queueTaskFunction = this.createQueueTaskFunction(props);
    const tokenVendingMachineFunction = this.createTokenVendingMachineFunction(props);

    this.createApiEndpoints(api, userPool, {
      queueTask: queueTaskFunction,
      tokenVendingMachine: tokenVendingMachineFunction
    });
  }

  createTaskQueue(props) {
    return new sqs.Queue(this, 'TaskQueue', {
      queueName: `${props.serviceName}-${props.stageName}-tasks`      
    });
  }

  createQueueTaskFunction(props) {
    const func = new NodejsFunction(this, 'QueueTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/queue-task.js',
      memorySize: 1024,
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG',
        TASK_QUEUE_URL: this.taskQueue.queueUrl
      }
    });

    this.taskQueue.grantSendMessages(func);

    return func;
  }

  createProcessTaskFunction(props) {
    const func = new NodejsFunction(this, 'ProcessTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/process-task.js',
      memorySize: 1024,
      timeout: Duration.seconds(10),
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        MOMENTO_API_KEY_PARAM_NAME: this.momentoApiKeyParamName,
        MOMENTO_CACHE_NAME,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG'
      }
    });

    func.addEventSource(new SqsEventSource(this.taskQueue, {
      reportBatchItemFailures: true
    }));

    func.role.attachInlinePolicy(new iam.Policy(this, 'ProcessTaskFunctionSsmPolicy', {
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

  createTokenVendingMachineFunction(props) {
    const func = new NodejsFunction(this, 'TokenVendingMachineFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/token-vending-machine.js',
      memorySize: 1024,      
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        MOMENTO_API_KEY_PARAM_NAME: this.momentoApiKeyParamName,
        MOMENTO_CACHE_NAME,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG'
      }
    });

    func.role.attachInlinePolicy(new iam.Policy(this, 'TokenVendingMachineFunctionSsmPolicy', {
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

    // POST /task
    const taskResource = api.root.addResource('task');
    taskResource.addMethod('POST', new LambdaIntegration(functions.queueTask), {
      authorizer: {
        authorizationType: AuthorizationType.COGNITO,
        authorizerId: authorizer.ref
      }
    });

    taskResource.addCorsPreflight({
      allowHeaders: ['*'],
      allowMethods: ['OPTIONS', 'POST'],
      allowCredentials: true,
      allowOrigins: ['*']
    });

    // GET /token
    const tokenResource = api.root.addResource('token');
    tokenResource.addMethod('GET', new LambdaIntegration(functions.tokenVendingMachine), {
      authorizer: {
        authorizationType: AuthorizationType.COGNITO,
        authorizerId: authorizer.ref
      }
    });

    tokenResource.addCorsPreflight({
      allowHeaders: ['*'],
      allowMethods: ['OPTIONS', 'POST'],
      allowCredentials: true,
      allowOrigins: ['*']
    });
  }
}

module.exports = { NotificationApiStack }

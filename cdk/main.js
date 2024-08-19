#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { NotificationApiStack } = require('./constructs/notification-api-stack');

const app = new cdk.App();

let stageName = app.node.tryGetContext('stageName');
let ssmStageName = app.node.tryGetContext('ssmStageName');

if (!stageName) {
  console.log('Defaulting stage name to dev');
  stageName = 'dev';
}

if (!ssmStageName) {
  console.log(`Defaulting SSM stage name to "stageName": ${stageName}`);
  ssmStageName = stageName;
}

const serviceName = 'notification-api';

new NotificationApiStack(app, `NotificationApiStack-${stageName}`, {
  serviceName,
  stageName,
  ssmStageName,
});

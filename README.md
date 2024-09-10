# momento-demo-notifications

Demo of using [Momento](https://gomomento.com) topics to build a real-time notification system. The user can kick off a long-running task, and the backend will send real-time updates to the frontend via Websockets, using Momento topics.

## To deploy the backend

1. run `npm ci` to restore project dependencies.

2. run `npx cdk deploy` to deploy the application.
*Note: This uses the version of CDK that's installed as dev dependency in the project, so to avoid any version incompatibility with the version of CDK you have installed on your machine.*

After the deployment finishes, you should see something like this:

```
Outputs:
NotificationApiStack-dev.UserPoolClientId = xxxxxxxxxxxxx
NotificationApiStack-dev.UserPoolId = us-east-1_xxxxxx
NotificationApiStack-dev.devNotificationApiEndpoint96F466DA = https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/
```

Take note of these outputs, we need them for the frontend

3. To run the frontend application, first add a `.env` file in the `frontend` folder and put the CloudFormation output above into it, like this:

```
VUE_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxx
VUE_APP_USER_POOL_ID=us-east-1_xxxxxxx
VUE_APP_API_URL=https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

4. Run `cd frontend`, then `npm ci`, then `npm run serve`. This should compile and run the frontend app on port 8080.

5. Visit `localhost:8080`

## API Routes

`GET /token`: gets a disposable token so the frontend can subscribe to the Momento topic.

`POST /task`: queues a task to be process asynchronously in the background.

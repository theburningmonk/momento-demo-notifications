import { TopicClient, TopicConfigurations, CredentialProvider } from '@gomomento/sdk-web'

async function subscribeToTopic(authToken, cacheName, userId, onMessage) {
  console.log('Initializing Momento topic client', authToken)

  const topicClient = new TopicClient({
    configuration: TopicConfigurations.Browser.latest(),
    credentialProvider: CredentialProvider.fromString({
      authToken
    })
  })

  console.log('Initialized Momento topic client')

  console.log('Subscribing to Momento topic:', cacheName)
  console.log('Topic name:', userId)

  await topicClient.subscribe(cacheName, userId, {
    onItem: (item => onMessage(item.value())),
    onError: (error) => {
      alert(`Error subscribing to Momento topic: ${error.message}`)
    }
  })
}

export {
  subscribeToTopic
}
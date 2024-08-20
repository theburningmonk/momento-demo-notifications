import { TopicClient, TopicConfigurations, CredentialProvider } from '@gomomento/sdk-web'

let subscription

async function subscribeToTopic(authToken, cacheName, userId, onMessage) {
  if (subscription) {
    return
  }

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

  const resp = await topicClient.subscribe(cacheName, userId, {
    onItem: (item => onMessage(item.value())),
    onError: (error) => {
      alert(`Error subscribing to Momento topic: ${error.message}`)
    }
  })

  if (resp.isSubscribed) {
    subscription = {
      close: () => resp.unsubscribe()
    }
  }
}

export {
  subscribeToTopic
}
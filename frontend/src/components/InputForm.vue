<template>
  <div class="input-form" style="margin-top: 10px">
    <input v-model="inputValue" size="100" placeholder="Queue a message to be relayed with delay" />
    <button @click="submitData">Submit</button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Auth } from 'aws-amplify'
import { apiConfig } from '@/aws-exports'
import { subscribeToTopic } from '@/lib/momento'
import { createToaster } from "@meforma/vue-toaster"

export default {
  name: 'InputForm',
  setup() {
    const inputValue = ref('')

    onMounted(async () => {
      try {
        const user = await Auth.currentUserPoolUser()
        console.log('User attributes:', user)

        const session = await Auth.currentSession()
        const jwtToken = session.getIdToken().getJwtToken()

        const getTokenResp = await axios.get(apiConfig.apiUrl + '/token', {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        })

        const { token, cacheName } = getTokenResp.data
        
        await subscribeToTopic(token, cacheName, user.username, (message) => {
          const toaster = createToaster()
          toaster.show(message, { type: 'success' })
        })
      } catch (error) {
        console.error('Error subscribing to Momento topic:', error)
      }
    })

    const submitData = async () => {
      try {
        const session = await Auth.currentSession()
        const token = session.getIdToken().getJwtToken()

        const response = await axios.post(apiConfig.apiUrl + '/task', {
          data: inputValue.value
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        console.log('Response:', response.data)
        inputValue.value = ''
      } catch (error) {
        console.error('Error submitting data:', error)
      }
    }

    return {
      inputValue,
      submitData
    }
  }
}
</script>

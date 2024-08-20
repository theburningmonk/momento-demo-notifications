<template>
  <div id="app" style="font-size: 18px; display: flex; justify-content: center; align-items: center;">
    <authenticator v-if="!user">
      <template v-slot="{ signOut }">
        <div>
          <button style="margin-top: 50px" @click="signOut">Sign Out</button>
          <input-form />
        </div>
      </template>
    </authenticator>
    <div v-else>
      <button style="margin-top: 50px" @click="signOut">Sign Out</button>
      <input-form />
    </div>
  </div>
</template>

<script>
import { Authenticator } from "@aws-amplify/ui-vue"
import "@aws-amplify/ui-vue/styles.css"

import { Auth } from 'aws-amplify'
import { ref, onMounted } from 'vue'
import InputForm from '@/components/InputForm.vue'

export default {
  name: 'App',
  components: {
    Authenticator,
    InputForm
  },
  setup() {
    const user = ref(null)

    onMounted(async () => {
      try {
        console.log('Fetching user attributes...')
        user.value = await Auth.currentUserInfo()
        console.log('User attributes:', user.value)
      } catch (error) {
        console.error('Error getting current user:', error)
      }
    })

    const signOut = async () => {
      try {
        await Auth.signOut()
        user.value = null
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }

    return {
      user,
      signOut
    }
  }
}
</script>
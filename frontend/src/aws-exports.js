const amplifyConfig = {
  // Replace with your own Cognito configuration
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_iZkGAhcIw',
    userPoolWebClientId: '1u7c0elmc6v3qrr68s4vpo63sm',    
    signUpVerificationMethod: "code"    
  }
}

const apiConfig = {
  // Replace with your own API Gateway URL
  apiUrl: 'https://dyo8qbeazb.execute-api.us-east-1.amazonaws.com/dev'
}

export {
  amplifyConfig,
  apiConfig
}

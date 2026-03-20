import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id:                 string
      name?:              string | null
      email?:             string | null
      image?:             string | null
      disclaimerAccepted: boolean
      unitHeight:         string
      unitVelocity:       string
    }
  }
  interface User {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:                 string
    disclaimerAccepted: boolean
    unitHeight:         string
    unitVelocity:       string
  }
}
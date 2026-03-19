import NextAuth, { type NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/onboarding',
    error: '/auth/error',
  },
  providers: [
    // Email + password
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),

    // OAuth providers — only registered if env vars are present
    ...(process.env.GITHUB_ID ? [
      GitHubProvider({
        clientId:     process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
      }),
    ] : []),

    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId:     process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ] : []),
  ],

 callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) token.id = user.id
    // Refresh disclaimerAccepted from DB on every token update
    // and on explicit session refresh trigger
    if (token.id && (trigger === 'update' || !token.disclaimerAccepted)) {
      const dbUser = await prisma.user.findUnique({
        where:  { id: token.id as string },
        select: { disclaimerAccepted: true, unitHeight: true, unitVelocity: true },
      })
      if (dbUser) {
        token.disclaimerAccepted = dbUser.disclaimerAccepted
        token.unitHeight         = dbUser.unitHeight
        token.unitVelocity       = dbUser.unitVelocity
      }
    }
    return token
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id                 = token.id as string
      session.user.disclaimerAccepted = token.disclaimerAccepted as boolean ?? false
      session.user.unitHeight         = token.unitHeight as string ?? 'ft'
      session.user.unitVelocity       = token.unitVelocity as string ?? 'kt'
    }
    return session
  },
  async redirect({ url, baseUrl }) {
    if (url.startsWith('/')) return `${baseUrl}${url}`
    if (url.startsWith(baseUrl)) return url
    return baseUrl
  },
},

export default NextAuth(authOptions)

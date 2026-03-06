import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import WeChat from "next-auth/providers/wechat";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma, hasDatabase } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const skipAuth = process.env.SKIP_AUTH === "1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: hasDatabase ? PrismaAdapter(prisma!) : undefined,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (skipAuth || !hasDatabase) {
          return { id: "demo", email: "demo@qualiprobe.dev", name: "Demo User" };
        }
        const user = await prisma!.user.findUnique({
          where: { email: String(credentials.email) },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
        };
      },
    }),
    ...(process.env.AUTH_WECHAT_APP_ID && process.env.AUTH_WECHAT_APP_SECRET
      ? [
          WeChat({
            clientId: process.env.AUTH_WECHAT_APP_ID,
            clientSecret: process.env.AUTH_WECHAT_APP_SECRET,
            platformType: "WebsiteApp",
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const email = (token.email as string | null) ?? undefined;
        if (email !== undefined) session.user.email = email;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "wechat") return true;
      if (account?.provider === "credentials") return true;
      return true;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const parent = await prisma.parent.findUnique({
          where: { username: credentials.username as string },
          include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
        });

        if (!parent) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          parent.passwordHash
        );

        if (!isValid) return null;

        return {
          id: parent.id,
          name: parent.username,
          currentChildId: parent.children[0]?.id || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.name;
        token.currentChildId = (user as any).currentChildId;
      }
      if (trigger === "update" && session?.currentChildId) {
        token.currentChildId = session.currentChildId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        name: token.username as string,
      };
      (session as any).currentChildId = token.currentChildId;
      return session;
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
});
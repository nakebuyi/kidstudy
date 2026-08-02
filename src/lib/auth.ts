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

        const username = credentials.username as string;
        const password = credentials.password as string;

        // 1. Try Parent
        const parent = await prisma.parent.findUnique({
          where: { username },
          include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
        });

        if (parent) {
          const isValid = await bcrypt.compare(password, parent.passwordHash);
          if (!isValid) return null;
          return {
            id: parent.id,
            name: parent.username,
            role: "parent" as const,
            nickname: parent.nickname || parent.username,
            currentChildId: parent.children[0]?.id || null,
          };
        }

        // 2. Try ChildAccount
        const childAccount = await prisma.childAccount.findUnique({
          where: { username },
          include: { child: true },
        });

        if (childAccount) {
          const isValid = await bcrypt.compare(password, childAccount.passwordHash);
          if (!isValid) return null;
          return {
            id: childAccount.id,
            name: childAccount.child.name,
            role: "child" as const,
            nickname: childAccount.nickname,
            childId: childAccount.childId,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.name;
        token.role = (user as any).role;           // NEW
        token.nickname = (user as any).nickname;   // NEW
        if ((user as any).role === "child") {
          token.currentChildId = (user as any).childId;  // child's own child record
        } else {
          token.currentChildId = (user as any).currentChildId;  // parent's selected child
        }
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
      (session as any).role = token.role;                // NEW
      (session as any).nickname = token.nickname;         // NEW
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
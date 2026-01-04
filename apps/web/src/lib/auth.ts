import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Warn if NEXTAUTH_SECRET is missing in production
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
  console.error("❌ NEXTAUTH_SECRET is not set! Authentication will fail.");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[Auth] Credentials login attempt for:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing email or password");
          throw new Error("Invalid credentials");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log("[Auth] User not found:", credentials.email);
            throw new Error("Invalid credentials");
          }
          
          if (!user.passwordHash) {
            console.log("[Auth] User has no password (OAuth account):", credentials.email);
            throw new Error("Invalid credentials");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValid) {
            console.log("[Auth] Invalid password for:", credentials.email);
            throw new Error("Invalid credentials");
          }

          console.log("[Auth] Login successful for:", credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("[Auth] Error during login:", error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    newUser: "/auth/register",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log sign-in event for audit
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "SIGN_IN",
          entity: "User",
          entityId: user.id,
          metadata: {
            provider: account?.provider,
            isNewUser,
          },
        },
      });
    },
    async signOut({ token }) {
      // Log sign-out event
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: "SIGN_OUT",
            entity: "User",
            entityId: token.id as string,
          },
        });
      }
    },
  },
  // Enable debug in production temporarily to diagnose auth issues
  debug: process.env.NODE_ENV === "development" || process.env.AUTH_DEBUG === "true",
};

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accessToken?: string;
  }
}

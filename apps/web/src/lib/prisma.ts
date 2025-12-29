import { PrismaClient } from "@prisma/client";

// Log DATABASE_URL status for debugging (don't log the actual value for security)
if (typeof window === "undefined") {
  console.log("[Prisma] DATABASE_URL configured:", !!process.env.DATABASE_URL);
  console.log("[Prisma] NODE_ENV:", process.env.NODE_ENV);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

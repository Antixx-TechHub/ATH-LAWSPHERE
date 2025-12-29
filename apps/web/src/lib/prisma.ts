import { PrismaClient } from "@prisma/client";

// Railway workaround: Try multiple environment variable sources
const getDatabaseUrl = (): string | undefined => {
  // Check standard DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Check Railway's PostgreSQL variables as fallback
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const port = process.env.PGPORT || '5432';
    return `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${port}/${process.env.PGDATABASE}`;
  }
  
  return undefined;
};

const databaseUrl = getDatabaseUrl();

// Log DATABASE_URL status for debugging (don't log the actual value for security)
if (typeof window === "undefined") {
  console.log("[Prisma] DATABASE_URL configured:", !!databaseUrl);
  console.log("[Prisma] PGHOST configured:", !!process.env.PGHOST);
  console.log("[Prisma] NODE_ENV:", process.env.NODE_ENV);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PrismaClient with explicit datasource URL if available
const createPrismaClient = () => {
  if (databaseUrl) {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

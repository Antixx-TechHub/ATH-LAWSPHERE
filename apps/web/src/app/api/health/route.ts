import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering - don't try to access DB at build time
export const dynamic = "force-dynamic";

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unknown",
    roles: 0,
    users: 0,
    env: {
      NODE_ENV: process.env.NODE_ENV || "not set",
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
    }
  };

  try {
    // Test database connection
    const roles = await prisma.role.count();
    const users = await prisma.user.count();
    
    health.database = "connected";
    health.roles = roles;
    health.users = users;
  } catch (error) {
    health.status = "error";
    health.database = error instanceof Error ? error.message : "connection failed";
  }

  return NextResponse.json(health, { 
    status: health.status === "ok" ? 200 : 503 
  });
}

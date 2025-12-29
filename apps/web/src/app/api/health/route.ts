import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unknown",
    roles: 0,
    users: 0,
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check environment variables
    const config = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Check database connection
    let dbConnected = false;
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
      dbConnected = true;
    } catch (e) {
      console.error("DB check failed:", e);
    }

    return NextResponse.json({
      status: "ok",
      auth: {
        secretConfigured: config.NEXTAUTH_SECRET,
        urlConfigured: config.NEXTAUTH_URL,
        environment: config.NODE_ENV,
      },
      database: {
        connected: dbConnected,
        userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auth status check failed:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

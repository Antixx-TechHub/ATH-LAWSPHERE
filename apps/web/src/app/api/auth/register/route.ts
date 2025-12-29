import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
      },
    });

    // Assign default role (lawyer) - create if it doesn't exist
    let lawyerRole = await prisma.role.findUnique({
      where: { name: "lawyer" },
    });

    if (!lawyerRole) {
      // Create the lawyer role if it doesn't exist (self-healing for first user)
      lawyerRole = await prisma.role.create({
        data: {
          name: "lawyer",
          description: "Legal professional with standard access",
        },
      });
    }

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: lawyerRole.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
        metadata: {
          email: user.email,
        },
      },
    });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      );
    }

    // Log detailed error for debugging
    console.error("Registration error:", error);
    
    // Check for common Prisma errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { message: "Database connection error. Please try again later." },
        { status: 503 }
      );
    }
    
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
      return NextResponse.json(
        { message: "Database not initialized. Please contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

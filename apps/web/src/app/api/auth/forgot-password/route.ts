import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, we sent a reset link",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExp = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:8080";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // Log for development (in production, send actual email)
    console.log(`Password reset requested for: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);

    // TODO: Send actual email in production
    // For now, we'll use a simple console log
    // In production, integrate with SendGrid, Resend, AWS SES, etc.
    
    // Example with a hypothetical email service:
    // await sendEmail({
    //   to: email,
    //   subject: "Reset your Lawsphere password",
    //   html: `
    //     <h1>Reset Your Password</h1>
    //     <p>Click the link below to reset your password:</p>
    //     <a href="${resetUrl}">Reset Password</a>
    //     <p>This link expires in 1 hour.</p>
    //     <p>If you didn't request this, please ignore this email.</p>
    //   `,
    // });

    return NextResponse.json({
      message: "If an account with that email exists, we sent a reset link",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

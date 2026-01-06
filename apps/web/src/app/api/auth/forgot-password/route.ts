import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { sendPasswordResetEmail } from "../../../lib/email";
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

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: email,
      resetUrl,
    });

    if (!emailResult.success && !emailResult.devMode) {
      console.error("Failed to send password reset email:", emailResult.error);
    }

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

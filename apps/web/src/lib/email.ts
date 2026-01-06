import { Resend } from "resend";

// Lazy initialization to avoid errors during build
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams) {
  const resend = getResendClient();
  
  // If no API key, log to console (development mode)
  if (!resend) {
    console.log("=== PASSWORD RESET EMAIL (Dev Mode) ===");
    console.log(`To: ${to}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("========================================");
    return { success: true, devMode: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Lawsphere <noreply@resend.dev>",
      to: [to],
      subject: "Reset your Lawsphere password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1e40af; font-size: 28px; margin: 0;">⚖️ Lawsphere</h1>
              </div>

              <h2 style="color: #18181b; font-size: 20px; margin-bottom: 16px;">Reset Your Password</h2>

              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #1e40af; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
                This link will expire in <strong>1 hour</strong>.
              </p>

              <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">

              <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #1e40af; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    console.log(`Password reset email sent to ${to}, ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error };
  }
}

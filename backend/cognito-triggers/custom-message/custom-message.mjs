/**
 * Cognito Custom Message Trigger
 *
 * Customizes email messages for forgot password flow.
 * Zero dependencies - uses only Node.js built-ins.
 *
 * Environment variables:
 *   - FRONTEND_URL: Frontend application URL (e.g., https://app.example.com)
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
 */

export const handler = (event, context, callback) => {
  const { FRONTEND_URL = 'https://example.com' } = process.env;

  if (event.triggerSource === 'CustomMessage_ForgotPassword') {
    const resetUrl = `${FRONTEND_URL}/reset-password?code=${event.request.codeParameter}&email=${encodeURIComponent(event.userName)}`;

    event.response.emailSubject = 'Reset Your Password';
    event.response.emailMessage = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 24px;">Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #0066cc; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Reset Password</a>
        </p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      </body>
      </html>
    `.trim();
  }

  callback(null, event);
};

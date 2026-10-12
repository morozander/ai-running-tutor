/**
 * Cognito Post Confirmation Trigger
 *
 * Creates user in the database via backend webhook after successful signup.
 * Zero dependencies - uses only Node.js built-ins (fetch is native in Node 18+).
 *
 * Environment variables:
 *   - WEBHOOK_URL: Backend webhook endpoint (e.g., https://api.example.com/webhooks/cognito/user-confirmed)
 *   - WEBHOOK_SECRET: Shared secret for webhook authentication
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html
 */

export const handler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const { WEBHOOK_URL, WEBHOOK_SECRET } = process.env;

  if (!WEBHOOK_URL) {
    console.error('WEBHOOK_URL environment variable is not set');
    return event;
  }

  const { sub: userId, email, given_name: firstName, family_name: lastName } = event.request.userAttributes;

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_SECRET && { 'X-Webhook-Secret': WEBHOOK_SECRET }),
      },
      body: JSON.stringify({
        userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Webhook failed: ${response.status} - ${text}`);
    } else {
      console.log(`User ${userId} created via webhook`);
    }
  } catch (error) {
    console.error('Webhook error:', error.message);
    throw error;
  }

  return event;
};

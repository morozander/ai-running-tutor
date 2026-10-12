/**
 * Cognito Pre Sign-up Trigger
 *
 * Auto-confirms user and verifies email to skip confirmation step.
 * Zero dependencies - uses only Node.js built-ins.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
 */

export const handler = async (event) => {
  event.response.autoConfirmUser = true;

  if (event.request.userAttributes.hasOwnProperty("email")) {
    event.response.autoVerifyEmail = true;
  }

  return event;
};

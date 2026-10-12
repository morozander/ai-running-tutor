# Cognito Triggers

Standalone Lambda functions for AWS Cognito User Pool triggers.

## Design Principles

- **Zero dependencies** - Only Node.js built-ins (requires Node 18+ for native `fetch`)
- **Single file per trigger** - Each `.mjs` file is a complete Lambda function
- **No build step** - Deploy directly to AWS Lambda

## Triggers

| File | Trigger | Purpose |
|------|---------|---------|
| `pre-sign-up.mjs` | PreSignUp | Auto-confirms user and verifies email |
| `post-confirmation.mjs` | PostConfirmation | Creates user in backend via webhook |
| `custom-message.mjs` | CustomMessage | Customizes forgot password email |

## Deployment

### Option 1: AWS Console

1. Create a new Lambda function
2. Set runtime to **Node.js 20.x** (or 18.x)
3. Set handler to `pre-sign-up.handler` (filename without extension + `.handler`)
4. Copy/paste the file contents into the inline editor
5. Configure environment variables (see below)
6. Attach to Cognito User Pool trigger

### Option 2: AWS CLI

```bash
# Zip and deploy (example for post-confirmation)
zip post-confirmation.zip post-confirmation.mjs

aws lambda create-function \
  --function-name cognito-post-confirmation \
  --runtime nodejs20.x \
  --handler post-confirmation.handler \
  --zip-file fileb://post-confirmation.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role

# Or update existing
aws lambda update-function-code \
  --function-name cognito-post-confirmation \
  --zip-file fileb://post-confirmation.zip
```

### Option 3: Infrastructure as Code

If using CDK, Terraform, or SAM, reference these files directly.

## Environment Variables

### post-confirmation.mjs

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBHOOK_URL` | Yes | Backend endpoint (e.g., `https://api.example.com/webhooks/cognito/user-confirmed`) |
| `WEBHOOK_SECRET` | No | Shared secret for webhook authentication |

### custom-message.mjs

| Variable | Required | Description |
|----------|----------|-------------|
| `FRONTEND_URL` | Yes | Frontend URL for password reset link (e.g., `https://app.example.com`) |

## Backend Webhook

The `post-confirmation` trigger calls a webhook to create the user. Implement this endpoint in your backend:

```
POST /webhooks/cognito/user-confirmed
Headers:
  Content-Type: application/json
  X-Webhook-Secret: <secret>

Body:
{
  "userId": "cognito-sub-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

## IAM Permissions

Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

No additional permissions needed - triggers only use `fetch` (no AWS SDK calls).

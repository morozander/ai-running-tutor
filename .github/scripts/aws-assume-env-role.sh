#!/bin/sh
# Configure base profile from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY,
# assume ENV_AWS_ROLE_ARN, then set G_AWS_PROFILE with the temporary credentials.
# Use in deploy jobs so one IAM user shares access via per-env roles.
# Requires: aws-cli, jq (AWS CLI image may need: yum install -y jq)
set -e
set +x

aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID" --profile "$G_AWS_PROFILE_SHARED"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY" --profile "$G_AWS_PROFILE_SHARED"
aws configure set region "$AWS_DEFAULT_REGION" --profile "$G_AWS_PROFILE_SHARED"

CREDS_JSON=$(aws sts assume-role \
  --role-arn "$ENV_AWS_ROLE_ARN" \
  --role-session-name "github-actions-$(date +%s)" \
  --profile "$G_AWS_PROFILE_SHARED" \
  --output json)

AKID=$(echo "$CREDS_JSON" | jq -r '.Credentials.AccessKeyId')
SAK=$(echo "$CREDS_JSON" | jq -r '.Credentials.SecretAccessKey')
ST=$(echo "$CREDS_JSON" | jq -r '.Credentials.SessionToken')

aws configure set aws_access_key_id "$AKID" --profile "$G_AWS_PROFILE"
aws configure set aws_secret_access_key "$SAK" --profile "$G_AWS_PROFILE"
aws configure set aws_session_token "$ST" --profile "$G_AWS_PROFILE"
aws configure set region "$AWS_DEFAULT_REGION" --profile "$G_AWS_PROFILE"

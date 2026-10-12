#!/bin/sh
#
# Manage per-PR ephemeral environments.
# Reuses existing dev infrastructure (VPC, RDS, API Gateway, CloudFront, ECR).
#
# Usage:
#   PR_ID=42 ACTION=create-schema  ./pr-environment.sh
#   PR_ID=42 ACTION=deploy-lambda  ./pr-environment.sh
#   PR_ID=42 ACTION=add-apigw-route ./pr-environment.sh
#   PR_ID=42 ACTION=deploy-frontend ./pr-environment.sh
#   PR_ID=42 ACTION=cleanup        ./pr-environment.sh
#
# Required env vars (from generate-dotenv-dev or CI variables):
#   G_AWS_PROFILE, G_APPLICATION_ID, AWS_DEFAULT_REGION,
#   AWS_ECR_REPO_URL, AWS_BE_LAMBDA_MAIN_NAME, AWS_BE_APIGW_ENDPOINT,
#   AWS_FE_BUCKET_NAME, AWS_FE_CLOUDFRONT_DISTRIBUTION_ID
# For deploy-frontend and cleanup (Cognito redirect URLs): AWS_COGNITO_USER_POOL_ID,
#   AWS_COGNITO_CLIENT_ID, AWS_FE_CLOUDFRONT_DOMAIN_NAME
#
set -e

SCHEMA_NAME="pr_${PR_ID}"
PR_LAMBDA_NAME="${G_APPLICATION_ID}-dev-api-pr-${PR_ID}"
PR_ROUTE_KEY="ANY /pr-${PR_ID}/{proxy+}"
PR_PATH_PREFIX="/pr-${PR_ID}"
PROFILE="${G_AWS_PROFILE}"

log() { echo ">>> [pr-env] $1"; }

# ---------------------------------------------------------------------------
# Helpers: resolve dev Lambda config for cloning
# ---------------------------------------------------------------------------
get_main_lambda_config() {
  aws lambda get-function-configuration \
    --function-name "$AWS_BE_LAMBDA_MAIN_NAME" \
    --profile "$PROFILE" \
    --output json
}

get_apigw_id() {
  ENDPOINT="${AWS_BE_APIGW_ENDPOINT}"
  echo "$ENDPOINT" | sed -E 's|^https://([^.]+)\..*|\1|'
}

# ---------------------------------------------------------------------------
# Helper: add or remove PR redirect URLs in Cognito app client
# Requires: AWS_COGNITO_USER_POOL_ID, AWS_COGNITO_CLIENT_ID,
#   AWS_FE_CLOUDFRONT_DOMAIN_NAME
# Usage: update_cognito_pr_redirect_urls add|remove
# ---------------------------------------------------------------------------
update_cognito_pr_redirect_urls() {
  _action="$1"
  if [ -z "${AWS_COGNITO_USER_POOL_ID:-}" ] || [ -z "${AWS_COGNITO_CLIENT_ID:-}" ] || [ -z "${AWS_FE_CLOUDFRONT_DOMAIN_NAME:-}" ]; then
    log "Skipping Cognito redirect URL ${_action}: AWS_COGNITO_USER_POOL_ID, AWS_COGNITO_CLIENT_ID, or AWS_FE_CLOUDFRONT_DOMAIN_NAME not set"
    return 0
  fi
  PR_CALLBACK_URL="https://${AWS_FE_CLOUDFRONT_DOMAIN_NAME}/pr-${PR_ID}/callback"
  PR_LOGOUT_URL="https://${AWS_FE_CLOUDFRONT_DOMAIN_NAME}/pr-${PR_ID}/"
  _client_json=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$AWS_COGNITO_USER_POOL_ID" \
    --client-id "$AWS_COGNITO_CLIENT_ID" \
    --profile "$PROFILE" \
    --output json)
  if [ "$_action" = "add" ]; then
    _callback_urls=$(echo "$_client_json" | jq -r --arg u "$PR_CALLBACK_URL" '.UserPoolClient.CallbackURLs + [$u] | unique | .[]')
    _logout_urls=$(echo "$_client_json" | jq -r --arg u "$PR_LOGOUT_URL" '(.UserPoolClient.LogoutURLs // []) + [$u] | unique | .[]')
  else
    _callback_urls=$(echo "$_client_json" | jq -r --arg u "$PR_CALLBACK_URL" '.UserPoolClient.CallbackURLs - [$u] | .[]')
    _logout_urls=$(echo "$_client_json" | jq -r --arg u "$PR_LOGOUT_URL" '(.UserPoolClient.LogoutURLs // []) - [$u] | .[]')
  fi
  _cb_args=""
  for _u in $_callback_urls; do _cb_args="$_cb_args \"$_u\""; done
  _lo_args=""
  for _u in $_logout_urls; do _lo_args="$_lo_args \"$_u\""; done
  eval "aws cognito-idp update-user-pool-client \
    --user-pool-id \"$AWS_COGNITO_USER_POOL_ID\" \
    --client-id \"$AWS_COGNITO_CLIENT_ID\" \
    --callback-urls $_cb_args \
    --logout-urls $_lo_args \
    --profile \"$PROFILE\" \
    --no-cli-pager"
  log "Cognito app client redirect URLs ${_action}ed for pr-${PR_ID}"
}

# ---------------------------------------------------------------------------
# ACTION: create-schema
# Creates the PostgreSQL schema and runs MikroORM migrations via the
# migrations Lambda (overriding RDS_DATABASE_SCHEMA).
# ---------------------------------------------------------------------------
do_create_schema() {
  log "Creating DB schema '${SCHEMA_NAME}' via migrations Lambda..."

  MIGRATIONS_LAMBDA="$AWS_BE_LAMBDA_MIGRATIONS_NAME"
  PR_IMAGE_URI="${AWS_ECR_REPO_URL}:${IMAGE_TAG}"

  CURRENT_CONFIG=$(aws lambda get-function-configuration \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE" \
    --output json)

  CURRENT_ENV=$(echo "$CURRENT_CONFIG" | jq '.Environment.Variables')
  CURRENT_CMD=$(echo "$CURRENT_CONFIG" | jq '.ImageConfigResponse.ImageConfig.Command // ["run","db:migrate:up"]')

  # get-function-configuration doesn't include Code.ImageUri; use get-function
  CURRENT_IMAGE=$(aws lambda get-function \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE" \
    --query 'Code.ImageUri' \
    --output text)

  NEW_ENV=$(echo "$CURRENT_ENV" | jq --arg s "$SCHEMA_NAME" '. + {"RDS_DATABASE_SCHEMA": $s}')

  log "Updating migrations Lambda: image=${PR_IMAGE_URI}, command=db:migrate:pr, schema=${SCHEMA_NAME}..."
  aws lambda update-function-code \
    --function-name "$MIGRATIONS_LAMBDA" \
    --image-uri "$PR_IMAGE_URI" \
    --profile "$PROFILE" \
    --no-cli-pager

  aws lambda wait function-updated \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE"

  aws lambda update-function-configuration \
    --function-name "$MIGRATIONS_LAMBDA" \
    --environment "{\"Variables\": $NEW_ENV}" \
    --image-config '{"EntryPoint":["npm"],"Command":["run","db:migrate:pr"]}' \
    --profile "$PROFILE" \
    --no-cli-pager

  aws lambda wait function-updated \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE"

  log "Invoking migrations Lambda..."
  aws lambda invoke \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE" \
    --log-type Tail \
    --no-cli-pager \
    /tmp/pr-migration-response.json

  RESULT=$(cat /tmp/pr-migration-response.json)
  log "Migration result: $RESULT"

  # Restore original image, env vars, and command
  log "Restoring migrations Lambda to original state..."
  aws lambda update-function-code \
    --function-name "$MIGRATIONS_LAMBDA" \
    --image-uri "$CURRENT_IMAGE" \
    --profile "$PROFILE" \
    --no-cli-pager

  aws lambda wait function-updated \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE"

  ORIGINAL_ENV=$(echo "$CURRENT_ENV" | jq 'del(.RDS_DATABASE_SCHEMA)')
  aws lambda update-function-configuration \
    --function-name "$MIGRATIONS_LAMBDA" \
    --environment "{\"Variables\": $ORIGINAL_ENV}" \
    --image-config "{\"EntryPoint\":[\"npm\"],\"Command\":$CURRENT_CMD}" \
    --profile "$PROFILE" \
    --no-cli-pager

  aws lambda wait function-updated \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE"

  log "Schema '${SCHEMA_NAME}' created and migrations applied."
}

# ---------------------------------------------------------------------------
# ACTION: deploy-lambda
# Creates or updates a Lambda function for this PR, cloning config from the
# main dev Lambda but pointing to the PR-specific DB schema.
# ---------------------------------------------------------------------------
do_deploy_lambda() {
  log "Deploying Lambda '${PR_LAMBDA_NAME}'..."

  MAIN_CONFIG=$(get_main_lambda_config)

  ROLE=$(echo "$MAIN_CONFIG" | jq -r '.Role')
  MEMORY=$(echo "$MAIN_CONFIG" | jq -r '.MemorySize')
  TIMEOUT=$(echo "$MAIN_CONFIG" | jq -r '.Timeout')
  SUBNET_IDS=$(echo "$MAIN_CONFIG" | jq -r '.VpcConfig.SubnetIds | join(",")')
  SG_IDS=$(echo "$MAIN_CONFIG" | jq -r '.VpcConfig.SecurityGroupIds | join(",")')
  ENV_VARS=$(echo "$MAIN_CONFIG" | jq '.Environment.Variables')

  # Override the DB schema env var
  ENV_VARS=$(echo "$ENV_VARS" | jq --arg s "$SCHEMA_NAME" '. + {"RDS_DATABASE_SCHEMA": $s}')

  IMAGE_URI="${AWS_ECR_REPO_URL}:${IMAGE_TAG}"

  # Check if the function already exists
  if aws lambda get-function --function-name "$PR_LAMBDA_NAME" --profile "$PROFILE" >/dev/null 2>&1; then
    log "Lambda already exists, updating code and configuration..."

    aws lambda update-function-code \
      --function-name "$PR_LAMBDA_NAME" \
      --image-uri "$IMAGE_URI" \
      --profile "$PROFILE" \
      --no-cli-pager

    aws lambda wait function-updated \
      --function-name "$PR_LAMBDA_NAME" \
      --profile "$PROFILE"

    aws lambda update-function-configuration \
      --function-name "$PR_LAMBDA_NAME" \
      --environment "{\"Variables\": $ENV_VARS}" \
      --memory-size "$MEMORY" \
      --timeout "$TIMEOUT" \
      --profile "$PROFILE" \
      --no-cli-pager
  else
    log "Creating new Lambda function..."

    aws lambda create-function \
      --function-name "$PR_LAMBDA_NAME" \
      --package-type Image \
      --code "ImageUri=${IMAGE_URI}" \
      --role "$ROLE" \
      --memory-size "$MEMORY" \
      --timeout "$TIMEOUT" \
      --environment "{\"Variables\": $ENV_VARS}" \
      --vpc-config "SubnetIds=${SUBNET_IDS},SecurityGroupIds=${SG_IDS}" \
      --profile "$PROFILE" \
      --no-cli-pager

    aws lambda wait function-active-v2 \
      --function-name "$PR_LAMBDA_NAME" \
      --profile "$PROFILE"
  fi

  log "Lambda '${PR_LAMBDA_NAME}' deployed with image ${IMAGE_URI}."
}

# ---------------------------------------------------------------------------
# ACTION: add-apigw-route
# Adds an API Gateway integration + route for the PR Lambda.
# Uses path parameter mapping to strip the /pr-{id} prefix.
# ---------------------------------------------------------------------------
do_add_apigw_route() {
  log "Configuring API Gateway route for PR ${PR_ID}..."

  API_ID=$(get_apigw_id)

  # Get the Lambda ARN
  LAMBDA_ARN=$(aws lambda get-function \
    --function-name "$PR_LAMBDA_NAME" \
    --profile "$PROFILE" \
    --query 'Configuration.FunctionArn' \
    --output text)

  # Check if integration already exists (tagged with pr-id)
  EXISTING_INTEGRATIONS=$(aws apigatewayv2 get-integrations \
    --api-id "$API_ID" \
    --profile "$PROFILE" \
    --output json)

  INTEGRATION_ID=$(echo "$EXISTING_INTEGRATIONS" | \
    jq -r --arg desc "pr-${PR_ID}" \
    '.Items[] | select(.Description == $desc) | .IntegrationId')

  if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" = "null" ]; then
    log "Creating new integration..."

    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
      --api-id "$API_ID" \
      --integration-type AWS_PROXY \
      --integration-uri "$LAMBDA_ARN" \
      --payload-format-version "1.0" \
      --description "pr-${PR_ID}" \
      --request-parameters '{"overwrite:path":"$request.path.proxy"}' \
      --profile "$PROFILE" \
      --query 'IntegrationId' \
      --output text)
  else
    log "Updating existing integration ${INTEGRATION_ID}..."

    aws apigatewayv2 update-integration \
      --api-id "$API_ID" \
      --integration-id "$INTEGRATION_ID" \
      --integration-uri "$LAMBDA_ARN" \
      --request-parameters '{"overwrite:path":"$request.path.proxy"}' \
      --profile "$PROFILE" \
      --no-cli-pager
  fi

  # Create/update route
  EXISTING_ROUTES=$(aws apigatewayv2 get-routes \
    --api-id "$API_ID" \
    --profile "$PROFILE" \
    --output json)

  ROUTE_ID=$(echo "$EXISTING_ROUTES" | \
    jq -r --arg rk "ANY /pr-${PR_ID}/{proxy+}" \
    '.Items[] | select(.RouteKey == $rk) | .RouteId')

  if [ -z "$ROUTE_ID" ] || [ "$ROUTE_ID" = "null" ]; then
    log "Creating route: ANY /pr-${PR_ID}/{proxy+}"

    aws apigatewayv2 create-route \
      --api-id "$API_ID" \
      --route-key "ANY /pr-${PR_ID}/{proxy+}" \
      --target "integrations/${INTEGRATION_ID}" \
      --profile "$PROFILE" \
      --no-cli-pager
  else
    log "Updating existing route ${ROUTE_ID}..."

    aws apigatewayv2 update-route \
      --api-id "$API_ID" \
      --route-id "$ROUTE_ID" \
      --target "integrations/${INTEGRATION_ID}" \
      --profile "$PROFILE" \
      --no-cli-pager
  fi

  # Grant API Gateway permission to invoke the PR Lambda
  ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query 'Account' --output text)
  SOURCE_ARN="arn:aws:execute-api:${AWS_DEFAULT_REGION}:${ACCOUNT_ID}:${API_ID}/*/*/pr-${PR_ID}/*"

  aws lambda add-permission \
    --function-name "$PR_LAMBDA_NAME" \
    --statement-id "apigw-pr-${PR_ID}" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "$SOURCE_ARN" \
    --profile "$PROFILE" \
    --no-cli-pager 2>/dev/null || log "Permission already exists, skipping."

  log "API Gateway route configured: ANY /pr-${PR_ID}/{proxy+} -> ${PR_LAMBDA_NAME}"
}

# ---------------------------------------------------------------------------
# ACTION: deploy-frontend
# Syncs PR frontend build to S3 subfolder and invalidates CloudFront.
# SPA path rewrite (e.g. /pr-42/dashboard -> /pr-42/index.html) is handled
# by the CloudFront viewer-request function in dev/eu-central-1/cloudfront.
# ---------------------------------------------------------------------------
do_deploy_frontend() {
  log "Deploying frontend to s3://${AWS_FE_BUCKET_NAME}/pr-${PR_ID}/..."

  aws s3 sync frontend/dist "s3://${AWS_FE_BUCKET_NAME}/pr-${PR_ID}/" \
    --delete \
    --profile "$PROFILE"

  aws cloudfront create-invalidation \
    --distribution-id "$AWS_FE_CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/pr-${PR_ID}/*" \
    --profile "$PROFILE" \
    --no-cli-pager

  update_cognito_pr_redirect_urls add
  log "Frontend deployed to /pr-${PR_ID}/"
}

# ---------------------------------------------------------------------------
# ACTION: cleanup
# Removes all PR-specific resources.
# ---------------------------------------------------------------------------
do_cleanup() {
  log "Cleaning up PR ${PR_ID} environment..."

  API_ID=$(get_apigw_id)

  # 1. Remove API Gateway route + integration
  EXISTING_ROUTES=$(aws apigatewayv2 get-routes \
    --api-id "$API_ID" \
    --profile "$PROFILE" \
    --output json 2>/dev/null || echo '{"Items":[]}')

  ROUTE_ID=$(echo "$EXISTING_ROUTES" | \
    jq -r --arg rk "ANY /pr-${PR_ID}/{proxy+}" \
    '.Items[] | select(.RouteKey == $rk) | .RouteId')

  if [ -n "$ROUTE_ID" ] && [ "$ROUTE_ID" != "null" ]; then
    log "Deleting route ${ROUTE_ID}..."
    aws apigatewayv2 delete-route \
      --api-id "$API_ID" \
      --route-id "$ROUTE_ID" \
      --profile "$PROFILE" 2>/dev/null || true
  fi

  EXISTING_INTEGRATIONS=$(aws apigatewayv2 get-integrations \
    --api-id "$API_ID" \
    --profile "$PROFILE" \
    --output json 2>/dev/null || echo '{"Items":[]}')

  INTEGRATION_ID=$(echo "$EXISTING_INTEGRATIONS" | \
    jq -r --arg desc "pr-${PR_ID}" \
    '.Items[] | select(.Description == $desc) | .IntegrationId')

  if [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "null" ]; then
    log "Deleting integration ${INTEGRATION_ID}..."
    aws apigatewayv2 delete-integration \
      --api-id "$API_ID" \
      --integration-id "$INTEGRATION_ID" \
      --profile "$PROFILE" 2>/dev/null || true
  fi

  # 2. Delete Lambda function
  log "Deleting Lambda ${PR_LAMBDA_NAME}..."
  aws lambda delete-function \
    --function-name "$PR_LAMBDA_NAME" \
    --profile "$PROFILE" 2>/dev/null || log "Lambda not found, skipping."

  # 3. Drop DB schema via migrations Lambda
  log "Dropping schema ${SCHEMA_NAME}..."
  MIGRATIONS_LAMBDA="$AWS_BE_LAMBDA_MIGRATIONS_NAME"

  CURRENT_CONFIG=$(aws lambda get-function-configuration \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE" \
    --output json)

  CURRENT_ENV=$(echo "$CURRENT_CONFIG" | jq '.Environment.Variables')
  CURRENT_CMD=$(echo "$CURRENT_CONFIG" | jq '.ImageConfigResponse.ImageConfig.Command // ["run","db:migrate:up"]')

  DROP_ENV=$(echo "$CURRENT_ENV" | jq --arg s "$SCHEMA_NAME" '. + {"RDS_DATABASE_SCHEMA": $s}')

  aws lambda update-function-configuration \
    --function-name "$MIGRATIONS_LAMBDA" \
    --environment "{\"Variables\": $DROP_ENV}" \
    --image-config '{"EntryPoint":["npm"],"Command":["run","db:schema:drop-pr"]}' \
    --profile "$PROFILE" \
    --no-cli-pager

  aws lambda wait function-updated \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE"

  aws lambda invoke \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE" \
    --no-cli-pager \
    /tmp/pr-drop-response.json || log "Schema drop invocation failed, may need manual cleanup."

  ORIGINAL_ENV=$(echo "$CURRENT_ENV" | jq 'del(.RDS_DATABASE_SCHEMA)')
  aws lambda update-function-configuration \
    --function-name "$MIGRATIONS_LAMBDA" \
    --environment "{\"Variables\": $ORIGINAL_ENV}" \
    --image-config "{\"EntryPoint\":[\"npm\"],\"Command\":$CURRENT_CMD}" \
    --profile "$PROFILE" \
    --no-cli-pager

  aws lambda wait function-updated \
    --function-name "$MIGRATIONS_LAMBDA" \
    --profile "$PROFILE"

  # 4. Remove PR redirect URLs from Cognito app client
  update_cognito_pr_redirect_urls remove

  # 5. Remove S3 frontend files
  log "Removing S3 frontend files..."
  aws s3 rm "s3://${AWS_FE_BUCKET_NAME}/pr-${PR_ID}/" \
    --recursive \
    --profile "$PROFILE" 2>/dev/null || log "S3 folder not found, skipping."

  aws cloudfront create-invalidation \
    --distribution-id "$AWS_FE_CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/pr-${PR_ID}/*" \
    --profile "$PROFILE" \
    --no-cli-pager 2>/dev/null || true

  log "PR ${PR_ID} environment cleaned up."
}


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
case "${ACTION}" in
  create-schema)   do_create_schema ;;
  deploy-lambda)   do_deploy_lambda ;;
  add-apigw-route) do_add_apigw_route ;;
  deploy-frontend) do_deploy_frontend ;;
  cleanup)         do_cleanup ;;
  *)
    echo "Usage: ACTION=<create-schema|deploy-lambda|add-apigw-route|deploy-frontend|cleanup> PR_ID=<id> $0"
    exit 1
    ;;
esac

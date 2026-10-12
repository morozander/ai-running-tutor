#!/bin/sh
set -ex

AWS_ECR_REPO_URL=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/shared/eu-central-1/ecr/ --json | jq -r --arg k "$G_APPLICATION_ID/api" '.ecr_repository_url.value.[$k]')
AWS_FE_BUCKET_ARN=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/s3/ --json | jq -r '.bucket_arn.value.website')
AWS_FE_BUCKET_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/s3/ --json | jq -r '.bucket_name.value.website')
AWS_FE_CLOUDFRONT_DISTRIBUTION_ID=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/cloudfront/ --json | jq -r '.cloudfront_distribution_id.value')
AWS_FE_CLOUDFRONT_DOMAIN_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/cloudfront/ --json | jq -r '.cloudfront_distribution_domain_name.value')
AWS_BE_LAMBDA_MAIN_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/lambdas/app/main/ --json | jq -r '.lambda_function_name.value')
AWS_BE_LAMBDA_MIGRATIONS_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/lambdas/app/migrations/ --json | jq -r '.lambda_function_name.value')
AWS_BE_LAMBDA_CRON_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/lambdas/app/cron/ --json | jq -r '.lambda_function_name.value')
AWS_BE_APIGW_ENDPOINT=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/apigw/ --json | jq -r '.api_endpoint.value')
AWS_COGNITO_PRE_SIGNUP_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/lambdas/cognito/pre-sign-up/ --json | jq -r '.lambda_function_name.value')
AWS_COGNITO_POST_CONFIRMATION_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/lambdas/cognito/post-confirmation/ --json | jq -r '.lambda_function_name.value')
AWS_COGNITO_CUSTOM_MESSAGE_NAME=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/lambdas/cognito/custom-message/ --json | jq -r '.lambda_function_name.value')
AWS_COGNITO_USER_POOL_ID=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/cognito/ --json | jq -r '.id.value')
AWS_COGNITO_CLIENT_ID=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/cognito/ --json | jq -r '.client_ids.value[0]')
AWS_COGNITO_DOMAIN="${G_APPLICATION_ID}-${NAME}"
cat << EOF > secrets.json
{
  "AWS_ECR_REPO_URL": "$AWS_ECR_REPO_URL",
  "AWS_FE_BUCKET_ARN": "$AWS_FE_BUCKET_ARN",
  "AWS_FE_BUCKET_NAME": "$AWS_FE_BUCKET_NAME",
  "AWS_FE_CLOUDFRONT_DISTRIBUTION_ID": "$AWS_FE_CLOUDFRONT_DISTRIBUTION_ID",
  "AWS_FE_CLOUDFRONT_DOMAIN_NAME": "$AWS_FE_CLOUDFRONT_DOMAIN_NAME",
  "AWS_BE_LAMBDA_MAIN_NAME": "$AWS_BE_LAMBDA_MAIN_NAME",
  "AWS_BE_LAMBDA_MIGRATIONS_NAME": "$AWS_BE_LAMBDA_MIGRATIONS_NAME",
  "AWS_BE_LAMBDA_CRON_NAME": "$AWS_BE_LAMBDA_CRON_NAME",
  "AWS_BE_APIGW_ENDPOINT": "$AWS_BE_APIGW_ENDPOINT",
  "AWS_COGNITO_PRE_SIGNUP_NAME": "$AWS_COGNITO_PRE_SIGNUP_NAME",
  "AWS_COGNITO_POST_CONFIRMATION_NAME": "$AWS_COGNITO_POST_CONFIRMATION_NAME",
  "AWS_COGNITO_CUSTOM_MESSAGE_NAME": "$AWS_COGNITO_CUSTOM_MESSAGE_NAME",
  "AWS_COGNITO_USER_POOL_ID": "$AWS_COGNITO_USER_POOL_ID",
  "AWS_COGNITO_CLIENT_ID": "$AWS_COGNITO_CLIENT_ID",
  "AWS_COGNITO_DOMAIN": "$AWS_COGNITO_DOMAIN"
}
EOF

AWS_CI_SECRET_ID=$(terragrunt output --working-dir $GITHUB_WORKSPACE/iaac/terragrunt/${NAME}/eu-central-1/secrets-manager/ --json | jq -r '.secret_names.value["cicd/envs"]')

aws secretsmanager put-secret-value \
  --secret-id $AWS_CI_SECRET_ID \
  --secret-string file://secrets.json \
  --profile $G_AWS_PROFILE \
  --no-cli-pager

cat << EOF > $GITHUB_WORKSPACE/build.env
AWS_ECR_REPO_URL=$AWS_ECR_REPO_URL
AWS_FE_BUCKET_ARN=$AWS_FE_BUCKET_ARN
AWS_FE_BUCKET_NAME=$AWS_FE_BUCKET_NAME
AWS_FE_CLOUDFRONT_DISTRIBUTION_ID=$AWS_FE_CLOUDFRONT_DISTRIBUTION_ID
VITE_APP_BASE_URL=https://$AWS_FE_CLOUDFRONT_DOMAIN_NAME
AWS_BE_LAMBDA_MAIN_NAME=$AWS_BE_LAMBDA_MAIN_NAME
AWS_BE_LAMBDA_MIGRATIONS_NAME=$AWS_BE_LAMBDA_MIGRATIONS_NAME
AWS_BE_LAMBDA_CRON_NAME=$AWS_BE_LAMBDA_CRON_NAME
VITE_APP_API_URL=$AWS_BE_APIGW_ENDPOINT/api/v1
GRAPHQL_SCHEMA_ORIGIN=$AWS_BE_APIGW_ENDPOINT/api/v1
AWS_COGNITO_PRE_SIGNUP_NAME=$AWS_COGNITO_PRE_SIGNUP_NAME
AWS_COGNITO_POST_CONFIRMATION_NAME=$AWS_COGNITO_POST_CONFIRMATION_NAME
AWS_COGNITO_CUSTOM_MESSAGE_NAME=$AWS_COGNITO_CUSTOM_MESSAGE_NAME
VITE_AWS_USER_POOL_ID=$AWS_COGNITO_USER_POOL_ID
VITE_AWS_USER_POOL_WEB_CLIENT_ID=$AWS_COGNITO_CLIENT_ID
VITE_AWS_REGION=$AWS_DEFAULT_REGION
VITE_COGNITO_DOMAIN=$AWS_COGNITO_DOMAIN
EOF

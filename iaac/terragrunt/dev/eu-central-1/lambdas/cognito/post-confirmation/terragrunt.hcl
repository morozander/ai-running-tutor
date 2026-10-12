include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr:///terraform-aws-modules/lambda/aws?version=8.1.2"
}

dependency "apigateway" {
  config_path = "../../../apigw"
  mock_outputs = {
    api_endpoint = "https://mock.execute-api.eu-central-1.amazonaws.com"
  }
}

dependencies {
  paths = ["../../../apigw"]
}

inputs = {
  function_name = "${include.root.locals.application_id}-cognito-post-confirmation-${include.root.locals.environment_cfg.environment}"
  description   = "Cognito Post Confirmation Trigger"
  handler       = "post-confirmation.handler"
  runtime       = "nodejs22.x"

  source_path             = ["${get_repo_root()}/backend/cognito-triggers/post-confirmation"]
  ignore_source_code_hash = true
  package_type            = "Zip"

  environment_variables = {
    WEBHOOK_URL = "${dependency.apigateway.outputs.api_endpoint}/webhooks/cognito/user-confirmed"
  }

  create_current_version_allowed_triggers = false

  allowed_triggers = {
    CognitoUserPool = {
      principal = "cognito-idp.amazonaws.com"
    }
  }
}

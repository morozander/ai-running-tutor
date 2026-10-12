include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr:///terraform-aws-modules/lambda/aws?version=8.1.2"
}

dependency "cloudfront" {
  config_path = "../../../cloudfront"
  mock_outputs = {
    cloudfront_distribution_domain_name = "d111111abcdef8.cloudfront.net"
  }
}

dependencies {
  paths = ["../../../cloudfront"]
}

inputs = {
  function_name = "${include.root.locals.application_id}-cognito-custom-message-${include.root.locals.environment_cfg.environment}"
  description   = "Cognito Custom Message Trigger"
  handler       = "custom-message.handler"
  runtime       = "nodejs22.x"

  source_path             = ["${get_repo_root()}/backend/cognito-triggers/custom-message"]
  ignore_source_code_hash = true
  package_type            = "Zip"

  environment_variables = {
    FRONTEND_URL = "https://${dependency.cloudfront.outputs.cloudfront_distribution_domain_name}"
  }

  create_current_version_allowed_triggers = false

  allowed_triggers = {
    CognitoUserPool = {
      principal = "cognito-idp.amazonaws.com"
    }
  }
}

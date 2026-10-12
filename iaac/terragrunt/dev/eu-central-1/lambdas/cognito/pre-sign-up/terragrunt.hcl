include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr:///terraform-aws-modules/lambda/aws?version=8.1.2"
}

inputs = {
  function_name = "${include.root.locals.application_id}-cognito-pre-sign-up-${include.root.locals.environment_cfg.environment}"
  description   = "Cognito Pre Sign-up Trigger"
  handler       = "pre-sign-up.handler"
  runtime       = "nodejs22.x"

  source_path             = ["${get_repo_root()}/backend/cognito-triggers/pre-sign-up"]
  ignore_source_code_hash = true
  package_type            = "Zip"

  environment_variables = {}

  create_current_version_allowed_triggers = false

  allowed_triggers = {
    CognitoUserPool = {
      principal = "cognito-idp.amazonaws.com"
    }
  }
}

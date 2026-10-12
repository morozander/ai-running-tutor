include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/lambda?ref=master"
}


dependency "vpc" {
  config_path = "../../../vpc"
  mock_outputs = {
    private_subnet_ids = ["subnet-01234567890123456", "subnet-01234567890123457"]
    security_group_ids = ["sg-01234567890123456"]
  }
}

dependency "security-groups" {
  config_path = "../../../security-groups"
  mock_outputs = {
    security_group_ids = ["sg-01234567890123456"]
  }
}

dependency "main-lambda" {
  config_path = "../main"
  mock_outputs = {
    lambda_function_arn  = "dummy:arn"
    lambda_function_name = "some-name"
  }
}


inputs = merge(
  include.root.locals.default_inputs,
  {
    # Dependency inputs
    vpc_subnet_ids         = dependency.vpc.outputs.private_subnet_ids
    vpc_security_group_ids = [dependency.security-groups.outputs.security_group_ids["lambda"]]

    allowed_triggers = {}

    event_source_mapping = {}

    source_path             = "${get_terragrunt_dir()}/lambda"
    ignore_source_code_hash = true
    package_type            = "Zip"


    function_name = "lambda-warmup"
    handler       = "index.handler"
    runtime       = "nodejs24.x"

    memory_size = 512
    timeout     = 10

    environment_variables = {
      LAMBDA_FUNCTION_NAME = dependency.main-lambda.outputs.lambda_function_name
    }

    attach_policy_statements = true
    policy_statements = jsonencode({
      main-lambda-trigger = {
        effect = "Allow"
        actions = [
          "lambda:InvokeFunction"
        ]
        resources = [
          dependency.main-lambda.outputs.lambda_function_arn
        ]
      }
    })

    schedulers = {
      "warmup-lambda" = {
        schedule_expression = "cron(0/5 5-23 ? * * *)"
        input               = { "concurrency" : 15 }
      }
    }
  }
)

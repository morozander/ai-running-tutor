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

dependency "ecr" {
  config_path = "../../../../../shared/eu-central-1/ecr"
  mock_outputs = {
    ecr_repository_url = ["12345678901234567890123456789012"]
    ecr_repository_arn = {
      "${include.root.locals.application_id}/api" = "arn:aws:ecr:eu-central-1:123456789012:repository/${include.root.locals.application_id}/api"
    }
  }
}

dependency "security-groups" {
  config_path = "../../../security-groups"
  mock_outputs = {
    security_group_ids = ["sg-01234567890123456"]
  }
}

dependency "secrets-manager" {
  config_path = "../../../secrets-manager"
  mock_outputs = {
    secret_names_ids = {
      "lambda/be" = "arn:aws:secretsmanager:eu-central-1:083915485705:secret:lambda/be-12345678901234567890123456789012"
    }
  }
}

dependency "s3" {
  config_path = "../../../s3"
  mock_outputs = {
    bucket_arn = {
      "media" = "arn:aws:s3:::test-bucket"
    }
  }
}

dependency "rds" {
  config_path = "../../../rds-aurora"
  mock_outputs = {
    db_instance_master_user_secret_arn = "arn:aws:secretsmanager:eu-central-1:083915485705:secret:rds-12345678901234567890123456789012"
    db_instance_address                = "test-db.example.com"
    db_instance_port                   = 3306
    db_name                            = "test-db"
  }
}

dependency "apigateway" {
  config_path = "../../../apigw"
  mock_outputs = {
    api_id            = "api-01234567890123456"
    api_execution_arn = "arn:aws:execute-api:eu-central-1:083915485705:api-01234567890123456/"
  }
}

dependency "cognito" {
  config_path = "../../../cognito"
  mock_outputs = {
    id         = "eu-central-1_01234567890123456"
    client_ids = ["01234567890123456"]
  }
}


dependencies {
  paths = [
    "../../../apigw",
    "../../../s3",
    "../../../rds-aurora",
    "../../../secrets-manager",
    "../../../vpc",
    "../../../../../shared/eu-central-1/ecr",
    "../../../security-groups",
    "../../../cognito"
  ]
}


inputs = merge(
  include.root.locals.default_inputs,
  {
    # Dependency inputs
    vpc_subnet_ids                   = dependency.vpc.outputs.private_subnet_ids
    vpc_security_group_ids           = [dependency.security-groups.outputs.security_group_ids["lambda"]]
    ecr_image_uri                    = dependency.ecr.outputs.ecr_repository_url["${include.root.locals.application_id}/api"]
    apigateway_id                    = dependency.apigateway.outputs.api_id
    lambda_secrets_manager_secret_id = dependency.secrets-manager.outputs.secret_names_ids["lambda/be"]

    # Custom inputs
    allowed_triggers = {
      APIGatewayAny = {
        service = "apigateway"
        # source_arn = "${dependency.apigateway.outputs.api_execution_arn}/*/*/*"
      }
    }
    event_source_mapping = {}


    ecr_image_tag  = "latest" # change this to your ECR image tag
    package_type   = "Image"
    create_package = false

    # Use this param if you use RDS database proviisoned by rds-aurora module otherwise define values in  "lambda/main" secret yourself
    rds_secrets_manager_secret_id = dependency.rds.outputs.cluster_master_user_secret_arn
    rds_database_connection = {
      host     = dependency.rds.outputs.cluster_reader_endpoint
      port     = dependency.rds.outputs.cluster_port
      database = dependency.rds.outputs.cluster_database_name
    }

    function_name = "main"

    memory_size = 256
    timeout     = 30


    apigateway_route_key = "ANY /{proxy+}"
    schedulers           = {}

    environment_variables = {
      COGNITO_USER_POOL_ID = dependency.cognito.outputs.id
      COGNITO_CLIENT_ID    = dependency.cognito.outputs.client_ids[0]
      S3_BUCKET            = dependency.s3.outputs.bucket_name["media"]
    }

    attach_policy_statements = true
    policy_statements = {
      # ECR: GetAuthorizationToken must use Resource "*" (AWS requirement)
      ecr_auth = {
        effect    = "Allow"
        actions   = ["ecr:GetAuthorizationToken"]
        resources = ["*"]
      }
      # ECR: pull image for Lambda container
      ecr_pull = {
        effect    = "Allow"
        actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
        resources = [dependency.ecr.outputs.ecr_repository_arn["${include.root.locals.application_id}/api"]]
      }
      s3_media = {
        effect    = "Allow"
        actions   = ["s3:GetObject", "s3:PutObject"]
        resources = [dependency.s3.outputs.bucket_arn["media"], "${dependency.s3.outputs.bucket_arn["media"]}/*"]
      }
    }
  }
)

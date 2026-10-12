include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr://registry.terraform.io/terraform-aws-modules/iam/aws//modules/iam-user?version=6.4.0"
}


dependency "ecr" {
  config_path = "../ecr"
  mock_outputs = {
    ecr_repository_arn = {
      "${include.root.locals.application_id}/api" = "arn:aws:ecr:eu-central-1:123456789012:repository/${include.root.locals.application_id}/api"
    }
  }
}

dependency "s3-dev" {
  config_path = "../../../dev/eu-central-1/s3"
  mock_outputs = {
    bucket_arn = "arn:aws:s3:eu-central-1:123456789012:bucket/my-bucket"
  }
}

dependencies {
  paths = [
    "../ecr",
    "../../../dev/eu-central-1/s3"
  ]
}


inputs = merge(
  include.root.locals.default_inputs,
  {
    create_user          = true
    name                 = "gitlab-ci"
    path                 = "/gitlab/"
    create_inline_policy = true
    inline_policy_permissions = {
      AllowPushImagesToECR = {
        actions = [
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        effect    = "Allow"
        resources = [for k, v in dependency.ecr.outputs.ecr_repository_arn : v]
      }
      AllowLogIntoECR = {
        effect    = "Allow"
        actions   = ["ecr:GetAuthorizationToken"]
        resources = ["*"]
      }
      #   AllowUpdateLambda = {
      #     effect = "Allow",
      #     actions = ["lambda:UpdateFunctionCode"],
      #     resources = concat([
      #       # DEV
      #       dependency.lambda-be-dev.outputs.lambda_function_arn,
      #       dependency.lambda-cron-projectsSync-dev.outputs.lambda_function_arn,
      #       dependency.lambda-cron-usersSync-dev.outputs.lambda_function_arn,
      #       # PROD
      #       dependency.lambda-be-prod.outputs.lambda_function_arn,
      #       dependency.lambda-cron-projectsSync-prod.outputs.lambda_function_arn,
      #       dependency.lambda-cron-usersSync-prod.outputs.lambda_function_arn,
      #     ], dependency.cognito-dev.outputs.lambda_function_arns, dependency.cognito-prod.outputs.lambda_function_arns)
      #   }

      #   AllowUpdateCloudFrontDistribution = {
      #     effect = "Allow",
      #     actions = ["cloudfront:CreateInvalidation"],
      #     resources = [
      #       dependency.cloudfront-dev.outputs.cloudfront_distribution_arn,
      #       dependency.cloudfront-prod.outputs.cloudfront_distribution_arn
      #     ]
      #   }

      AllowUpdateStaticWebsite = {
        effect = "Allow",
        actions = [
          "s3:PutObject",
          "s3:ListObjectsV2",
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        resources = concat(
          [for k, v in dependency.s3-dev.outputs.bucket_arn : v],
          [for k, v in dependency.s3-dev.outputs.bucket_arn : "${v}/*"]
        )
      }
    }
  }
)

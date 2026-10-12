include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr:///lgallard/cognito-user-pool/aws?version=4.0.0"
}

generate "awscc_provider" {
  path      = "awscc_provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "awscc" {
  region  = "${include.root.locals.region_cfg.region}"
  profile = "${include.root.locals.environment_cfg.aws_profile}"
}
EOF
}

generate "cognito_secrets" {
  path      = "cognito_secrets.tf"
  if_exists = "overwrite"
  contents  = <<EOF
data "aws_secretsmanager_secret_version" "cognito" {
  secret_id = "${dependency.secrets-manager.outputs.secret_names_ids["cognito"]}"
}

locals {
  cognito_secrets = jsondecode(data.aws_secretsmanager_secret_version.cognito.secret_string)
}
EOF
}

generate "cognito_secrets_override" {
  path      = "cognito_secrets_override.tf"
  if_exists = "overwrite"
  contents  = <<EOF
resource "aws_cognito_identity_provider" "identity_provider" {
  provider_details = {
    # try(...) so a fresh apply where the secret has no keys yet (a race with
    # the secrets-manager unit seeding it) does not fail with "Invalid index".
    # Falls back to the module's placeholder; replace with real OAuth creds in
    # the "cognito" Secrets Manager secret when social login is needed.
    client_id        = try(local.cognito_secrets["client_id"], "some_client_id")
    client_secret    = try(local.cognito_secrets["client_secret"], "some_client_secret")
    authorize_scopes = "email openid profile"
  }
}
EOF
}

# ─── Lambda trigger dependencies ─────────────────────────────────────────────

dependency "lambda_pre_sign_up" {
  config_path = "../lambdas/cognito/pre-sign-up"
  mock_outputs = {
    lambda_function_arn = "arn:aws:lambda:eu-central-1:123456789012:function:cognito-pre-sign-up"
  }
}

dependency "lambda_post_confirmation" {
  config_path = "../lambdas/cognito/post-confirmation"
  mock_outputs = {
    lambda_function_arn = "arn:aws:lambda:eu-central-1:123456789012:function:cognito-post-confirmation"
  }
}

dependency "lambda_custom_message" {
  config_path = "../lambdas/cognito/custom-message"
  mock_outputs = {
    lambda_function_arn = "arn:aws:lambda:eu-central-1:123456789012:function:cognito-custom-message"
  }
}

dependency "cloudfront" {
  config_path = "../cloudfront"
  mock_outputs = {
    cloudfront_distribution_domain_name = "d111111abcdef8.cloudfront.net"
  }
}

dependency "secrets-manager" {
  config_path = "../secrets-manager"
  mock_outputs = {
    secret_names_ids = {
      cognito = "arn:aws:secretsmanager:eu-central-1:123456789012:secret:cognito-AbCdEf"
    }
  }
}

dependencies {
  paths = [
    "../lambdas/cognito/pre-sign-up",
    "../lambdas/cognito/post-confirmation",
    "../lambdas/cognito/custom-message",
    "../cloudfront",
    "../secrets-manager",
  ]
}

# ─── Inputs ──────────────────────────────────────────────────────────────────

inputs = {
  user_pool_name = "${include.root.locals.application_id}-${include.root.locals.environment_cfg.environment}"

  username_attributes            = ["email"]
  auto_verified_attributes       = ["email"]
  domain                         = "${include.root.locals.application_id}-${include.root.locals.environment_cfg.environment}"
  domain_managed_login_version   = 2
  managed_login_branding_enabled = true
  managed_login_branding = {
    main = {
      client_id = "${include.root.locals.application_id}-${include.root.locals.environment_cfg.environment}"
      assets = [
        {
          category   = "PAGE_HEADER_LOGO"
          extension  = "PNG"
          bytes      = "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpGNzdGMTE3NDA3MjA2ODExOEMxNEE3NkIxRDhEMzU5RSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpBQzU0OTI2RjY5MjAxMUUyQjM1OUE4QzQwMEM2QjM0MCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpBQzU0OTI2RTY5MjAxMUUyQjM1OUE4QzQwMEM2QjM0MCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjA1ODAxMTc0MDcyMDY4MTE4QzE0QTc2QjFEOEQzNTlFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkY3N0YxMTc0MDcyMDY4MTE4QzE0QTc2QjFEOEQzNTlFIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+SG1RYgAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAADqSURBVHjaYmRmYaSN4GVkYKKxASxMtDWAlYW2BrCy0tYANjbaGsDORlsDeNhpawAvO20N4OOgrQF8XLQ1gJ+btgYI8dLWAGFe2hogykdbA8T4aGuAOB9tDZDgo60BUvy0NUCWn7YGSAvQ1gAZAdoaICtIWwPkBGlrgIIQbQ1QFqatAWrCtDVAU4S2BmiJ0tYAHVHaGqArSlsDDMVpa4CROG0NMBanrQFmUrQ1wFKKtgbYStHWADsp2hrgJEVbA1ylqG0AP1MDCwsLjdMGAwM9i0pmNnoVlexspL0RebhobQAvUwAAAgwA3q4UUqwxJWsAAAAASUVORK5CYII="
          color_mode = "LIGHT"
        }
      ]
      use_cognito_provided_values = true
      return_merged_resources     = true
    }
  }

  admin_create_user_config_allow_admin_create_user_only = false
  admin_create_user_config_email_message                = "{username}, your verification code is `{####}`"
  admin_create_user_config_email_subject                = "Your verification code"
  admin_create_user_config_sms_message                  = "Your username is {username} and temporary password is `{####}`"

  password_policy = {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_uppercase                = true
    require_symbols                  = false
    temporary_password_validity_days = 7
    password_history_size            = 0
  }

  # ─── Lambda triggers ────────────────────────────────────────────────────────
  lambda_config = {
    pre_sign_up       = dependency.lambda_pre_sign_up.outputs.lambda_function_arn
    post_confirmation = dependency.lambda_post_confirmation.outputs.lambda_function_arn
    custom_message    = dependency.lambda_custom_message.outputs.lambda_function_arn
  }

  # ─── Identity providers ─────────────────────────────────────────────────────
  # Google OAuth credentials from: https://console.cloud.google.com/apis/credentials?project=g-monorepo-auth
  # provider_details is overridden by the generated cognito_secrets_override.tf
  # which reads client_id/client_secret from the "cognito" Secrets Manager secret.
  # Secret JSON format: {"client_id": "xxx.apps.googleusercontent.com", "client_secret": "GOCSPX-xxx"}
  # Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=g-monorepo-auth
  identity_providers = [
    {
      provider_name = "Google"
      provider_type = "Google"
      provider_details = {
        authorize_scopes = "email openid profile"
      }
      attribute_mapping = {
        email       = "email"
        username    = "sub"
        given_name  = "given_name"
        family_name = "family_name"
        picture     = "picture"
      }
    }
  ]

  clients = [
    {
      name                                          = "${include.root.locals.application_id}-${include.root.locals.environment_cfg.environment}"
      generate_secret                               = false
      allowed_oauth_flows                           = ["code"]
      allowed_oauth_scopes                          = ["email", "openid", "profile"]
      allowed_oauth_flows_user_pool_client          = true
      auth_session_validity                         = 3
      enable_token_revocation                       = true
      enable_propagate_additional_user_context_data = false

      mfa_configuration = "OPTIONAL"
      callback_urls = [
        "https://${dependency.cloudfront.outputs.cloudfront_distribution_domain_name}/callback",
        "http://localhost:3000/callback"
      ]
      logout_urls = [
        "https://${dependency.cloudfront.outputs.cloudfront_distribution_domain_name}/",
        "http://localhost:3000/"
      ]
      access_token_validity  = 60
      id_token_validity      = 60
      refresh_token_validity = 5
      token_validity_units = {
        access_token  = "minutes"
        id_token      = "minutes"
        refresh_token = "days"
      }
      explicit_auth_flows = [
        "ALLOW_USER_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH"
      ]
      supported_identity_providers = [
        "COGNITO",
        "Google"
      ]
      read_attributes  = []
      write_attributes = []
    }
  ]

  ignore_schema_changes = true
  schemas               = []
}

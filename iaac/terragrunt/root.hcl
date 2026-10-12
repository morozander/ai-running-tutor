locals {
  application_id = get_env("G_APPLICATION_ID")


  root_region             = "us-east-1"
  aws_root_profile        = get_env("G_AWS_PROFILE_SHARED")
  tf_state_default_region = get_env("G_AWS_REGION_DEFAULT")

  environment_cfg = read_terragrunt_config(find_in_parent_folders("environment.hcl")).locals
  region_cfg      = read_terragrunt_config(find_in_parent_folders("region.hcl")).locals


  default_inputs = {
    application_id = local.application_id
    environment    = local.environment_cfg.environment
  }
}


# Files below are rendered by terragrunt each time you run terragrunt command
terraform {
  extra_arguments "default_args" {
    commands = ["init", "plan", "apply", "destroy", "import", "output"]

    env_vars = {
      AWS_PROFILE = local.environment_cfg.aws_profile #include.root.locals.aws_profile
      AWS_REGION  = local.region_cfg.region           #nclude.root.locals.region_cfg.region
    }
  }
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket  = "${local.application_id}-${get_aws_account_id()}-tfstates"
    key     = "${path_relative_to_include()}/terraform.tfstate"
    region  = "${local.tf_state_default_region}"
    encrypt = true
    profile = "${local.aws_root_profile}"
    # dynamodb_table = "${local.application_id}-lock"
    use_lockfile = true
  }
}

generate "providers" {
  path      = "providers.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region  = "${local.region_cfg.region}"
  profile = "${local.environment_cfg.aws_profile}"
  default_tags {
    tags = {
      Application = "${local.application_id}"
      Environment = "${local.environment_cfg.environment}"
    }
  }
}
provider "aws" {
  region  = "${local.root_region}"
  profile = "${local.environment_cfg.aws_profile}"
  default_tags {
    tags = {
      Application = "${local.application_id}"
      Environment = "${local.environment_cfg.environment}"
    }
  }
  alias = "root"
}
EOF
}

include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/rds-aurora?ref=master"
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id = "vpc-01234567890123456"
  }
}

dependency "security-groups" {
  config_path = "../security-groups"
  mock_outputs = {
    security_group_ids = {
      db = "sg-01234567890123456"
    }
  }
}

dependency "secrets-manager" {
  config_path = "../secrets-manager"
  mock_outputs = {
    secret_names_ids = {
      rds = "arn:aws:secretsmanager:eu-central-1:123456789012:secret:rds-123456789012"
    }
  }
}

dependencies {
  paths = ["../vpc", "../security-groups", "../secrets-manager"]
}


inputs = merge(
  include.root.locals.default_inputs,
  {
    # Dependency inputs
    vpc_id = dependency.vpc.outputs.vpc_id
    # database_subnet_group_name = dependency.vpc.outputs.database_subnet_group
    database_subnet_group_name = dependency.vpc.outputs.database_subnet_group
    security_group_ids         = [dependency.security-groups.outputs.security_group_ids["db"]]
    rds_secret_id              = dependency.secrets-manager.outputs.secret_names_ids["rds"]

    # Custom inputs
    engine         = "aurora-postgresql"
    engine_version = "17.7"

    # managed master_user_password requires the rotation,
    # we will have to redeploy lambda which is too much to implement.
    # If rds_secret_id is provided, and manage_master_user_password is false,
    # then password will be taken from the secret.
    manage_master_user_password          = true
    manage_master_user_password_rotation = false

    database_name                   = "postgres"
    master_username                 = "postgres"
    instance_class                  = "db.t4g.medium"
    backup_retention_period         = 7
    performance_insights_enabled    = true
    storage_encrypted               = true
    monitoring_interval             = 60
    enabled_cloudwatch_logs_exports = ["postgresql"]

    instances = {
      instance-1 = {}
    }
  }
)


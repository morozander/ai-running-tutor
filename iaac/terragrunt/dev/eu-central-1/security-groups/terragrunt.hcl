include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/security-groups?ref=master"
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id = "vpc-01234567890123456"
  }
}

dependencies {
  paths = ["../vpc"]
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    # Dependency inputs
    vpc_id = dependency.vpc.outputs.vpc_id
    # Custom inputs
    # This module supports such names in the list: lambda, jumpbox, db, vpn, ecs, alb
    sg_names = ["lambda", "db", "alb", "jumpbox"]
    # This is a map of IP addresses and descriptions for vpn security group to allow 22 connections
    admin_ips = {}
  }
)


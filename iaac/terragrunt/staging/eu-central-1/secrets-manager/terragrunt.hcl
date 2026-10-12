include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/secrets-manager?ref=master"
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    # Custom inputs
    secret_names = ["rds", "lambda/be", "cicd/envs", "cognito"]
  }
)

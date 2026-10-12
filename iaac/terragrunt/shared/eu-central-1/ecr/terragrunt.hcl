include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/ecr?ref=master"
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    # Custom inputs
    repos = [
      "${include.root.locals.application_id}/api",
    ]
    upload_init_container_image    = true
    allow_organization_pull        = true
    allow_lambda_organization_pull = true
  }
)


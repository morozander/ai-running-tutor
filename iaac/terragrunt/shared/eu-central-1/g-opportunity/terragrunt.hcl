include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/g-opportunity?ref=master"
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    application_id = include.root.locals.application_id
    environment    = include.root.locals.environment_cfg.environment
  }
)
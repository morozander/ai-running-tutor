include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/s3?ref=master"
}


inputs = merge(
  include.root.locals.default_inputs,
  {
    buckets = {
      media = {
        acl                = "private"
        versioning_enabled = true
      }
      website = {
        acl                = "private"
        versioning_enabled = true
        website = {
          index_document = "index.html"
          error_document = "error.html"
        }
      }
    }
  }
)
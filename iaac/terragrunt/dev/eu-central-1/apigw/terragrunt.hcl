include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/apigateway?ref=master"
}

# dependency "acm" {
#   config_path = "../acm"
#   mock_outputs = {
#     certificate_arns = {
#       assessments.geniusee.com = "arn:aws:acm:eu-central-1:123456789012:certificate/123456789012"
#     }
#   }
# }



inputs = merge(
  include.root.locals.default_inputs,
  {
    # Dependency inputs
    # domain_name_certificate_arn = dependency.acm.outputs.certificate_arns["<domain_name>"]

    # Custom inputs
    domain_name = "test.test"

    create_domain_name    = false
    create_domain_records = false
  }
)

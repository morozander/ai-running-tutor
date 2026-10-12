include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/vpc?ref=master"
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    # Custom inputs
    vpc_cidr               = "10.40.0.0/16"
    private_subnets_n      = 2
    public_subnets_n       = 2
    database_subnets_n     = 2
    nat_gateway            = true
    single_nat_gateway     = true # Use single NAT gateway for dev to save costs
    one_nat_gateway_per_az = false
  }
)


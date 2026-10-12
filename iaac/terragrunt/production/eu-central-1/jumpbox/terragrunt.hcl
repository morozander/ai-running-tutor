include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr://registry.terraform.io/terraform-aws-modules/ec2-instance/aws?version=6.2.0"
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    public_subnet_ids = ["subnet-01234567890123456"]
  }
}

dependency "security-groups" {
  config_path = "../security-groups"
  mock_outputs = {
    security_group_ids = {
      jumpbox = "sg-01234567890123456"
    }
  }
}

dependencies {
  paths = ["../vpc", "../security-groups"]
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    # Custom inputs

    # Make sure to not use overlapping CIDR blocks and turn on Nat gateway

    create = true

    name = "${include.root.locals.default_inputs.application_id}-jumpbox-${include.root.locals.default_inputs.environment}"

    instance_type          = "t3.micro"
    key_name               = "${include.root.locals.default_inputs.application_id}"
    monitoring             = false
    subnet_id              = dependency.vpc.outputs.public_subnet_ids[0]
    vpc_security_group_ids = [dependency.security-groups.outputs.security_group_ids["jumpbox"]]
    # Enable creation of EC2 IAM instance profile
    create_iam_instance_profile = true

    # Enable creation of security group
    create_security_group = false

    # Enable creation of elastic IP
    create_eip                  = true
    create_iam_instance_profile = true
    iam_role_description        = "IAM role for EC2 instance"
    iam_role_policies = {
      AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    }
  }
)

# generate "key_pair" {
#   path      = "key_pair.tf"
#   if_exists = "overwrite"

#   contents = <<EOF
# resource "tls_private_key" "this" {
#   algorithm = "ED25519"
# }


# resource "aws_key_pair" "this" {
#   key_name   = "${include.root.locals.default_inputs.application_id}-${include.root.locals.default_inputs.environment}"
#   public_key = tls_private_key.this.public_key_openssh
# }

# resource "local_sensitive_file" "private-key" {
#   content  = tls_private_key.this.private_key_openssh
#   filename = "${get_terragrunt_dir()}/${include.root.locals.default_inputs.application_id}-${include.root.locals.default_inputs.environment}.pem"
# }

# resource "local_sensitive_file" "public-key" {
#   content  = tls_private_key.this.private_key_openssh
#   filename = "${get_terragrunt_dir()}/${include.root.locals.default_inputs.application_id}-${include.root.locals.default_inputs.environment}.pub"
# }
# EOF
# }

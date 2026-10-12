include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/secrets-manager?ref=master"
}

generate "dummy_inputs" {
  path      = "_dummy_inputs.tf"
  if_exists = "overwrite"
  contents  = <<EOF

resource "aws_secretsmanager_secret_version" "cognito" {
  secret_id     = aws_secretsmanager_secret.this["cognito"].id
  secret_string = jsonencode({
    client_id     = "some_client_id"
    client_secret = "some_client_secret"
  })

  lifecycle {
    ignore_changes = [
      secret_string
    ]
  }
}

EOF
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    # Custom inputs
    secret_names = ["rds", "lambda/be", "cicd/envs", "cognito"]
  }
)

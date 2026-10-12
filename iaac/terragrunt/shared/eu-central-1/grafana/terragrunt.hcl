include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

# Managed Grafana workspace only. Creates workspace + API key for provisioning; grafana-dashboards stack uses the key via dependency.
terraform {
  source = "tfr://registry.terraform.io/terraform-aws-modules/managed-service-grafana/aws?version=2.3.1"
}

# Optional centralized monitoring. Excluded from `run --all` by default: it needs
# IAM Identity Center (AWS_SSO) + a Grafana API key that a fresh bootstrap lacks.
# Set TG_GRAFANA_ENABLED=true (and configure SSO + GRAFANA_API_KEY) to enable.
exclude {
  if      = get_env("TG_GRAFANA_ENABLED", "false") != "true"
  actions = ["all"]
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    name        = "${include.root.locals.application_id}-grafana-${include.root.locals.default_inputs.environment}"
    description = "Managed Grafana with IAM Identity Center (centralized monitoring)"

    authentication_providers = ["AWS_SSO"]
    data_sources             = ["CLOUDWATCH"]

    create_iam_role      = true
    iam_role_policy_arns = ["arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"]

    associate_license = false
    permission_type   = "SERVICE_MANAGED"

    tags = {
      Environment = include.root.locals.default_inputs.environment
    }
  }
)

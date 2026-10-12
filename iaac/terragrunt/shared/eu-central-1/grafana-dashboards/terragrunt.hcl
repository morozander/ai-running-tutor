include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

# Separate stack: Grafana provider for dashboards/alerts (depends on managed Grafana workspace)
terraform {
  source = "git::git@github.com:geniusee-software/gsnake-modules.git//modules/aws/grafana-dashboards?ref=master"
}

# Excluded from `run --all` by default (see ../grafana): needs a live Grafana
# workspace + GRAFANA_API_KEY. Enable with TG_GRAFANA_ENABLED=true.
exclude {
  if      = get_env("TG_GRAFANA_ENABLED", "false") != "true"
  actions = ["all"]
}

dependency "grafana" {
  config_path = "../grafana"
  mock_outputs = {
    workspace_endpoint = "g-mock.grafana-workspace.eu-central-1.amazonaws.com"
    workspace_id       = "g-mock"
  }
}

dependencies {
  paths = ["../grafana"]
}

locals {
  dashboards_dir = "${get_terragrunt_dir()}/dashboards"
  yaml_config    = yamldecode(file("${get_terragrunt_dir()}/inputs.yaml"))

  # Build dashboards map. Source: "url" (fetch JSON from URL) or local file ("file" key or key name + .json).
  # Use "file" to reuse same JSON; "datasource_uid" hardcodes source; "title_suffix" / "uid_suffix" for distinct names.
  dashboards = {
    for k, v in local.yaml_config.dashboards :
    k => merge(
      try(v.url, "") != "" ? {
        config_json_url = v.url
        folder_title    = v.folder_title
        overwrite       = try(v.overwrite, true)
        } : {
        config_json_path = "${local.dashboards_dir}/${try(v.file, k)}.json"
        folder_title     = v.folder_title
        overwrite        = try(v.overwrite, true)
      },
      try(v.datasource_uid, null) != null ? { datasource_uid = v.datasource_uid } : {},
      try(v.title_suffix, null) != null ? { title_suffix = v.title_suffix } : {},
      try(v.uid_suffix, null) != null ? { uid_suffix = v.uid_suffix } : {}
    )
  }

  # Expand rule groups that have expand_for_environments: create one group per env, replacing placeholder datasource_uid.
  # Placeholder in rules: use datasource_uid "cloudwatch"; it gets replaced with cloudwatch_datasources[env].
  cloudwatch_datasources = try(local.yaml_config.cloudwatch_datasources, {})
  rule_groups = merge(
    # Groups without expand_for_environments: pass through (strip expand_for_environments if present).
    {
      for gk, gv in local.yaml_config.rule_groups :
      gk => {
        folder_uid       = gv.folder_uid
        interval_seconds = try(gv.interval_seconds, 60)
        rules            = gv.rules
      }
      if try(gv.expand_for_environments, null) == null
    },
    # Groups with expand_for_environments: one rule group per env with datasource_uid placeholder replaced.
    {
      for pair in flatten([
        for gk, gv in local.yaml_config.rule_groups : [
          for env in try(gv.expand_for_environments, []) :
          {
            key = "${gk}-${env}"
            config = {
              folder_uid       = gv.folder_uid
              interval_seconds = try(gv.interval_seconds, 60)
              rules = [
                for r in gv.rules : {
                  name        = "${r.name} (${env})"
                  condition   = r.condition
                  for         = try(r.for, "0s")
                  annotations = try(r.annotations, {})
                  labels      = try(r.labels, {})
                  data = [
                    for d in r.data : {
                      ref_id              = d.ref_id
                      datasource_uid      = (d.datasource_uid == "cloudwatch" && lookup(local.cloudwatch_datasources, env, "") != "") ? local.cloudwatch_datasources[env] : d.datasource_uid
                      model               = d.model
                      relative_time_range = try(d.relative_time_range, { from = 600, to = 0 })
                    }
                  ]
                }
              ]
            }
          }
        ]
      ]) : pair.key => pair.config
    }
  )

  # Slack contact point when SLACK_WEBHOOK_URL is set (uses slack config from YAML)
  slack_enabled = get_env("SLACK_WEBHOOK_URL", "") != ""
  contact_points = local.slack_enabled ? {
    "slack-alerts" = {
      type = "slack"
      slack = {
        url     = get_env("SLACK_WEBHOOK_URL")
        channel = try(local.yaml_config.slack.channel, "#alerts")
        text    = try(local.yaml_config.slack.text, "{{ template \"slack.default.text\" . }}")
      }
    }
  } : {}
}

inputs = {
  grafana_url     = "https://${dependency.grafana.outputs.workspace_endpoint}"
  grafana_api_key = get_env("GRAFANA_API_KEY", "")

  folders    = local.yaml_config.folders
  dashboards = local.dashboards

  contact_points            = local.contact_points
  default_contact_point_key = local.slack_enabled ? "slack-alerts" : ""

  rule_groups = local.rule_groups
  tags        = local.yaml_config.tags
}

include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

terraform {
  source = "tfr://registry.terraform.io/terraform-aws-modules/cloudfront/aws?version=6.4.0"
}

dependency "s3" {
  config_path = "../s3"
  mock_outputs = {
    bucket_arn = {
      "website" = "arn:aws:s3:::test-bucket"
    }
    bucket_website_endpoint = {
      website = "test-bucket.s3.eu-central-1.amazonaws.com"
    }
    bucket_regional_domain_name = {
      "website" = "test-bucket.s3.eu-central-1.amazonaws.com"
    }
  }
}

# dependency "acm" {
#   config_path = "../../../shared/us-east-1/acm"
# }

dependencies {
  paths = [
    "../s3"
  ]
}

inputs = merge(
  include.root.locals.default_inputs,
  {
    aliases             = []
    comment             = "CDN for React frontend of ${include.root.locals.default_inputs.application_id}"
    enabled             = true
    http_version        = "http2"
    price_class         = "PriceClass_100"
    default_root_object = "index.html"

    # create_origin_access_control = true
    origin_access_control = {
      "s3" = {
        description      = "${title(include.root.locals.default_inputs.application_id)} access control for ${include.root.locals.default_inputs.environment} environment."
        origin_type      = "s3"
        signing_behavior = "always"
        signing_protocol = "sigv4"
      }
    }
    origin = {
      static-website = {
        origin_path               = ""
        domain_name               = dependency.s3.outputs.bucket_regional_domain_name["website"]
        origin_access_control_key = "s3"
      }
    }
    # Path rewrite for PR environments: /pr-<id>/ and SPA routes -> /pr-<id>/index.html
    cloudfront_functions = {
      "pr-path-rewrite" = {
        comment = "Rewrite SPA paths under /pr-<id>/ for pr-environment.sh deployments"
        code    = file("${get_terragrunt_dir()}/functions/pr-path-rewrite.js")
        publish = true
      }
    }
    default_cache_behavior = {
      target_origin_id       = "static-website"
      viewer_protocol_policy = "https-only"

      allowed_methods      = ["GET", "HEAD", "OPTIONS"]
      cached_methods       = ["GET", "HEAD", "OPTIONS"]
      compress             = true
      use_forwarded_values = false

      cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
      function_association = {
        "viewer-request" = {
          event_type   = "viewer-request"
          function_key = "pr-path-rewrite"
        }
      }
    }
    custom_error_response = [
      {
        error_code         = 404
        response_code      = 200
        response_page_path = "/index.html"
      },
      {
        error_code         = 403
        response_code      = 200
        response_page_path = "/index.html"
      }
    ]
    # viewer_certificate = {
    #     acm_certificate_arn      = dependency.acm.outputs.certificate_arns["assessments.geniusee.com"]
    #     ssl_support_method       = "sni-only"
    #     minimum_protocol_version = "TLSv1.2_2021"
    # }
    viewer_certificate = {
      cloudfront_default_certificate = true
      minimum_protocol_version       = "TLSv1"
    }
  }
)


generate "s3_resource_policy" {
  path      = "s3_resource_policy.tf"
  if_exists = "overwrite"
  contents  = <<EOF

data "aws_s3_bucket_policy" "static-website" {
  bucket = "${dependency.s3.outputs.bucket_name["website"]}"
}

data "aws_iam_policy_document" "cloudfront_access" {
  # Merge with existing policy if it exists
  source_policy_documents = [
    try(data.aws_s3_bucket_policy.static-website.policy, "")
  ]
  
  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"
    
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    
    actions = ["s3:GetObject"]
    
    resources = ["arn:aws:s3:::${dependency.s3.outputs.bucket_name["website"]}/*"]
    
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "static-website" {
  bucket = "${dependency.s3.outputs.bucket_name["website"]}"
  policy = data.aws_iam_policy_document.cloudfront_access.json
}
EOF
}

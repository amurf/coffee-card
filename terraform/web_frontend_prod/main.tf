resource "aws_s3_bucket" "web_frontend" {
  bucket = "coffee-card-web-frontend"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "web_frontend" {
  bucket = aws_s3_bucket.web_frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "web_frontend" {
  bucket = aws_s3_bucket.web_frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "allow_cf_access" {
  bucket = aws_s3_bucket.web_frontend.id
  policy = data.aws_iam_policy_document.allow_cf_access.json
}

data "aws_iam_policy_document" "allow_cf_access" {
  statement {
    sid     = "AllowCloudFrontAccess"
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = ["s3:GetObject"]

    resources = [
      "${aws_s3_bucket.web_frontend.arn}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.web_frontend_distribution.arn]
    }
  }
}

resource "aws_cloudfront_origin_access_control" "web_frontend_oac" {
  name                              = "web-frontend-oac"
  description                       = "OAC for CloudFront to access Web Frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "web_frontend_distribution" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.web_frontend.bucket_regional_domain_name
    origin_id   = "webFrontendS3Origin"

    origin_access_control_id = aws_cloudfront_origin_access_control.web_frontend_oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "webFrontendS3Origin"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = "dev"
  }
}

output "website_url" {
  value = "https://${aws_cloudfront_distribution.web_frontend_distribution.domain_name}"
}

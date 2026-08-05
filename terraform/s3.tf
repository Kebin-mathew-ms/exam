# S3 Bucket for Uploads (Profile photos, questions attachments, certificates, reports)
resource "aws_s3_bucket" "aegis_uploads" {
  bucket = var.s3_bucket_name

  tags = {
    Name        = "aegis-production-uploads"
    Environment = "Production"
  }
}

# Block Public Access configuration
resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket = aws_s3_bucket.aegis_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "encrypt" {
  bucket = aws_s3_bucket.aegis_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

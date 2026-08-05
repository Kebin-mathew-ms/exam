variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Deployment Region"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "VPC network IP range"
}

variable "db_password" {
  type        = string
  sensitive   = true
  default     = "ProdDBPassword123!"
  description = "Production Database User password"
}

variable "s3_bucket_name" {
  type        = string
  default     = "aegis-exam-production-uploads"
  description = "S3 bucket storage name"
}

# Subnet Group for RDS
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "aegis-rds-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_a.id, aws_subnet.private_subnet_b.id]
}

# Security Group for Database
resource "aws_security_group" "rds_sg" {
  name        = "aegis-rds-sg"
  description = "Allow DB traffic from EKS worker nodes"
  vpc_id      = aws_vpc.aegis_vpc.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS MySQL Instance
resource "aws_db_instance" "mysql_db" {
  identifier             = "aegis-production-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  db_name                = "examination_db"
  username               = "exam_user"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  multi_az               = true
}

# Subnet Group for Redis
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "aegis-redis-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_a.id, aws_subnet.private_subnet_b.id]
}

# Security Group for Redis
resource "aws_security_group" "redis_sg" {
  name        = "aegis-redis-sg"
  description = "Allow Cache traffic from EKS worker nodes"
  vpc_id      = aws_vpc.aegis_vpc.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Redis Cluster
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = "aegis-redis"
  replication_group_description = "Aegis ElastiCache Redis replication group"
  node_type                     = "cache.t3.micro"
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids            = [aws_security_group.redis_sg.id]
  automatic_failover_enabled    = true
  num_cache_clusters            = 2
}

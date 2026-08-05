# Disaster Recovery & System Operations Runbook

This document details the recovery plans, RDS database promotion steps, and EKS container rollback routines for the Aegis Online Examination System.

---

## 📈 RPO & RTO Targets

| Target Metric | Objective Time | Recovery Execution Strategy |
| :--- | :--- | :--- |
| **RPO (Recovery Point)** | **1 Hour** | Hourly transaction log backups pushed to encrypted Amazon S3 buckets. |
| **RTO (Recovery Time)** | **15 Minutes** | Multi-AZ RDS automatic DB replica promotion and EKS traffic routing. |

---

## 🛠️ Recovery Procedures

### 1. Database Replica Promotion (RDS Failover)
If the primary RDS MySQL instance experiences a hardware collapse:
1. Amazon RDS automatically detects the failure and promotes the standby database replica in a secondary Availability Zone.
2. Route53 dynamically maps the database CNAME to the new endpoint, maintaining system availability without requiring code changes.
3. In case of manual override, execute the AWS CLI command:
   ```bash
   aws rds reboot-db-instance --db-instance-identifier aegis-production-db --force-failover
   ```

### 2. S3 Storage Replication
To protect against regional outages:
- The `aegis-exam-production-uploads` bucket is configured with Cross-Region Replication (CRR) to a secondary destination (e.g., `us-west-2`).
- Server-Side Encryption using AWS KMS keys (SSE-KMS) is enabled to protect documents from tampering.

### 3. EKS Cluster Re-deployment & Image Rollbacks
If a buggy deployment slips past tests:
1. Roll back EKS backend pods instantly using Helm:
   ```bash
   helm rollback aegis-release
   ```
2. Or rollback specific deployment tags:
   ```bash
   kubectl rollout undo deployment/aegis-backend
   ```
3. To view rollout status:
   ```bash
   kubectl rollout status deployment/aegis-backend
   ```

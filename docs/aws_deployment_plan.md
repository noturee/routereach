# AWS Deployment Plan

Target: Production deployment on AWS (Phase 20)

## Architecture

```
Route 53 (DNS)
    └── ALB (Application Load Balancer)
         ├── ECS Fargate — Backend (Flask/Gunicorn, port 5000)
         └── CloudFront + S3 — Frontend (Vite build)

RDS PostgreSQL (Multi-AZ)
S3 (document uploads, report exports)
SES (email)
SNS → Twilio (SMS)
Secrets Manager (all .env secrets)
ECR (container images)
CloudWatch (logs + alarms)
```

## Containers

- **Backend**: `Dockerfile` in `backend/` — Gunicorn with 4 workers
- **Frontend**: `Dockerfile` in `frontend/` — Nginx serving the Vite build

## Environment Configuration

All secrets stored in AWS Secrets Manager:
- `DATABASE_URL` → RDS endpoint
- `JWT_SECRET_KEY`, `SECRET_KEY`
- `SENDGRID_API_KEY` or SES credentials
- `TWILIO_*` credentials
- `GOOGLE_MAPS_API_KEY`

## Deployment Steps (Phase 20)

1. Build Docker images → push to ECR
2. Create RDS PostgreSQL instance (Multi-AZ in production)
3. Run `flask db upgrade` against RDS
4. Seed database with `seed.sql`
5. Build Vite frontend → upload to S3
6. Create CloudFront distribution pointing to S3
7. Create ECS Fargate cluster → task definition → service
8. Attach ALB to ECS service
9. Point Route 53 DNS to ALB
10. Configure HTTPS certificate via ACM
11. Set up CloudWatch alarms for error rates and latency
12. Configure auto-scaling policy on ECS tasks

## Cost Estimate (small deployment)

| Service | Approximate Monthly Cost |
|---|---|
| ECS Fargate (2 tasks) | ~$15 |
| RDS t3.micro | ~$15 |
| ALB | ~$18 |
| S3 + CloudFront | ~$3 |
| **Total** | **~$51/month** |

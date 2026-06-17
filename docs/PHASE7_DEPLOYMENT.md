# Phase 7: Deploy to AWS ECS

**Prerequisites:**
- ✅ RDS PostgreSQL available
- ✅ S3 buckets created
- ✅ ECS cluster ready
- ✅ ALB configured
- ✅ Route 53 DNS set up
- ⏳ **REQUIRED:** Secrets Manager secret `routereach/production` created (see [ADMIN_SECRETS_SETUP.md](ADMIN_SECRETS_SETUP.md))

---

## Deployment Process

### Step 1: Get Network Configuration

Before deploying, collect the subnet and security group IDs:

```bash
# Get subnets (for ECS task placement)
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0a4bea5b5366c66e1" \
  --region us-east-1 \
  --query 'Subnets[0:2].SubnetId' \
  --output text

# Get RDS security group (to allow ECS → RDS)
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=routereach-db-sg" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

Example output:
```
SUBNET_IDS: subnet-09ef724b166cdc126,subnet-0d1f61745f12c6eae
SG_IDS: sg-021ec58918194279b
```

### Step 2: Set Environment Variables

```bash
export SUBNET_IDS="subnet-09ef724b166cdc126,subnet-0d1f61745f12c6eae"
export SG_IDS="sg-021ec58918194279b"
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="869935107658"
```

### Step 3: Configure Backend Task Definition

The `deploy/ecs-task-definition.json` references secrets from Secrets Manager. Verify the ARNs are correct:

```bash
# This should NOT error (verify secret exists)
aws secretsmanager get-secret-value \
  --secret-id routereach/production \
  --region us-east-1 \
  --query 'ARN' \
  --output text
```

### Step 4: Run Deployment Script

**First deployment (includes database migrations):**
```bash
cd /Users/charismadezonie/RouteReach
./deploy/deploy.sh --migrate
```

This script will:
1. ✅ Build backend Docker image (`backend/Dockerfile`)
2. ✅ Push image to ECR (`routereach-backend` repo)
3. ✅ Build frontend with Vite
4. ✅ Sync frontend to S3 (`routereachpro-frontend`)
5. ✅ Register ECS task definition
6. ✅ Create ECS service (if not exists)
7. ✅ Run `flask db upgrade` (database migrations)

**Subsequent deployments (no migrations):**
```bash
./deploy/deploy.sh
```

### Step 5: Monitor Deployment

Watch the ECS service come online:

```bash
# Watch service status
watch -n 5 'aws ecs describe-services \
  --cluster routereach-cluster \
  --services routereach-backend \
  --region us-east-1 \
  --query "services[0].[serviceName,status,runningCount,desiredCount]" \
  --output table'
```

Expected progression:
```
1. status=ACTIVE, runningCount=0, desiredCount=1  (launching)
2. status=ACTIVE, runningCount=1, desiredCount=1  (running)
```

### Step 6: Verify Deployment

Once `runningCount=1`:

```bash
# Check health of task
aws ecs describe-tasks \
  --cluster routereach-cluster \
  --tasks $(aws ecs list-tasks \
    --cluster routereach-cluster \
    --region us-east-1 \
    --query 'taskArns[0]' \
    --output text) \
  --region us-east-1 \
  --query 'tasks[0].[lastStatus,containers[0].[lastStatus,exitCode]]' \
  --output table

# Check logs
aws logs tail /ecs/routereach-backend --follow --region us-east-1
```

### Step 7: Test Application

Once the ECS task is healthy and target group shows healthy:

```bash
# Test via ALB DNS (HTTP, 502 until fully ready)
curl -v http://routereach-alb-1768776751.us-east-1.elb.amazonaws.com/api/health

# Test via domain (once DNS propagates, ~5 minutes)
curl -v http://routereachpro.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-06-17T04:00:00Z"
}
```

---

## Troubleshooting

### Issue: ECS Task fails to start

**Symptom:** `lastStatus=STOPPED`, container `exitCode=1`

**Check logs:**
```bash
aws logs tail /ecs/routereach-backend --follow --region us-east-1
```

**Common causes:**
- Secrets Manager secret not created → Check [ADMIN_SECRETS_SETUP.md](ADMIN_SECRETS_SETUP.md)
- Database not accessible → Check RDS security group allows ECS SG
- Image pull failed → Check ECR repository and authentication

### Issue: Health check failing (502 from ALB)

**Symptom:** Target group shows "Unhealthy"

**Check:**
1. Is ECS task running? `aws ecs describe-tasks ...`
2. Is backend responding? `aws logs tail /ecs/routereach-backend`
3. Is RDS accessible? Check database connection in logs

### Issue: Database migrations fail

**Symptom:** Task stops with "migration error" in logs

**Causes:**
- Schema conflict (migrations already applied)
- Database user doesn't exist
- Insufficient database permissions

**Fix:**
```bash
# Stop the service
aws ecs update-service \
  --cluster routereach-cluster \
  --service routereach-backend \
  --desired-count 0 \
  --region us-east-1

# Debug: Connect directly to RDS
psql postgresql://routereach_user:PASSWORD@ENDPOINT:5432/routereach

# Then run migrations manually and restart
./deploy/deploy.sh
```

---

## Post-Deployment Checklist

- [ ] ECS service is ACTIVE with 1 running task
- [ ] Target group health check is HEALTHY
- [ ] ALB responds to health check: `curl http://ALB_DNS/api/health`
- [ ] Frontend loads at `http://routereachpro.com` (may show loading while DNS propagates)
- [ ] Login page appears with OutreachRoute Pro logo
- [ ] Can authenticate with demo user
- [ ] Database logs show connections: `aws logs tail /ecs/routereach-backend`

---

## Rollback

If deployment fails, rollback to previous version:

```bash
# Get previous task definition
aws ecs describe-task-definition \
  --task-definition routereach-backend:1 \
  --region us-east-1

# Update service to use previous version
aws ecs update-service \
  --cluster routereach-cluster \
  --service routereach-backend \
  --task-definition routereach-backend:1 \
  --region us-east-1
```

---

## Next: Continuous Deployment

To automate future deployments:

1. Set up GitHub Actions workflow (trigger on push to `main` branch)
2. Authenticate to ECR and ECS
3. Run `./deploy/deploy.sh` automatically
4. See `.github/workflows/deploy.yml` for template (to be created)


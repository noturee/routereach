# Phase 7: Deploy to AWS ECS

## Current Status (June 17, 2026)

- Production backend is stable on task definition `routereach-backend:6`
- Service state: `ACTIVE`, `desired=1`, `running=1`, rollout `COMPLETED`
- API health: `https://api.routereachpro.com/api/health` returns `200`
- Frontend health: `https://routereachpro.com` returns `200`

Recent fixes applied:
- Removed duplicate report route endpoint declarations that caused Flask startup failure (`reports.by_status` collision)
- Updated container health check command to use Python stdlib HTTP probe (no curl dependency)

**Prerequisites:**
- ✅ RDS PostgreSQL available
- ✅ S3 buckets created
- ✅ ECS cluster ready
- ✅ ALB configured
- ✅ Route 53 DNS set up
- ✅ Secrets Manager secret `routereach/production` created

---

## Deployment Process

### Step 1: Create and wire the ECS app security group

Create a dedicated security group for the ECS tasks. Do not reuse the RDS security group as `SG_IDS`.

```bash
# Create ECS app security group
ECS_APP_SG=$(aws ec2 create-security-group \
  --group-name routereach-ecs-sg \
  --description "Security group for RouteReach ECS tasks" \
  --vpc-id vpc-0a4bea5b5366c66e1 \
  --region us-east-1 \
  --query 'GroupId' \
  --output text)

# Allow ALB -> ECS app on port 5000
aws ec2 authorize-security-group-ingress \
  --group-id "$ECS_APP_SG" \
  --protocol tcp \
  --port 5000 \
  --source-group sg-0165a6838d100afd6 \
  --region us-east-1

# Allow ECS app -> RDS by adding the ECS SG to the RDS SG inbound rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-021ec58918194279b \
  --protocol tcp \
  --port 5432 \
  --source-group "$ECS_APP_SG" \
  --region us-east-1
```

### Step 2: Get Network Configuration

Before deploying, collect the subnet and security group IDs:

```bash
# Get subnets (for ECS task placement)
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0a4bea5b5366c66e1" \
  --region us-east-1 \
  --query 'Subnets[0:2].SubnetId' \
  --output text

# Get ECS app security group (this is what SG_IDS should use)
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=routereach-ecs-sg" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

Example output:
```
SUBNET_IDS: subnet-09ef724b166cdc126,subnet-0d1f61745f12c6eae
SG_IDS: sg-09b93815d004de683
```

These subnets are public in the default VPC, so the deployment uses `assignPublicIp=ENABLED` for Fargate tasks.

### Step 3: Set Environment Variables

```bash
export SUBNET_IDS="subnet-09ef724b166cdc126,subnet-0d1f61745f12c6eae"
export SG_IDS="sg-09b93815d004de683"  # ECS app SG, not the RDS SG
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="869935107658"
```

### Step 4: Configure Backend Task Definition
`deploy/deploy.sh` ensures the backend ECR repository exists and creates it on first deploy when permitted.

The `deploy/ecs-task-definition.json` references secrets from Secrets Manager. Verify the ARNs are correct:

```bash
# This should NOT error (verify secret exists)
aws secretsmanager get-secret-value \
  --secret-id routereach/production \
  --region us-east-1 \
  --query 'ARN' \
  --output text
```

### Step 5: Run Deployment Script

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
6. ✅ Create ECS service on first deploy, or update it on later deploys
7. ✅ Run `flask db upgrade` (database migrations)

**Subsequent deployments (no migrations):**
```bash
./deploy/deploy.sh
```

### Step 6: Monitor Deployment

Watch the ECS service come online:

```bash
# Watch service status
watch -n 5 'aws ecs describe-services \
  --cluster routereach-cluster \
  --services routereach-backend-service \
  --region us-east-1 \
  --query "services[0].[serviceName,status,runningCount,desiredCount]" \
  --output table'
```

Expected progression:
```
1. status=ACTIVE, runningCount=0, desiredCount=1  (launching)
2. status=ACTIVE, runningCount=1, desiredCount=1  (running)
3. rolloutState=COMPLETED                           (stable)
```

### Step 7: Verify Deployment

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

### Step 8: Test Application

Once the ECS task is healthy and target group shows healthy:

```bash
# Test via ALB DNS (HTTP, 502 until fully ready)
curl -v http://routereach-alb-1768776751.us-east-1.elb.amazonaws.com/api/health

# Test API domain (preferred)
curl -v https://api.routereachpro.com/api/health

# Test frontend domain
curl -I https://routereachpro.com
```

Expected response:
```json
{
  "status": "ok",
  "app": "OutreachRoute Pro",
  "version": "1.0.0"
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
4. Confirm task definition health check command does not rely on curl in slim image

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
  --service routereach-backend-service \
  --desired-count 0 \
  --region us-east-1

# Debug: Connect directly to RDS
psql postgresql://routereach_user:PASSWORD@ENDPOINT:5432/routereach

# Then run migrations manually and restart
./deploy/deploy.sh
```

---

## Post-Deployment Checklist

- [x] ECS service is ACTIVE with 1 running task
- [x] Target group health check is HEALTHY
- [x] API responds: `curl https://api.routereachpro.com/api/health`
- [x] Frontend responds: `curl -I https://routereachpro.com`
- [ ] Login page appears with OutreachRoute Pro logo
- [ ] Can authenticate with demo user
- [ ] Database logs show expected connections: `aws logs tail /ecs/routereach-backend`

---

## Rollback

If deployment fails, rollback to previous version:

```bash
# List recent task definition revisions (newest first)
aws ecs list-task-definitions \
  --family-prefix routereach-backend \
  --sort DESC \
  --max-items 5 \
  --region us-east-1

# Update service to use a selected previous revision
aws ecs update-service \
  --cluster routereach-cluster \
  --service routereach-backend-service \
  --task-definition routereach-backend:<PREVIOUS_REVISION> \
  --region us-east-1
```

---

## Next: Continuous Deployment

To automate future deployments:

1. Set up GitHub Actions workflow (trigger on push to `main` branch)
2. Authenticate to ECR and ECS
3. Run `./deploy/deploy.sh` automatically
4. See `.github/workflows/deploy.yml` for template (to be created)


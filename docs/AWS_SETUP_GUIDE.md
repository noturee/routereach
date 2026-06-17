# AWS Deployment Setup Guide — RouteReach Pro

**Your AWS Account:** `869935107658`  
**Region:** `us-east-1`  
**Domain:** `routereachpro.com`

---

## Phase 1: Prerequisites ✓
- [x] AWS Account created
- [x] AWS CLI v2 installed
- [x] IAM user credentials configured (Noturee)
- [x] Docker installed locally
- [x] Node.js 20+ installed

**Next:** Move to Phase 2 (Database)

---

## Phase 2: Create RDS PostgreSQL Database

### Step 2.1: Create security group (CLI)

```bash
# Create a security group for RDS
aws ec2 create-security-group \
  --group-name routereach-db-sg \
  --description "Security group for RouteReach PostgreSQL RDS" \
  --region us-east-1

# Save the security group ID (sg-xxxxx) for use in steps below
SG_ID="sg-xxxxx"  # Replace with actual ID from output above

# Allow PostgreSQL (port 5432) from your IP and ECS cluster
# First, get your current IP:
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "Your IP: $MY_IP"

# Allow from your local IP (for testing)
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 5432 \
  --cidr "$MY_IP/32" \
  --region us-east-1

# Allow from ECS (we'll add this later with the cluster SG)
```

### Step 2.2: Create RDS PostgreSQL instance (Console or CLI)

**Via Console (recommended for first-time):**
1. Go to AWS Console → **RDS** → **Databases**
2. Click **Create Database**
3. Configure:
   - **Engine:** PostgreSQL 15 (or latest)
   - **DB instance identifier:** `routereach-prod`
   - **Username:** `routereach_user`
   - **Password:** Generate strong password (save to temp file)
   - **DB instance class:** `db.t3.micro` (free tier eligible; $15/mo prod)
   - **Allocated storage:** 20 GB
   - **Multi-AZ:** Yes (production)
   - **VPC:** Default VPC
   - **Security group:** Select `routereach-db-sg` (from Step 2.1)
   - **Database name:** `routereach`
   - **Backup:** Enable, retention 7 days
   - **Encryption:** Enabled

4. Click **Create Database** (takes ~5 minutes)

### Step 2.3: Note the database endpoint

Once created, click on the database instance and copy the **Endpoint** (e.g., `routereach-prod.xxxxx.us-east-1.rds.amazonaws.com:5432`)

You'll need this for the connection string later.

---

## Phase 3: Create Storage & Container Registry

### Step 3.1: Create S3 bucket for frontend

```bash
# Frontend static assets bucket
aws s3api create-bucket \
  --bucket routereachpro-frontend \
  --region us-east-1
  
# Enable versioning for rollbacks
aws s3api put-bucket-versioning \
  --bucket routereachpro-frontend \
  --versioning-configuration Status=Enabled
  
# Block public access (CloudFront will serve it)
aws s3api put-public-access-block \
  --bucket routereachpro-frontend \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Step 3.2: Create S3 bucket for applicant uploads

```bash
# Applicant documents & report exports
aws s3api create-bucket \
  --bucket routereach-uploads-prod \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket routereach-uploads-prod \
  --versioning-configuration Status=Enabled
  
# Block public (ECS task will access via IAM role)
aws s3api put-public-access-block \
  --bucket routereach-uploads-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Step 3.3: Create ECR repository for backend Docker image

```bash
# The deploy.sh script will create this automatically,
# but you can create it manually:
aws ecr create-repository \
  --repository-name routereach-backend \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Save the repository URI (e.g., 869935107658.dkr.ecr.us-east-1.amazonaws.com/routereach-backend)
```

---

## Phase 4: Create ECS Cluster & IAM Roles

### Step 4.1: Create IAM role for ECS task execution

```bash
# Create trust policy JSON
cat > /tmp/ecs-task-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-task-trust-policy.json

# Attach the standard execution role policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### Step 4.2: Create IAM role for ECS task (application permissions)

```bash
# Create task role (for app to access AWS services)
aws iam create-role \
  --role-name routereach-task-role \
  --assume-role-policy-document file:///tmp/ecs-task-trust-policy.json

# Create policy for S3 + SES + Secrets Manager access
cat > /tmp/routereach-task-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::routereach-uploads-prod/*",
        "arn:aws:s3:::routereach-uploads-prod"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:869935107658:secret:routereach/production*"
    }
  ]
}
EOF

# Attach the custom policy
aws iam put-role-policy \
  --role-name routereach-task-role \
  --policy-name routereach-task-policy \
  --policy-document file:///tmp/routereach-task-policy.json
```

### Step 4.3: Create ECS Cluster

```bash
# Create the cluster
aws ecs create-cluster \
  --cluster-name routereach-cluster \
  --region us-east-1

# Optional: Enable container insights for monitoring
aws ecs update-cluster-settings \
  --cluster routereach-cluster \
  --settings name=containerInsights,value=enabled \
  --region us-east-1
```

---

## Phase 5: Create Secrets in Secrets Manager

### Step 5.1: Generate secure secrets

```bash
# Generate SECRET_KEY and JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))" > /tmp/secret_key.txt
python3 -c "import secrets; print(secrets.token_hex(32))" > /tmp/jwt_secret.txt

cat /tmp/secret_key.txt
cat /tmp/jwt_secret.txt
```

### Step 5.2: Create secret in Secrets Manager

```bash
# Create the secret with all production environment variables
# Replace the values below with your actual configuration
aws secretsmanager create-secret \
  --name routereach/production \
  --description "Production secrets for RouteReach Pro" \
  --secret-string '{
    "DATABASE_URL": "postgresql://routereach_user:YOUR_DB_PASSWORD@routereach-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/routereach",
    "SECRET_KEY": "YOUR_SECRET_KEY_FROM_ABOVE",
    "JWT_SECRET_KEY": "YOUR_JWT_SECRET_FROM_ABOVE",
    "CORS_ORIGINS": "https://routereachpro.com",
    "SENDGRID_API_KEY": "YOUR_SENDGRID_KEY",
    "FROM_EMAIL": "no-reply@routereachpro.com",
    "TWILIO_ACCOUNT_SID": "YOUR_TWILIO_SID",
    "TWILIO_AUTH_TOKEN": "YOUR_TWILIO_TOKEN",
    "TWILIO_PHONE_NUMBER": "+12025551234",
    "GOOGLE_MAPS_API_KEY": "YOUR_GOOGLE_MAPS_KEY"
  }' \
  --region us-east-1
```

**Next step:** Go to Phase 6 (Load Balancer & Route 53)

---

## Phase 6: Create ALB & Route 53 DNS

### Step 6.1: Create Application Load Balancer

**Via Console** (easier):
1. Go to **EC2** → **Load Balancers**
2. Click **Create Load Balancer** → **Application Load Balancer**
3. Configure:
   - **Name:** `routereach-alb`
   - **Scheme:** Internet-facing
   - **VPC:** Default VPC
   - **Subnets:** Select 2+ public subnets
   - **Security Groups:** Create new or select one that allows HTTP/HTTPS
4. Add listener:
   - **Port 80:** Forward to new target group
5. Create target group:
   - **Name:** `routereach-backend`
   - **Target type:** IP
   - **Port:** 5000
   - **Health check path:** `/api/health`
6. Click **Create**

**Save the ALB DNS name** (e.g., `routereach-alb-1234567890.us-east-1.elb.amazonaws.com`)

### Step 6.2: Request SSL certificate (ACM)

```bash
# Request a certificate for your domain
aws acm request-certificate \
  --domain-name routereachpro.com \
  --subject-alternative-names "www.routereachpro.com" "api.routereachpro.com" \
  --region us-east-1

# You'll need to validate ownership via email or DNS
```

### Step 6.3: Update ALB HTTPS listener (after certificate is validated)

1. In the ALB, add a listener for **Port 443 (HTTPS)**
2. Use the certificate from ACM
3. Forward to the target group from Step 6.1

---

## Phase 7: Deploy the Application

### Step 7.1: Set environment variables

```bash
export AWS_REGION="us-east-1"
export ACCOUNT_ID="869935107658"
export VITE_API_BASE_URL="https://api.routereachpro.com"  # or your ALB URL initially
export SUBNET_IDS="subnet-xxxxx,subnet-yyyyy"  # Get from VPC console
export SG_IDS="sg-zzzzz"  # Security group for ECS tasks
```

### Step 7.2: Run the deployment script

```bash
cd /Users/charismadezonie/RouteReach

# First deployment (with database migration)
SUBNET_IDS="$SUBNET_IDS" SG_IDS="$SG_IDS" ./deploy/deploy.sh --migrate

# Subsequent deployments (no migration)
./deploy/deploy.sh
```

The script will:
1. Login to ECR
2. Build backend Docker image
3. Push to ECR
4. Build frontend with Vite
5. Sync frontend to S3
6. Register ECS task definition
7. Update ECS service → rolling deploy

---

## Verification Checklist

- [ ] RDS database is accessible from your IP
- [ ] S3 buckets are created and versioning enabled
- [ ] ECR repository created
- [ ] IAM roles attached (execution + task)
- [ ] ECS cluster created
- [ ] Secrets Manager secret created
- [ ] ALB created and health checks passing
- [ ] SSL certificate validated in ACM
- [ ] `./deploy/deploy.sh --migrate` completed successfully
- [ ] ECS service is running (check AWS Console)
- [ ] Frontend is served from CloudFront/S3
- [ ] Backend API responds to requests

---

## Cost Estimate (Small Production Setup)

| Service | Monthly Cost |
|---|---|
| ECS Fargate (2 tasks, 0.5 vCPU / 1 GB each) | $15 |
| RDS db.t3.micro (Multi-AZ) | $15 |
| Application Load Balancer | $18 |
| NAT Gateway (if needed) | $32 |
| S3 + CloudFront (low traffic) | $3 |
| **Total** | **~$83/month** |

---

## Troubleshooting

**Q: ECS task won't start**
- Check CloudWatch Logs: `aws logs tail /ecs/routereach-backend --follow`
- Verify security groups allow communication
- Check secrets are accessible: `aws secretsmanager get-secret-value --secret-id routereach/production`

**Q: Database connection fails**
- Verify RDS security group allows port 5432 from ECS SG
- Test locally: `psql postgresql://user:pass@rds-endpoint:5432/routereach`

**Q: S3 deployment fails**
- Check S3 bucket permissions: `aws s3 ls routereachpro-frontend`
- Verify IAM user has S3 permissions

---

**Ready to proceed?** Let me know which phase you'd like to start with, and I'll guide you through each step with exact commands.

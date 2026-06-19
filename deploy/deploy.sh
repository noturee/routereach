#!/usr/bin/env bash
# ── RouteReach — AWS Deployment Script ────────────────────────────────────
# Usage:
#   ./deploy/deploy.sh              # build + deploy (backend ECR + frontend S3)
#   ./deploy/deploy.sh --migrate    # also run Flask DB migrations before deploy
#
# Prerequisites:
#   - AWS CLI v2 installed and authenticated (aws configure)
#   - Docker installed and running
#   - Node.js 20+ installed
#   - jq installed (brew install jq)

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
ACCOUNT_ID="869935107658"
REGION="us-east-1"
APP_NAME="routereach"

ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-backend"
S3_BUCKET="${APP_NAME}pro-frontend"          # routereachpro-frontend
ECS_CLUSTER="${APP_NAME}-cluster"
ECS_SERVICE="${APP_NAME}-backend-service"
TASK_FAMILY="${APP_NAME}-backend"
TARGET_GROUP_NAME="${APP_NAME}-backend"
CONTAINER_NAME="backend"
CONTAINER_PORT="5000"
DESIRED_COUNT="${DESIRED_COUNT:-1}"
ECS_ASSIGN_PUBLIC_IP="${ECS_ASSIGN_PUBLIC_IP:-ENABLED}"

# Fill this in after creating your CloudFront distribution
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

# API URL injected into the Vite build
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.routereachpro.com/api}"
VITE_GOOGLE_MAPS_API_KEY="${VITE_GOOGLE_MAPS_API_KEY:-}"

# Image tag — default to short git SHA. If the working tree is dirty, append
# a timestamp so ECS does not reuse a stale mutable tag for local-only changes.
if [[ -n "${IMAGE_TAG:-}" ]]; then
  IMAGE_TAG="$IMAGE_TAG"
else
  BASE_IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
  if git diff --quiet HEAD -- 2>/dev/null && git diff --cached --quiet -- 2>/dev/null; then
    IMAGE_TAG="$BASE_IMAGE_TAG"
  else
    IMAGE_TAG="${BASE_IMAGE_TAG}-dirty-$(date '+%Y%m%d%H%M%S')"
  fi
fi

# Script directory (repo root is one level up)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Flags ──────────────────────────────────────────────────────────────────
RUN_MIGRATE=false
for arg in "$@"; do
  [[ "$arg" == "--migrate" ]] && RUN_MIGRATE=true
done

# ── Helpers ────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }
need() { command -v "$1" &>/dev/null || die "'$1' is required but not installed."; }

need aws
need docker
need node
need npm
need jq

# ── 1. Authenticate Docker with ECR ───────────────────────────────────────
log "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin \
    "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Ensure the ECR repository exists
aws ecr describe-repositories --repository-names "${APP_NAME}-backend" \
    --region "$REGION" &>/dev/null \
  || aws ecr create-repository --repository-name "${APP_NAME}-backend" \
       --region "$REGION" \
       --image-scanning-configuration scanOnPush=true \
       --encryption-configuration encryptionType=AES256 \
     | jq -r '.repository.repositoryUri'

# ── 2. Build and push backend Docker image ────────────────────────────────
log "Building backend image (tag: ${IMAGE_TAG})..."
docker build \
  --platform linux/amd64 \
  -t "${ECR_REPO}:${IMAGE_TAG}" \
  -t "${ECR_REPO}:latest" \
  "$ROOT_DIR/backend"

log "Pushing backend image..."
docker push "${ECR_REPO}:${IMAGE_TAG}"
docker push "${ECR_REPO}:latest"

# ── 3. Build frontend and sync to S3 ──────────────────────────────────────
log "Building frontend (VITE_API_BASE_URL=${VITE_API_BASE_URL})..."
(
  cd "$ROOT_DIR/frontend"
  npm ci --prefer-offline
  VITE_API_BASE_URL="$VITE_API_BASE_URL" \
  VITE_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY" \
  npm run build
)

# Ensure S3 bucket exists
aws s3api head-bucket --bucket "$S3_BUCKET" --region "$REGION" 2>/dev/null \
  || aws s3api create-bucket --bucket "$S3_BUCKET" --region "$REGION"

log "Syncing frontend to s3://${S3_BUCKET}..."

# Upload hashed assets with long cache
aws s3 sync "$ROOT_DIR/frontend/dist/" "s3://${S3_BUCKET}/" \
  --delete \
  --exclude "index.html" \
  --cache-control "max-age=31536000,public,immutable"

# Upload index.html with no-cache so new deployments are picked up immediately
aws s3 cp "$ROOT_DIR/frontend/dist/index.html" "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

# Invalidate CloudFront cache (skip if distribution ID not set)
if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
  log "Invalidating CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID}..."
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --region "$REGION" \
    | jq -r '.Invalidation.Id'
else
  log "CLOUDFRONT_DISTRIBUTION_ID not set — skipping cache invalidation."
fi

# ── 4. (Optional) Run database migrations ─────────────────────────────────
if [[ "$RUN_MIGRATE" == "true" ]]; then
  log "Running database migrations via ECS one-off task..."

  SUBNET_IDS="${SUBNET_IDS:-}"
  SG_IDS="${SG_IDS:-}"

  [[ -z "$SUBNET_IDS" ]] && die "Set SUBNET_IDS env var before running --migrate (comma-separated subnet IDs)"
  [[ -z "$SG_IDS"    ]] && die "Set SG_IDS env var before running --migrate (security group ID)"

  # Always run migrations with the image built in this deployment.
  # Using the task family alone can pick an older revision and skip new migrations.
  MIGRATION_TASK_DEF_FILE="$(mktemp)"
  jq \
    --arg image "${ECR_REPO}:${IMAGE_TAG}" \
    '.containerDefinitions[0].image = $image' \
    "$SCRIPT_DIR/ecs-task-definition.json" > "$MIGRATION_TASK_DEF_FILE"

  TASK_DEF_TO_RUN=$(aws ecs register-task-definition \
    --cli-input-json "file://${MIGRATION_TASK_DEF_FILE}" \
    --region "$REGION" \
    | jq -r '.taskDefinition.taskDefinitionArn')

  rm -f "$MIGRATION_TASK_DEF_FILE"
  log "Registered migration task definition: ${TASK_DEF_TO_RUN}"

  TASK_ARN=$(aws ecs run-task \
    --cluster "$ECS_CLUSTER" \
    --task-definition "$TASK_DEF_TO_RUN" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_IDS}],assignPublicIp=${ECS_ASSIGN_PUBLIC_IP}}" \
    --overrides "{\"containerOverrides\":[{\"name\":\"${CONTAINER_NAME}\",\"command\":[\"sh\",\"scripts/ecs_migrate.sh\"]}]}" \
    --region "$REGION" \
    | jq -r '.tasks[0].taskArn')

  log "Migration task started: ${TASK_ARN}"
  log "Waiting for migration task to complete..."

  aws ecs wait tasks-stopped \
    --cluster "$ECS_CLUSTER" \
    --tasks "$TASK_ARN" \
    --region "$REGION"

  EXIT_CODE=$(aws ecs describe-tasks \
    --cluster "$ECS_CLUSTER" \
    --tasks "$TASK_ARN" \
    --region "$REGION" \
    | jq -r '.tasks[0].containers[0].exitCode')

  if [[ "$EXIT_CODE" != "0" ]]; then
    STOP_REASON=$(aws ecs describe-tasks \
      --cluster "$ECS_CLUSTER" \
      --tasks "$TASK_ARN" \
      --region "$REGION" \
      | jq -r '.tasks[0].stoppedReason // "Unknown ECS stop reason"')
    die "Migration task exited with code ${EXIT_CODE}. ECS reason: ${STOP_REASON}"
  fi
  log "Migrations completed successfully."
fi

# ── 5. Register new ECS task definition revision ──────────────────────────
log "Registering ECS task definition with image ${IMAGE_TAG}..."

TASK_DEF_FILE="$(mktemp)"
jq \
  --arg image "${ECR_REPO}:${IMAGE_TAG}" \
  '.containerDefinitions[0].image = $image' \
  "$SCRIPT_DIR/ecs-task-definition.json" > "$TASK_DEF_FILE"

NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
      --cli-input-json "file://${TASK_DEF_FILE}" \
      --region "$REGION" \
  | jq -r '.taskDefinition.taskDefinitionArn')

rm -f "$TASK_DEF_FILE"

log "Registered: ${NEW_TASK_DEF_ARN}"

# ── 6. Create or update ECS service ───────────────────────────────────────
SUBNET_IDS="${SUBNET_IDS:-}"
SG_IDS="${SG_IDS:-}"

[[ -z "$SUBNET_IDS" ]] && die "Set SUBNET_IDS env var before deploying (comma-separated subnet IDs)"
[[ -z "$SG_IDS"    ]] && die "Set SG_IDS env var before deploying (comma-separated ECS app security group IDs)"

TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names "$TARGET_GROUP_NAME" \
  --region "$REGION" \
  | jq -r '.TargetGroups[0].TargetGroupArn')

[[ -n "$TARGET_GROUP_ARN" && "$TARGET_GROUP_ARN" != "null" ]] || die "Target group ${TARGET_GROUP_NAME} not found"

SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$REGION" \
  | jq -r '.services | length')

if [[ "$SERVICE_EXISTS" == "0" ]]; then
  log "Creating ECS service ${ECS_SERVICE}..."
  aws ecs create-service \
    --cluster "$ECS_CLUSTER" \
    --service-name "$ECS_SERVICE" \
    --task-definition "$NEW_TASK_DEF_ARN" \
    --desired-count "$DESIRED_COUNT" \
    --launch-type FARGATE \
    --health-check-grace-period-seconds 90 \
    --load-balancers "targetGroupArn=${TARGET_GROUP_ARN},containerName=${CONTAINER_NAME},containerPort=${CONTAINER_PORT}" \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_IDS}],assignPublicIp=${ECS_ASSIGN_PUBLIC_IP}}" \
    --region "$REGION" \
    | jq -r '.service.serviceName'
else
  log "Updating ECS service ${ECS_SERVICE}..."
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --task-definition "$NEW_TASK_DEF_ARN" \
    --force-new-deployment \
    --region "$REGION" \
    | jq -r '.service.deployments[] | "\(.status): \(.desiredCount) desired, \(.runningCount) running"'
fi

log "Deployment initiated. Monitor progress:"
log "  https://console.aws.amazon.com/ecs/v2/clusters/${ECS_CLUSTER}/services/${ECS_SERVICE}"
log ""
log "Done. Image: ${ECR_REPO}:${IMAGE_TAG}"

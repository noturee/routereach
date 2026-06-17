# AWS Secrets Manager Setup — Admin Instructions

**Status:** Completed in production; use this runbook for secret rotation or environment rebuilds  
**Permissions Required:** `secretsmanager:CreateSecret`

---

## Instructions for Admin

### Step 1: Go to AWS Secrets Manager

1. Navigate to **AWS Console** → **Secrets Manager**
2. Click **"Store a new secret"**

### Step 2: Configure Secret

**Select secret type:**
- Choose **"Other type of secret"**

**Key/value pairs:**
Add the following key-value pairs (copy-paste from the JSON below):

```json
{
  "DATABASE_URL": "postgresql://routereach_user:<DB_PASSWORD>@routereach-prod.chwmymsk897f.us-east-1.rds.amazonaws.com:5432/routereach",
  "SECRET_KEY": "generate_a_random_32_byte_hex_string_here",
  "JWT_SECRET_KEY": "generate_another_random_32_byte_hex_string_here",
  "CORS_ORIGINS": "https://routereachpro.com",
  "SENDGRID_API_KEY": "SG.your-sendgrid-api-key-here",
  "FROM_EMAIL": "no-reply@routereachpro.com",
  "TWILIO_ACCOUNT_SID": "ACyour-twilio-sid-here",
  "TWILIO_AUTH_TOKEN": "your-twilio-auth-token-here",
  "TWILIO_PHONE_NUMBER": "+12025551234",
  "GOOGLE_MAPS_API_KEY": "your-google-maps-api-key-here"
}
```

Twilio mapping for this app:
- `TWILIO_ACCOUNT_SID` must be your Twilio Account SID and typically starts with `AC...`
- `TWILIO_AUTH_TOKEN` must be the Twilio auth token associated with that account SID
- `TWILIO_PHONE_NUMBER` must be your Twilio sending number in E.164 format, for example `+16075551234`
- A Twilio API key SID starting with `SK...` is not used by this codebase and should not be entered in any of these fields

### Step 3: Generate SECRET_KEY and JWT_SECRET_KEY

For the two `*_SECRET` fields, generate random hex strings:

**Option A: In AWS Console**
- Copy-paste any 64-character hex string (32 bytes)
- Example: `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1`

**Option B: Generate via CLI (admin's local machine)**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Use the output for both `SECRET_KEY` and `JWT_SECRET_KEY`.

### Step 4: Fill in External API Keys

Replace these placeholders with **actual keys** from your services:

| Field | Source | Example |
|-------|--------|---------|
| `SENDGRID_API_KEY` | SendGrid dashboard | `SG.xxxxx...` |
| `TWILIO_ACCOUNT_SID` | Twilio console | `ACxxxxx...` |
| `TWILIO_AUTH_TOKEN` | Twilio console | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+12025551234` |
| `GOOGLE_MAPS_API_KEY` | Google Cloud console | (API key) |

Important:
- Do not put a Twilio API key SID like `SK...` into `TWILIO_ACCOUNT_SID`
- Do not put the Account SID like `AC...` into `TWILIO_AUTH_TOKEN`

### Step 5: Name the Secret

- **Secret name:** `routereach/production`
- **Description:** "Production secrets for RouteReach Pro"

### Step 6: Review and Create

1. Scroll to bottom
2. Click **"Store secret"**
3. Confirm: Secret appears in Secrets Manager list

---

## Verification

Once created, run this command to verify:
```bash
aws secretsmanager get-secret-value \
  --secret-id routereach/production \
  --region us-east-1
```

Output should show all 10 key-value pairs.

---

## Next Step

After creating or rotating this secret, notify the dev team to run:

```bash
cd /Users/charismadezonie/RouteReach
./deploy/deploy.sh --migrate
```

This will:
1. Build backend Docker image
2. Push to ECR
3. Build frontend with Vite
4. Upload frontend to S3
5. Register ECS task definition
6. Create ECS service
7. Run database migrations

---

## Troubleshooting

**Q: Secret creation fails with "AccessDeniedException"**  
A: The admin user must have `secretsmanager:CreateSecret` permission.

**Q: How do I know which API keys to use?**  
A: See [docs/product_requirements.md](product_requirements.md) for integrations section, or contact the product owner for credentials.

**Q: Can I use different values?**  
A: Yes, except for `DATABASE_URL` which is fixed to the RDS endpoint. All other values can be customized based on your configuration.

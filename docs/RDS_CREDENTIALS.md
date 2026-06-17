# RouteReach RDS Database Credentials

**Status:** Creating (will be ready in ~5 minutes)

## Database Details

- **DB Instance:** `routereach-prod`
- **Engine:** PostgreSQL 15.18
- **Instance Class:** db.t3.micro (free tier eligible)
- **Storage:** 20 GB (gp3)
- **Multi-AZ:** Enabled (production)
- **Encryption:** Enabled

## Connection Details

**Master Username:** `routereach_user`

**Master Password:** `U2W2oArxjiSRKx5oieGBhUhYuTxpQZwe`

**Database Name:** `routereach`

**Security Group:** `sg-021ec58918194279b`

**Endpoint:** `routereach-prod.chwmymsk897f.us-east-1.rds.amazonaws.com`

**Connection String:** 
```
postgresql://routereach_user:U2W2oArxjiSRKx5oieGBhUhYuTxpQZwe@routereach-prod.chwmymsk897f.us-east-1.rds.amazonaws.com:5432/routereach
```

---

## Status

Database is currently **modifying** (final configuration step before becoming available, ~1-2 min remaining).

## Next Steps

1. Database will transition to **available** state shortly
2. You can test connection once available with:
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier routereach-prod \
     --region us-east-1 \
     --query 'DBInstances[0].Endpoint.Address' \
     --output text
   ```

3. **Connection String** (for Secrets Manager later):
   ```
   postgresql://routereach_user:U2W2oArxjiSRKx5oieGBhUhYuTxpQZwe@<ENDPOINT>:5432/routereach
   ```

4. **Test connection** (after endpoint is ready):
   ```bash
   psql postgresql://routereach_user:U2W2oArxjiSRKx5oieGBhUhYuTxpQZwe@<ENDPOINT>:5432/routereach
   ```

---

## AWS Console Links

- **RDS Console:** https://console.aws.amazon.com/rds/home?region=us-east-1#databases:
- **EC2 Security Groups:** https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#SecurityGroups:
- **CloudWatch Logs:** https://console.aws.amazon.com/logs/home?region=us-east-1

---

**Save this file!** You'll need these credentials for:
- AWS Secrets Manager (Phase 5)
- Local testing & debugging
- Database backups & maintenance

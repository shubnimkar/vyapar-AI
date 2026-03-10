# Vyapar AI - EC2 Deployment Guide

Complete guide to deploy Vyapar AI on AWS EC2 with Nginx reverse proxy.

## Prerequisites

- ✅ EC2 instance running (Ubuntu 20.04/22.04 recommended)
- ✅ Repository cloned
- ✅ Nginx installed
- ✅ Domain name (optional, can use IP address)
- ✅ AWS credentials configured

## Quick Deployment

```bash
# Run the automated deployment script
chmod +x scripts/deploy-to-ec2.sh
./scripts/deploy-to-ec2.sh
```

## Manual Deployment Steps

### 1. Install Node.js and npm

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

### 2. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 3. Setup Application

```bash
# Navigate to your app directory
cd /path/to/vyapar-ai

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit environment variables
nano .env.local
```

### 4. Configure Environment Variables

Edit `.env.local` with your production values:

```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_TABLE_NAME=vyapar-ai
S3_BUCKET_NAME=vyapar-ai-uploads

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
PORT=3000
```

### 5. Build the Application

```bash
# Build Next.js production bundle
npm run build

# Test the build locally
npm start
```

### 6. Setup PM2

```bash
# Start the application with PM2
pm2 start npm --name "vyapar-ai" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command output instructions

# Check application status
pm2 status
pm2 logs vyapar-ai
```

### 7. Configure Nginx

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/vyapar-ai
```

Add the following configuration:

```nginx
# Vyapar AI - Nginx Configuration

# Redirect HTTP to HTTPS (after SSL setup)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # For Let's Encrypt SSL certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Client body size limit (for file uploads)
    client_max_body_size 10M;
    
    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
    
    # Public files
    location /public {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/vyapar-ai /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 8. Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 9. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 10. Setup Monitoring and Logs

```bash
# View PM2 logs
pm2 logs vyapar-ai

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Setup PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] PM2 installed and configured
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env.local`)
- [ ] Application built (`npm run build`)
- [ ] PM2 process running (`pm2 status`)
- [ ] Nginx configured and running
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall configured
- [ ] DNS pointing to EC2 IP (if using domain)
- [ ] AWS credentials working
- [ ] DynamoDB accessible
- [ ] S3 bucket accessible
- [ ] Bedrock API accessible

## Testing Deployment

```bash
# Test local application
curl http://localhost:3000

# Test through Nginx
curl http://your-domain.com

# Test HTTPS (if configured)
curl https://your-domain.com

# Test API endpoints
curl https://your-domain.com/api/health

# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx
```

## Common Issues and Solutions

### Issue 1: Port 3000 already in use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Restart PM2
pm2 restart vyapar-ai
```

### Issue 2: Nginx 502 Bad Gateway

```bash
# Check if Next.js is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart vyapar-ai
sudo systemctl restart nginx
```

### Issue 3: Environment variables not loading

```bash
# Check .env.local exists
ls -la .env.local

# Restart PM2 with environment file
pm2 restart vyapar-ai --update-env

# Or delete and recreate PM2 process
pm2 delete vyapar-ai
pm2 start npm --name "vyapar-ai" -- start
```

### Issue 4: Build fails

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Issue 5: AWS credentials not working

```bash
# Test AWS credentials
aws sts get-caller-identity

# Check environment variables
pm2 env 0

# Update credentials in .env.local
nano .env.local

# Restart application
pm2 restart vyapar-ai --update-env
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart PM2
pm2 restart vyapar-ai

# Check logs
pm2 logs vyapar-ai
```

## Rollback Procedure

```bash
# Go back to previous commit
git log --oneline  # Find commit hash
git checkout <commit-hash>

# Rebuild and restart
npm install
npm run build
pm2 restart vyapar-ai
```

## Performance Optimization

### Enable Nginx Caching

```nginx
# Add to nginx configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
}
```

### PM2 Cluster Mode

```bash
# Start in cluster mode (use all CPU cores)
pm2 start npm --name "vyapar-ai" -i max -- start

# Or specify number of instances
pm2 start npm --name "vyapar-ai" -i 2 -- start
```

## Monitoring and Maintenance

```bash
# Setup PM2 monitoring dashboard
pm2 install pm2-server-monit

# View real-time monitoring
pm2 monit

# Check disk space
df -h

# Check memory usage
free -m

# Check CPU usage
top

# Setup automated backups (DynamoDB)
# Use AWS Backup or DynamoDB Point-in-Time Recovery
```

## Security Best Practices

1. **Keep system updated**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

2. **Use environment variables for secrets**
   - Never commit `.env.local` to git
   - Use AWS Secrets Manager for production

3. **Enable AWS CloudWatch**
   - Monitor application logs
   - Set up alarms for errors

4. **Regular backups**
   - Enable DynamoDB Point-in-Time Recovery
   - Backup S3 bucket regularly

5. **Use IAM roles instead of access keys**
   - Attach IAM role to EC2 instance
   - Remove AWS credentials from `.env.local`

## Support

For issues or questions:
- Check logs: `pm2 logs vyapar-ai`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check application status: `pm2 status`
- Verify AWS connectivity: `aws sts get-caller-identity`

---

**Deployment Status**: Ready for production  
**Last Updated**: March 2024  
**Recommended Instance**: t3.medium or larger  
**Recommended OS**: Ubuntu 22.04 LTS

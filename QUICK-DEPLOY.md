# Quick Deployment Guide

Fast deployment instructions for Vyapar AI on EC2.

## Prerequisites

- EC2 instance running Ubuntu 20.04/22.04
- Repository cloned
- Nginx installed

## One-Command Deployment

```bash
chmod +x scripts/deploy-to-ec2.sh && ./scripts/deploy-to-ec2.sh
```

## Manual Quick Steps

### 1. Install Node.js & PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. Setup Application

```bash
cd /path/to/vyapar-ai
npm install
cp .env.local.example .env.local
nano .env.local  # Edit with your values
npm run build
```

### 3. Start with PM2

```bash
pm2 start npm --name "vyapar-ai" -- start
pm2 save
pm2 startup
```

### 4. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/vyapar-ai
```

Paste this configuration (replace `your-domain.com`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/vyapar-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 6. Setup SSL (Optional)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Verify Deployment

```bash
# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Test application
curl http://localhost:3000
curl http://your-domain.com
```

## Common Commands

```bash
# View logs
pm2 logs vyapar-ai

# Restart application
pm2 restart vyapar-ai

# Update application
git pull
npm install
npm run build
pm2 restart vyapar-ai

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Application not starting

```bash
pm2 logs vyapar-ai
pm2 restart vyapar-ai
```

### Nginx 502 Error

```bash
pm2 status  # Check if app is running
sudo systemctl restart nginx
```

### Port 3000 in use

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
pm2 restart vyapar-ai
```

## Environment Variables Required

```bash
# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
DYNAMODB_TABLE_NAME=vyapar-ai
S3_BUCKET_NAME=vyapar-ai-uploads

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Support

Full documentation: See `DEPLOYMENT-GUIDE.md`

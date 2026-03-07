#!/bin/bash

# Vyapar AI - AWS Infrastructure Deployment Script
# This script automatically creates all required AWS resources
# Date: March 2, 2026

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="ap-south-1"
PROJECT_NAME="vyapar-ai"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Vyapar AI - AWS Infrastructure Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}AWS Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${GREEN}Region: ${REGION}${NC}"
echo ""

# Load environment variables
if [ -f .env.local ]; then
    echo -e "${YELLOW}Loading environment variables from .env.local...${NC}"
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env.local file not found!${NC}"
    echo -e "${YELLOW}Please create .env.local with AWS credentials${NC}"
    exit 1
fi

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: Invalid AWS credentials!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS credentials validated${NC}"
echo ""

# Function to check if resource exists
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    
    case $resource_type in
        "dynamodb")
            aws dynamodb describe-table --table-name "$resource_name" --region "$REGION" > /dev/null 2>&1
            ;;
        "s3")
            aws s3api head-bucket --bucket "$resource_name" > /dev/null 2>&1
            ;;
        "lambda")
            aws lambda get-function --function-name "$resource_name" --region "$REGION" > /dev/null 2>&1
            ;;
        "iam-role")
            aws iam get-role --role-name "$resource_name" > /dev/null 2>&1
            ;;
        "iam-policy")
            aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${resource_name}" > /dev/null 2>&1
            ;;
    esac
}

# ============================================
# 1. CREATE DYNAMODB TABLE
# ============================================
echo -e "${BLUE}[1/7] Creating DynamoDB Table...${NC}"

if resource_exists "dynamodb" "$PROJECT_NAME"; then
    echo -e "${YELLOW}✓ DynamoDB table '$PROJECT_NAME' already exists${NC}"
else
    aws dynamodb create-table \
        --table-name "$PROJECT_NAME" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION" \
        --tags Key=Project,Value=VyaparAI Key=Environment,Value=Production \
        > /dev/null
    
    echo -e "${YELLOW}Waiting for table to be active...${NC}"
    aws dynamodb wait table-exists --table-name "$PROJECT_NAME" --region "$REGION"
    
    echo -e "${GREEN}✓ DynamoDB table created${NC}"
fi

# Enable TTL
echo -e "${YELLOW}Enabling TTL on DynamoDB table...${NC}"
aws dynamodb update-time-to-live \
    --table-name "$PROJECT_NAME" \
    --time-to-live-specification "Enabled=true, AttributeName=ttl" \
    --region "$REGION" \
    > /dev/null 2>&1 || echo -e "${YELLOW}TTL already enabled or update in progress${NC}"

# Enable Point-in-Time Recovery
echo -e "${YELLOW}Enabling Point-in-Time Recovery...${NC}"
aws dynamodb update-continuous-backups \
    --table-name "$PROJECT_NAME" \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
    --region "$REGION" \
    > /dev/null 2>&1 || echo -e "${YELLOW}PITR already enabled${NC}"

echo -e "${GREEN}✓ DynamoDB configuration complete${NC}"
echo ""

# ============================================
# 2. CREATE S3 BUCKETS
# ============================================
echo -e "${BLUE}[2/7] Creating S3 Buckets...${NC}"

# Receipts bucket
RECEIPTS_BUCKET="${PROJECT_NAME}-receipts-${ACCOUNT_ID}"
if resource_exists "s3" "$RECEIPTS_BUCKET"; then
    echo -e "${YELLOW}✓ S3 bucket '$RECEIPTS_BUCKET' already exists${NC}"
else
    aws s3api create-bucket \
        --bucket "$RECEIPTS_BUCKET" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION" \
        > /dev/null
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$RECEIPTS_BUCKET" \
        --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
        > /dev/null
    
    # Add lifecycle policy (7-day retention)
    cat > /tmp/receipts-lifecycle.json <<'EOF'
{
    "Rules": [
        {
            "ID": "DeleteAfter7Days",
            "Status": "Enabled",
            "Expiration": {
                "Days": 7
            },
            "Filter": {
                "Prefix": ""
            }
        }
    ]
}
EOF
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$RECEIPTS_BUCKET" \
        --lifecycle-configuration file:///tmp/receipts-lifecycle.json \
        > /dev/null
    
    echo -e "${GREEN}✓ Receipts bucket created with 7-day retention${NC}"
fi

# Voice bucket
VOICE_BUCKET="${PROJECT_NAME}-voice-${ACCOUNT_ID}"
if resource_exists "s3" "$VOICE_BUCKET"; then
    echo -e "${YELLOW}✓ S3 bucket '$VOICE_BUCKET' already exists${NC}"
else
    aws s3api create-bucket \
        --bucket "$VOICE_BUCKET" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION" \
        > /dev/null
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$VOICE_BUCKET" \
        --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
        > /dev/null
    
    # Add lifecycle policy (1-day retention)
    cat > /tmp/voice-lifecycle.json <<'EOF'
{
    "Rules": [
        {
            "ID": "DeleteAfter1Day",
            "Status": "Enabled",
            "Expiration": {
                "Days": 1
            },
            "Filter": {
                "Prefix": ""
            }
        }
    ]
}
EOF
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$VOICE_BUCKET" \
        --lifecycle-configuration file:///tmp/voice-lifecycle.json \
        > /dev/null
    
    echo -e "${GREEN}✓ Voice bucket created with 1-day retention${NC}"
fi

echo -e "${GREEN}✓ S3 buckets configuration complete${NC}"
echo ""

# ============================================
# 3. CREATE IAM ROLES AND POLICIES
# ============================================
echo -e "${BLUE}[3/7] Creating IAM Roles and Policies...${NC}"

# Lambda execution role
LAMBDA_ROLE_NAME="${PROJECT_NAME}-lambda-role"
if resource_exists "iam-role" "$LAMBDA_ROLE_NAME"; then
    echo -e "${YELLOW}✓ IAM role '$LAMBDA_ROLE_NAME' already exists${NC}"
else
    # Trust policy for Lambda
    cat > /tmp/lambda-trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
    
    aws iam create-role \
        --role-name "$LAMBDA_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
        --description "Execution role for Vyapar AI Lambda functions" \
        > /dev/null
    
    echo -e "${GREEN}✓ Lambda execution role created${NC}"
fi

# Lambda policy
LAMBDA_POLICY_NAME="${PROJECT_NAME}-lambda-policy"
LAMBDA_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${LAMBDA_POLICY_NAME}"

if resource_exists "iam-policy" "$LAMBDA_POLICY_NAME"; then
    echo -e "${YELLOW}✓ IAM policy '$LAMBDA_POLICY_NAME' already exists${NC}"
else
    cat > /tmp/lambda-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "CloudWatchLogs",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:*"
        },
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PROJECT_NAME}"
        },
        {
            "Sid": "S3ObjectAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::${RECEIPTS_BUCKET}/*",
                "arn:aws:s3:::${VOICE_BUCKET}/*"
            ]
        },
        {
            "Sid": "S3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${RECEIPTS_BUCKET}",
                "arn:aws:s3:::${VOICE_BUCKET}"
            ]
        },
        {
            "Sid": "BedrockModelInvoke",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:${REGION}::foundation-model/*",
                "arn:aws:bedrock:us-east-1::foundation-model/*"
            ]
        },
        {
            "Sid": "BedrockMarketplaceSubscription",
            "Effect": "Allow",
            "Action": [
                "aws-marketplace:ViewSubscriptions",
                "aws-marketplace:Subscribe"
            ],
            "Resource": "*"
        },
        {
            "Sid": "TranscribeAccess",
            "Effect": "Allow",
            "Action": [
                "transcribe:StartTranscriptionJob",
                "transcribe:GetTranscriptionJob"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    aws iam create-policy \
        --policy-name "$LAMBDA_POLICY_NAME" \
        --policy-document file:///tmp/lambda-policy.json \
        --description "Policy for Vyapar AI Lambda functions" \
        > /dev/null
    
    echo -e "${GREEN}✓ Lambda policy created${NC}"
fi

# Attach policy to role
echo -e "${YELLOW}Attaching policies to Lambda role...${NC}"
aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE_NAME" \
    --policy-arn "$LAMBDA_POLICY_ARN" \
    > /dev/null 2>&1 || echo -e "${YELLOW}Policy already attached${NC}"

# Attach AWS managed policy for basic Lambda execution
aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
    > /dev/null 2>&1 || echo -e "${YELLOW}Basic execution policy already attached${NC}"

echo -e "${GREEN}✓ IAM configuration complete${NC}"
echo ""

# Wait for IAM role to propagate
echo -e "${YELLOW}Waiting for IAM role to propagate (10 seconds)...${NC}"
sleep 10

# ============================================
# 4. PACKAGE LAMBDA FUNCTIONS
# ============================================
echo -e "${BLUE}[4/7] Packaging Lambda Functions...${NC}"

LAMBDA_FUNCTIONS=("cashflow-predictor" "expense-alert" "report-generator" "receipt-ocr-processor" "voice-processor")

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Packaging $func...${NC}"
    
    cd "lambda/$func"
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        npm install --production > /dev/null 2>&1
    fi
    
    # Create deployment package
    if [ -f "function.zip" ]; then
        rm function.zip
    fi
    zip -r function.zip . -x "*.git*" "*.DS_Store" > /dev/null
    
    echo -e "${GREEN}✓ $func packaged${NC}"
    
    cd ../..
done

echo -e "${GREEN}✓ All Lambda functions packaged${NC}"
echo ""

# ============================================
# 5. DEPLOY LAMBDA FUNCTIONS
# ============================================
echo -e "${BLUE}[5/7] Deploying Lambda Functions...${NC}"

LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}"

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Deploying $func...${NC}"
    
    # Set memory and timeout based on function
    case $func in
        "cashflow-predictor")
            MEMORY=256
            TIMEOUT=30
            ;;
        "expense-alert")
            MEMORY=256
            TIMEOUT=30
            ;;
        "report-generator")
            MEMORY=512
            TIMEOUT=60
            ;;
        "receipt-ocr-processor")
            MEMORY=512
            TIMEOUT=30
            ;;
        "voice-processor")
            MEMORY=512
            TIMEOUT=60
            ;;
        *)
            MEMORY=256
            TIMEOUT=30
            ;;
    esac
    
    # Set RESULTS_BUCKET based on function type
    if [ "$func" = "receipt-ocr-processor" ]; then
        RESULTS_BUCKET_VAR=$RECEIPTS_BUCKET
    else
        RESULTS_BUCKET_VAR=$VOICE_BUCKET
    fi
    
    if resource_exists "lambda" "$func"; then
        # Update existing function
        aws lambda update-function-code \
            --function-name "$func" \
            --zip-file "fileb://lambda/$func/function.zip" \
            --region "$REGION" \
            > /dev/null
        
        # Wait for update to complete
        echo -e "${YELLOW}Waiting for function update to complete...${NC}"
        aws lambda wait function-updated --function-name "$func" --region "$REGION" 2>/dev/null || sleep 5
        
        aws lambda update-function-configuration \
            --function-name "$func" \
            --runtime nodejs20.x \
            --handler index.handler \
            --memory-size "$MEMORY" \
            --timeout "$TIMEOUT" \
            --environment "Variables={
                DYNAMODB_TABLE_NAME=$PROJECT_NAME,
                S3_BUCKET_RECEIPTS=$RECEIPTS_BUCKET,
                S3_BUCKET_VOICE=$VOICE_BUCKET,
                RESULTS_BUCKET=$RESULTS_BUCKET_VAR,
                BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID
            }" \
            --region "$REGION" \
            > /dev/null
        
        echo -e "${GREEN}✓ $func updated${NC}"
    else
        # Create new function
        aws lambda create-function \
            --function-name "$func" \
            --runtime nodejs20.x \
            --role "$LAMBDA_ROLE_ARN" \
            --handler index.handler \
            --zip-file "fileb://lambda/$func/function.zip" \
            --memory-size "$MEMORY" \
            --timeout "$TIMEOUT" \
            --environment "Variables={
                DYNAMODB_TABLE_NAME=$PROJECT_NAME,
                S3_BUCKET_RECEIPTS=$RECEIPTS_BUCKET,
                S3_BUCKET_VOICE=$VOICE_BUCKET,
                RESULTS_BUCKET=$RESULTS_BUCKET_VAR,
                BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID
            }" \
            --region "$REGION" \
            --tags Project=VyaparAI,Environment=Production \
            > /dev/null
        
        echo -e "${GREEN}✓ $func created${NC}"
    fi
done

echo -e "${GREEN}✓ All Lambda functions deployed${NC}"
echo ""

# ============================================
# 6. CONFIGURE S3 TRIGGERS
# ============================================
echo -e "${BLUE}[6/7] Configuring S3 Event Triggers...${NC}"

# Add Lambda permission for S3 to invoke receipt-ocr-processor
echo -e "${YELLOW}Configuring receipt-ocr-processor trigger...${NC}"
aws lambda add-permission \
    --function-name receipt-ocr-processor \
    --statement-id s3-receipts-invoke \
    --action lambda:InvokeFunction \
    --principal s3.amazonaws.com \
    --source-arn "arn:aws:s3:::${RECEIPTS_BUCKET}" \
    --region "$REGION" \
    > /dev/null 2>&1 || echo -e "${YELLOW}Permission already exists${NC}"

# Configure S3 notification for receipts
cat > /tmp/receipts-notification.json <<EOF
{
    "LambdaFunctionConfigurations": [
        {
            "Id": "ReceiptOCRTrigger",
            "LambdaFunctionArn": "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:receipt-ocr-processor",
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {
                            "Name": "prefix",
                            "Value": "uploads/"
                        }
                    ]
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-notification-configuration \
    --bucket "$RECEIPTS_BUCKET" \
    --notification-configuration file:///tmp/receipts-notification.json \
    > /dev/null 2>&1 || echo -e "${YELLOW}Notification already configured${NC}"

echo -e "${GREEN}✓ Receipt OCR trigger configured${NC}"

# Add Lambda permission for S3 to invoke voice-processor
echo -e "${YELLOW}Configuring voice-processor trigger...${NC}"
aws lambda add-permission \
    --function-name voice-processor \
    --statement-id s3-voice-invoke \
    --action lambda:InvokeFunction \
    --principal s3.amazonaws.com \
    --source-arn "arn:aws:s3:::${VOICE_BUCKET}" \
    --region "$REGION" \
    > /dev/null 2>&1 || echo -e "${YELLOW}Permission already exists${NC}"

# Configure S3 notification for voice
cat > /tmp/voice-notification.json <<EOF
{
    "LambdaFunctionConfigurations": [
        {
            "Id": "VoiceProcessorTrigger",
            "LambdaFunctionArn": "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:voice-processor",
            "Events": ["s3:ObjectCreated:*"],
            "Filter": {
                "Key": {
                    "FilterRules": [
                        {
                            "Name": "prefix",
                            "Value": "uploads/"
                        }
                    ]
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-notification-configuration \
    --bucket "$VOICE_BUCKET" \
    --notification-configuration file:///tmp/voice-notification.json \
    > /dev/null 2>&1 || echo -e "${YELLOW}Notification already configured${NC}"

echo -e "${GREEN}✓ Voice processor trigger configured${NC}"
echo -e "${GREEN}✓ S3 triggers configuration complete${NC}"
echo ""

# ============================================
# 7. UPDATE ENVIRONMENT FILE
# ============================================
echo -e "${BLUE}[7/7] Updating Environment Configuration...${NC}"

# Update .env.local with actual resource names
cat > .env.local <<EOF
# AWS Configuration
AWS_REGION=${REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# AWS Bedrock
BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID}

# DynamoDB
DYNAMODB_TABLE_NAME=${PROJECT_NAME}

# S3 Buckets
S3_BUCKET_RECEIPTS=${RECEIPTS_BUCKET}
S3_BUCKET_VOICE=${VOICE_BUCKET}

# Lambda Functions
LAMBDA_CASHFLOW_PREDICTOR=cashflow-predictor
LAMBDA_EXPENSE_ALERT=expense-alert
LAMBDA_REPORT_GENERATOR=report-generator
LAMBDA_RECEIPT_OCR=receipt-ocr-processor
LAMBDA_VOICE_PROCESSOR=voice-processor

# Twilio (if using phone auth)
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-your-twilio-account-sid}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-your-twilio-auth-token}
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER:-your-twilio-phone-number}
EOF

echo -e "${GREEN}✓ Environment file updated${NC}"
echo ""

# ============================================
# DEPLOYMENT SUMMARY
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ DynamoDB Table:${NC} $PROJECT_NAME"
echo -e "${GREEN}✓ S3 Receipts Bucket:${NC} $RECEIPTS_BUCKET"
echo -e "${GREEN}✓ S3 Voice Bucket:${NC} $VOICE_BUCKET"
echo -e "${GREEN}✓ IAM Role:${NC} $LAMBDA_ROLE_NAME"
echo -e "${GREEN}✓ IAM Policy:${NC} $LAMBDA_POLICY_NAME"
echo ""
echo -e "${GREEN}Lambda Functions Deployed:${NC}"
for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -e "  ✓ $func"
done
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment Complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Run validation script: ${BLUE}./scripts/validate-infrastructure.sh${NC}"
echo -e "2. Test Lambda functions: ${BLUE}./scripts/test-lambdas.sh${NC}"
echo -e "3. Start your Next.js app: ${BLUE}npm run dev${NC}"
echo ""

# Cleanup temp files
rm -f /tmp/lambda-trust-policy.json
rm -f /tmp/lambda-policy.json
rm -f /tmp/receipts-lifecycle.json
rm -f /tmp/voice-lifecycle.json
rm -f /tmp/receipts-notification.json
rm -f /tmp/voice-notification.json

exit 0

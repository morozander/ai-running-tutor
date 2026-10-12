#!/bin/bash
set -euo pipefail

# Script to rotate AWS access keys for the CI IAM user
# This should be run periodically (e.g., every 90 days)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CI_IAM_USER_NAME="${CI_IAM_USER_NAME:-gitlab-ci-terraform}"
AWS_PROFILE="${AWS_PROFILE:-<aws-root-profile>}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
}

list_existing_keys() {
    log_info "Listing existing access keys for user: $CI_IAM_USER_NAME"
    
    local keys
    keys=$(aws iam list-access-keys \
        --user-name "$CI_IAM_USER_NAME" \
        --profile "$AWS_PROFILE" \
        --output json)
    
    echo "$keys" | jq -r '.AccessKeyMetadata[] | "Key ID: \(.AccessKeyId) | Status: \(.Status) | Created: \(.CreateDate)"'
    
    echo "$keys"
}

create_new_key() {
    log_info "Creating new access key..."
    
    local new_key
    new_key=$(aws iam create-access-key \
        --user-name "$CI_IAM_USER_NAME" \
        --profile "$AWS_PROFILE" \
        --output json)
    
    local access_key_id
    local secret_access_key
    access_key_id=$(echo "$new_key" | jq -r '.AccessKey.AccessKeyId')
    secret_access_key=$(echo "$new_key" | jq -r '.AccessKey.SecretAccessKey')
    
    log_info "=========================================="
    log_info "New AWS Credentials (SAVE THESE!)"
    log_info "=========================================="
    echo "AWS_ACCESS_KEY_ID: $access_key_id"
    echo "AWS_SECRET_ACCESS_KEY: $secret_access_key"
    log_info "=========================================="
    
    # Save to file
    local creds_file="ci-credentials-rotated-$(date +%Y%m%d-%H%M%S).txt"
    cat > "$creds_file" <<EOF
CI/CD AWS Credentials (ROTATED)
Generated: $(date)
User: $CI_IAM_USER_NAME

AWS_ACCESS_KEY_ID=$access_key_id
AWS_SECRET_ACCESS_KEY=$secret_access_key

IMPORTANT: Update these in GitHub Actions secrets immediately!
Settings > Secrets and variables > Actions

After updating GitHub and testing, delete the old key with:
aws iam delete-access-key --user-name $CI_IAM_USER_NAME --access-key-id <OLD_KEY_ID> --profile $AWS_PROFILE
EOF
    
    log_info "Credentials saved to: $creds_file"
    echo "$access_key_id"
}

delete_old_key() {
    local key_id=$1
    
    log_warn "About to delete access key: $key_id"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" == "yes" ]; then
        aws iam delete-access-key \
            --user-name "$CI_IAM_USER_NAME" \
            --access-key-id "$key_id" \
            --profile "$AWS_PROFILE"
        
        log_info "Access key $key_id deleted successfully."
    else
        log_info "Deletion cancelled."
    fi
}

main() {
    log_info "Starting AWS access key rotation for CI..."
    
    check_prerequisites
    
    log_info "Current access keys:"
    local existing_keys
    existing_keys=$(list_existing_keys)
    
    local key_count
    key_count=$(echo "$existing_keys" | jq '.AccessKeyMetadata | length')
    
    if [ "$key_count" -ge 2 ]; then
        log_error "User already has 2 access keys (AWS limit)."
        log_error "You must delete an old key before creating a new one."
        echo ""
        log_info "To delete a key, run:"
        echo "aws iam delete-access-key --user-name $CI_IAM_USER_NAME --access-key-id <KEY_ID> --profile $AWS_PROFILE"
        exit 1
    fi
    
    log_warn "This will create a new access key. The old key will still be active."
    log_warn "You should:"
    log_warn "  1. Create the new key"
    log_warn "  2. Update GitHub Actions secrets with the new key"
    log_warn "  3. Test a pipeline run"
    log_warn "  4. Delete the old key once confirmed working"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Operation cancelled."
        exit 0
    fi
    
    local new_key_id
    new_key_id=$(create_new_key)
    
    log_info ""
    log_info "=========================================="
    log_info "Next Steps:"
    log_info "=========================================="
    echo "1. Update GitHub Actions secrets with new credentials"
    echo "   Settings > Secrets and variables > Actions"
    echo "   - AWS_ACCESS_KEY_ID"
    echo "   - AWS_SECRET_ACCESS_KEY"
    echo ""
    echo "2. Test a pipeline run to verify new credentials work"
    echo ""
    echo "3. After successful test, delete old key(s):"
    local old_keys
    old_keys=$(echo "$existing_keys" | jq -r '.AccessKeyMetadata[] | .AccessKeyId')
    for key in $old_keys; do
        echo "   aws iam delete-access-key --user-name $CI_IAM_USER_NAME --access-key-id $key --profile $AWS_PROFILE"
    done
    log_info "=========================================="
    
    log_info "Key rotation completed successfully!"
}

# Run main function
main "$@"

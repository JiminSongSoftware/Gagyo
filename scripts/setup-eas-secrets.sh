#!/bin/bash

# EAS Secrets Setup Script for Gagyo
# This script sets up all required EAS project secrets
# Usage: ./scripts/setup-eas-secrets.sh

set -e

echo "🔧 Setting up EAS secrets for Gagyo project..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Install it with: bun add -g eas-cli"
    exit 1
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please run: eas login"
    exit 1
fi

echo "✅ EAS CLI is ready"
echo ""

# Array of secret names (values should be provided as environment variables)
declare -a SECRETS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SENTRY_DSN"
    "POSTHOG_API_KEY"
)

# Function to prompt for secret value
prompt_secret() {
    local secret_name=$1
    local env_var_name=$2

    if [ -n "${!env_var_name}" ]; then
        echo "Setting $secret_name from environment variable..."
        eas secret:create --scope project --name "$secret_name" --value "${!env_var_name}"
    else
        echo "Enter value for $secret_name:"
        read -s -r secret_value
        eas secret:create --scope project --name "$secret_name" --value "$secret_value"
    fi
}

# Create each secret
for secret in "${SECRETS[@]}"; do
    echo "📝 Creating secret: $secret"
    prompt_secret "$secret" "$secret"
    echo "✅ Created $secret"
    echo ""
done

echo "✨ All EAS secrets have been configured!"
echo ""
echo "To verify secrets, run: eas secret:list --scope project"
echo ""
echo "To update a secret:"
echo "  eas secret:update --scope project --name SECRET_NAME --value 'new_value'"
echo ""
echo "To delete a secret:"
echo "  eas secret:delete --scope project --name SECRET_NAME"

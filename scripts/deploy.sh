#!/bin/bash

################################################################################
# TaxGeniusPro Production Deployment Script
#
# Purpose: Safe, automated deployment with rollback capability
# Author: DevOps Team
# Version: 1.0.0
#
# Features:
# - Pre-deployment validation
# - Automatic backup
# - Build verification
# - Graceful restart
# - Health checks
# - Automatic rollback on failure
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly APP_NAME="taxgeniuspro"
readonly APP_PORT="3005"
readonly PROJECT_ROOT="/root/websites/taxgeniuspro"
readonly BACKUP_DIR="/root/backups/taxgeniuspro"
readonly LOG_FILE="/var/log/taxgeniuspro-deploy.log"
readonly MAX_BACKUPS=5

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ ${NC}$*"
    log "INFO" "$*"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$*"
    log "SUCCESS" "$*"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$*"
    log "WARNING" "$*"
}

log_error() {
    echo -e "${RED}✗ ${NC}$*" >&2
    log "ERROR" "$*"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log_warning "Not running as root. Some operations may require sudo."
    fi

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $node_version -lt 18 ]]; then
        log_error "Node.js version must be >= 18. Current: $(node -v)"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed. Run: npm install -g pm2"
        exit 1
    fi

    # Check disk space (need at least 2GB free)
    local available_space=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        log_error "Insufficient disk space. Need at least 2GB free."
        exit 1
    fi

    # Check if .env files exist
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        log_error ".env file not found in $PROJECT_ROOT"
        exit 1
    fi

    log_success "All prerequisites met"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

create_backup() {
    log_info "Creating backup..."

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="${APP_NAME}_${timestamp}.tar.gz"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    # Backup .next directory and environment files
    if [[ -d "$PROJECT_ROOT/.next" ]]; then
        tar -czf "$backup_path" \
            -C "$PROJECT_ROOT" \
            .next \
            .env \
            .env.local 2>/dev/null || true

        log_success "Backup created: $backup_path"
        echo "$backup_path" > /tmp/taxgeniuspro_last_backup.txt

        # Clean old backups
        cleanup_old_backups
    else
        log_warning "No .next directory found. Skipping backup."
    fi
}

cleanup_old_backups() {
    local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)

    if [[ $backup_count -gt $MAX_BACKUPS ]]; then
        log_info "Cleaning old backups (keeping last $MAX_BACKUPS)..."
        cd "$BACKUP_DIR"
        ls -t | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        log_success "Old backups cleaned"
    fi
}

# ============================================================================
# BUILD FUNCTIONS
# ============================================================================

build_application() {
    log_info "Building application..."

    cd "$PROJECT_ROOT"

    # Install dependencies if node_modules doesn't exist or package.json changed
    if [[ ! -d "node_modules" ]] || [[ package.json -nt node_modules ]]; then
        log_info "Installing dependencies..."
        npm ci --production=false 2>&1 | tee -a "$LOG_FILE"
    fi

    # Run build
    log_info "Running Next.js build..."
    if ! npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Build failed!"
        return 1
    fi

    # Verify build output
    if [[ ! -d ".next/standalone" ]]; then
        log_error "Build failed: .next/standalone directory not created"
        return 1
    fi

    if [[ ! -f ".next/standalone/server.js" ]]; then
        log_error "Build failed: server.js not found"
        return 1
    fi

    log_success "Build completed successfully"
}

copy_environment_files() {
    log_info "Copying environment files to standalone directory..."

    cp .env .next/standalone/ 2>/dev/null || log_warning ".env not found"
    cp .env.local .next/standalone/ 2>/dev/null || log_warning ".env.local not found"

    # Copy public and static assets
    log_info "Copying static assets..."
    cp -r public .next/standalone/ 2>/dev/null || log_warning "public directory not found"
    cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

    log_success "Environment files and assets copied"
}

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

deploy_to_pm2() {
    log_info "Deploying to PM2..."

    # Check if app is already running
    if pm2 describe "$APP_NAME" &>/dev/null; then
        log_info "Stopping existing PM2 process..."
        pm2 stop "$APP_NAME" &>/dev/null || true
        pm2 delete "$APP_NAME" &>/dev/null || true
    fi

    # Start new process
    log_info "Starting new PM2 process..."
    cd "$PROJECT_ROOT"

    PORT=$APP_PORT pm2 start .next/standalone/server.js \
        --name "$APP_NAME" \
        --max-memory-restart 1G \
        --time \
        --merge-logs \
        --update-env

    # Save PM2 configuration
    pm2 save

    log_success "Application deployed to PM2"
}

# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

verify_deployment() {
    log_info "Verifying deployment..."

    # Wait for app to start
    local max_wait=30
    local wait_count=0

    while [[ $wait_count -lt $max_wait ]]; do
        if pm2 describe "$APP_NAME" | grep -q "online"; then
            break
        fi
        sleep 1
        ((wait_count++))
    done

    if [[ $wait_count -ge $max_wait ]]; then
        log_error "Application failed to start within ${max_wait} seconds"
        return 1
    fi

    # Health check
    log_info "Performing health check..."
    sleep 3  # Give app time to fully initialize

    local health_check_url="http://localhost:${APP_PORT}/"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_check_url" || echo "000")

    if [[ "$http_code" == "200" ]]; then
        log_success "Health check passed (HTTP $http_code)"
        return 0
    else
        log_error "Health check failed (HTTP $http_code)"
        return 1
    fi
}

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

rollback() {
    log_warning "Initiating rollback..."

    if [[ ! -f /tmp/taxgeniuspro_last_backup.txt ]]; then
        log_error "No backup found for rollback"
        return 1
    fi

    local backup_file=$(cat /tmp/taxgeniuspro_last_backup.txt)

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_info "Restoring from backup: $backup_file"

    # Stop current process
    pm2 stop "$APP_NAME" &>/dev/null || true

    # Restore backup
    cd "$PROJECT_ROOT"
    tar -xzf "$backup_file"

    # Restart with old version
    deploy_to_pm2

    if verify_deployment; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed"
        return 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo ""
    echo "=================================="
    echo "  TaxGeniusPro Deployment Script  "
    echo "=================================="
    echo ""

    log_info "Starting deployment process..."
    log_info "Timestamp: $(date)"
    log_info "User: $(whoami)"
    log_info "Project: $PROJECT_ROOT"

    # Step 1: Prerequisites
    check_prerequisites || exit 1

    # Step 2: Backup
    create_backup

    # Step 3: Build
    if ! build_application; then
        log_error "Build failed. Aborting deployment."
        exit 1
    fi

    # Step 4: Copy files
    copy_environment_files

    # Step 5: Deploy
    deploy_to_pm2

    # Step 6: Verify
    if ! verify_deployment; then
        log_error "Deployment verification failed!"

        read -p "Attempt rollback? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback
        fi
        exit 1
    fi

    # Success!
    echo ""
    log_success "========================================="
    log_success "  Deployment completed successfully!    "
    log_success "========================================="
    echo ""
    log_info "Application: $APP_NAME"
    log_info "Port: $APP_PORT"
    log_info "Status: ONLINE"
    log_info "Logs: pm2 logs $APP_NAME"
    echo ""

    # Show app status
    pm2 status "$APP_NAME"
}

# Handle script interruption
trap 'log_error "Deployment interrupted!"; exit 130' INT TERM

# Run main function
main "$@"

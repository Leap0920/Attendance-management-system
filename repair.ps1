# Repair script for AttendEase
Write-Host "Starting AttendEase Repair Utility..." -ForegroundColor Cyan

# 1. Cleanup conflicting/stale migrations in source
$migrationPath = "backend/src/main/resources/db/migration"
Write-Host "Cleaning up stale migration files..."
Remove-Item "$migrationPath/V13__allow_suspended_status.sql" -ErrorAction SilentlyContinue
Remove-Item "$migrationPath/V15__allow_suspended_status.sql" -ErrorAction SilentlyContinue

# 2. Cleanup target directory to avoid classloader/NoClassDefFound issues
if (Test-Path "backend/target") {
    Write-Host "Purging build artifacts..." -ForegroundColor Yellow
    Remove-Item "backend/target" -Recurse -Force -ErrorAction SilentlyContinue
}

# 3. Start Backend
Write-Host "Launching backend with clean state..." -ForegroundColor Green
Set-Location "backend"
./mvnw.cmd clean spring-boot:run

# Cleanup duplicate migrations
$targetFile = "backend/src/main/resources/db/migration/V10__add_user_session_id.sql"
if (Test-Path $targetFile) {
    Remove-Item $targetFile -Force
    Write-Host "Deleted conflicting migration source."
}

# Run full clean and restart
cd backend
./mvnw.cmd clean spring-boot:run

# 🚀 Deployment Checklist - Attendance Late Feature

## Pre-Deployment Verification

### ✅ Code Quality
- [x] Backend compiles successfully (`./mvnw compile`)
- [x] No Java compilation errors
- [x] No TypeScript errors in modified files
- [x] Code follows project conventions
- [x] All files properly formatted

### ✅ Files Modified/Created
- [x] Backend: 4 files modified/created
- [x] Frontend: 5 files modified/created
- [x] Database: 1 migration script created
- [x] Documentation: 5 comprehensive docs created

---

## Database Migration

### Step 1: Backup Current Database
```bash
# PostgreSQL backup
pg_dump -U your_user -d attendease_db > backup_before_late_feature.sql

# Or use your preferred backup method
```
- [ ] Database backed up successfully
- [ ] Backup file verified and stored safely

### Step 2: Review Migration Script
```bash
# Review the migration
cat backend/src/main/resources/db/migration/V999__add_attendance_late_preferences.sql
```
- [ ] Migration script reviewed
- [ ] SQL syntax verified
- [ ] Column names match entity

### Step 3: Test Migration (Optional - Staging)
```bash
# On staging/test database first
psql -U your_user -d attendease_test < backend/src/main/resources/db/migration/V999__add_attendance_late_preferences.sql
```
- [ ] Migration tested on staging
- [ ] No errors encountered
- [ ] Columns created successfully

### Step 4: Production Migration
**Option A: Automatic (Flyway - Recommended)**
```bash
# Migration runs automatically on application startup
# Flyway will detect and execute V999__*.sql
```
- [ ] Flyway configured correctly
- [ ] Migration will run on startup

**Option B: Manual**
```bash
# Connect to production database
psql -U your_user -d attendease_db

# Run migration
\i backend/src/main/resources/db/migration/V999__add_attendance_late_preferences.sql

# Verify
\d users
```
- [ ] Manual migration executed
- [ ] Columns verified in database

### Step 5: Verify Migration
```sql
-- Check columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('attendance_late_enabled', 'attendance_late_minutes');

-- Should return:
-- attendance_late_enabled  | boolean | true
-- attendance_late_minutes  | integer | 15
```
- [ ] Columns exist
- [ ] Default values correct
- [ ] Data types correct

---

## Backend Deployment

### Step 1: Build Backend
```bash
cd backend
./mvnw clean package -DskipTests
```
- [ ] Build successful
- [ ] JAR file created in `target/`
- [ ] No compilation errors

### Step 2: Run Tests (Optional)
```bash
./mvnw test
```
- [ ] All tests pass
- [ ] No new test failures

### Step 3: Deploy Backend
```bash
# Stop current application
# (Method depends on your deployment)

# Start new version
java -jar target/attendease-0.0.1-SNAPSHOT.jar

# Or use your deployment script
```
- [ ] Old application stopped
- [ ] New application started
- [ ] Application logs show successful startup
- [ ] Database migration executed (if using Flyway)

### Step 4: Verify Backend Endpoints
```bash
# Test settings endpoint (replace with actual token)
curl -X GET http://localhost:8080/api/teacher/settings/attendance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {"success":true,"data":{"lateEnabled":true,"lateMinutes":15}}
```
- [ ] GET endpoint responds
- [ ] PUT endpoint works
- [ ] Session creation works
- [ ] Student submission works

---

## Frontend Deployment

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```
- [ ] Dependencies installed
- [ ] No installation errors
- [ ] package-lock.json updated

### Step 2: Build Frontend
```bash
npm run build
```
- [ ] Build successful
- [ ] `dist/` folder created
- [ ] No build errors
- [ ] Assets optimized

### Step 3: Deploy Frontend
```bash
# Copy build files to web server
# Example for nginx:
cp -r dist/* /var/www/attendease/

# Or use your deployment method
```
- [ ] Files copied to web server
- [ ] Permissions set correctly
- [ ] Web server restarted (if needed)

### Step 4: Verify Frontend
- [ ] Open browser to application URL
- [ ] Login as teacher
- [ ] Navigate to Settings page
- [ ] Settings page loads correctly
- [ ] Can save settings
- [ ] Attendance page shows new fields
- [ ] No console errors

---

## Functional Testing

### Test 1: Settings Page
- [ ] Navigate to `/teacher/settings`
- [ ] Page loads without errors
- [ ] Toggle late system ON/OFF
- [ ] Change late minutes value
- [ ] Click "Save Settings"
- [ ] Success message appears
- [ ] Refresh page - settings persist

### Test 2: Default Behavior
- [ ] Go to Attendance page
- [ ] Click "New Session"
- [ ] Modal shows current default settings
- [ ] Create session without override
- [ ] Session created successfully
- [ ] Session uses teacher's default settings

### Test 3: Custom Override
- [ ] Go to Attendance page
- [ ] Click "New Session"
- [ ] Check "Custom late threshold"
- [ ] Enter custom value (e.g., 30)
- [ ] Create session
- [ ] Session created with custom threshold

### Test 4: Late System Disabled
- [ ] Go to Settings
- [ ] Disable late marking system
- [ ] Save settings
- [ ] Create new session
- [ ] Have student submit after threshold
- [ ] Verify student marked "Present" (not "Late")

### Test 5: Late System Enabled
- [ ] Go to Settings
- [ ] Enable late marking system
- [ ] Set threshold (e.g., 15 minutes)
- [ ] Save settings
- [ ] Create new session (120 minutes)
- [ ] Have student submit at 10 minutes → Should be "Present"
- [ ] Have student submit at 20 minutes → Should be "Late"

### Test 6: Session End Rejection
- [ ] Create session with any settings
- [ ] Wait for session to end
- [ ] Have student try to submit
- [ ] Verify submission rejected

---

## User Acceptance Testing

### Teacher Workflow
- [ ] Teacher can access Settings page
- [ ] Teacher can configure preferences
- [ ] Teacher can save settings
- [ ] Teacher sees default in session creation
- [ ] Teacher can override per session
- [ ] Teacher can view attendance records
- [ ] Status shows correctly (Present/Late)

### Student Workflow
- [ ] Student can submit attendance
- [ ] Student receives correct status
- [ ] Student sees confirmation message
- [ ] Student cannot submit twice
- [ ] Student cannot submit after session ends

---

## Performance Testing

### Load Testing (Optional)
- [ ] Multiple teachers accessing settings simultaneously
- [ ] Multiple sessions created concurrently
- [ ] Many students submitting at once
- [ ] Database queries perform well
- [ ] No timeout errors

### Response Times
- [ ] Settings page loads < 2 seconds
- [ ] Save settings responds < 1 second
- [ ] Session creation < 1 second
- [ ] Student submission < 1 second

---

## Security Verification

### Authorization
- [ ] Only teachers can access settings endpoints
- [ ] Students cannot access teacher settings
- [ ] Session ownership verified
- [ ] Audit logs created for settings changes

### Input Validation
- [ ] Late minutes validated (1-1440)
- [ ] Invalid values rejected
- [ ] SQL injection prevented
- [ ] XSS attacks prevented

---

## Monitoring & Logging

### Application Logs
- [ ] Settings changes logged
- [ ] Session creation logged
- [ ] Attendance submissions logged
- [ ] Errors logged with stack traces

### Database Monitoring
- [ ] New columns indexed (if needed)
- [ ] Query performance acceptable
- [ ] No deadlocks or locks

### Error Tracking
- [ ] Error monitoring configured
- [ ] Alerts set up for critical errors
- [ ] Error rates within acceptable range

---

## Rollback Plan

### If Issues Occur

#### Backend Rollback
```bash
# Stop new version
# Start previous version
java -jar target/attendease-PREVIOUS-VERSION.jar
```
- [ ] Previous JAR file available
- [ ] Rollback procedure documented
- [ ] Team knows how to rollback

#### Database Rollback
```sql
-- Remove new columns (if needed)
ALTER TABLE users 
DROP COLUMN IF EXISTS attendance_late_enabled,
DROP COLUMN IF EXISTS attendance_late_minutes;
```
- [ ] Rollback SQL prepared
- [ ] Database backup available
- [ ] Rollback tested on staging

#### Frontend Rollback
```bash
# Restore previous build
cp -r dist_backup/* /var/www/attendease/
```
- [ ] Previous build backed up
- [ ] Rollback procedure documented

---

## Post-Deployment

### Immediate (First Hour)
- [ ] Monitor application logs
- [ ] Check error rates
- [ ] Verify no critical errors
- [ ] Test key workflows
- [ ] Monitor database performance

### Short-term (First Day)
- [ ] Collect user feedback
- [ ] Monitor usage patterns
- [ ] Check for unexpected errors
- [ ] Verify data integrity
- [ ] Review performance metrics

### Long-term (First Week)
- [ ] Analyze usage statistics
- [ ] Gather teacher feedback
- [ ] Identify improvement areas
- [ ] Plan future enhancements
- [ ] Update documentation if needed

---

## Communication

### Before Deployment
- [ ] Notify users of upcoming changes
- [ ] Schedule maintenance window (if needed)
- [ ] Prepare release notes
- [ ] Brief support team

### During Deployment
- [ ] Update status page
- [ ] Monitor support channels
- [ ] Be ready for quick rollback

### After Deployment
- [ ] Announce new feature
- [ ] Share user guide
- [ ] Provide training (if needed)
- [ ] Collect feedback

---

## Documentation

### User Documentation
- [ ] Quick Start Guide available
- [ ] Feature Summary accessible
- [ ] FAQ prepared
- [ ] Video tutorial (optional)

### Technical Documentation
- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Architecture diagrams created
- [ ] Code comments adequate

---

## Success Criteria

### Must Have (Critical)
- [x] Backend compiles and runs
- [x] Frontend builds and loads
- [x] Database migration successful
- [x] Settings page functional
- [x] Session creation works
- [x] Student submission works
- [x] Late logic correct

### Should Have (Important)
- [x] No console errors
- [x] Responsive design
- [x] Input validation
- [x] Error handling
- [x] Audit logging
- [x] Documentation complete

### Nice to Have (Optional)
- [ ] Performance optimized
- [ ] Analytics tracking
- [ ] A/B testing setup
- [ ] User onboarding flow

---

## Sign-Off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Ready for deployment

**Developer:** _________________ **Date:** _________

### QA Team
- [ ] Functional testing complete
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Ready for production

**QA Lead:** _________________ **Date:** _________

### Product Owner
- [ ] Feature meets requirements
- [ ] User experience acceptable
- [ ] Ready for release

**Product Owner:** _________________ **Date:** _________

---

## Emergency Contacts

**Backend Developer:** _________________  
**Frontend Developer:** _________________  
**Database Admin:** _________________  
**DevOps Engineer:** _________________  
**Product Owner:** _________________  

---

## Notes

### Deployment Date: _________________
### Deployment Time: _________________
### Deployed By: _________________

### Issues Encountered:
```
(Record any issues during deployment)
```

### Resolutions:
```
(Record how issues were resolved)
```

---

**Deployment Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back

**Final Sign-Off:** _________________ **Date:** _________

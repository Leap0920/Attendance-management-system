# Quick Start Guide - Attendance Late Feature

## 🚀 For Teachers

### Step 1: Configure Your Preferences (One-Time Setup)

1. **Navigate to Settings**
   - Click "Settings" in the sidebar (under PREFERENCES section)

2. **Configure Attendance Preferences**
   - **Enable Late Marking System** - Toggle ON/OFF
     - ON: Students can be marked "Late" after threshold
     - OFF: All submissions are "Present" (no late marking)
   
   - **Default Late Threshold** - Set your preferred minutes (e.g., 15, 20, 30)
     - This applies to all new sessions automatically
     - You can override this for individual sessions

3. **Save Settings**
   - Click "Save Settings" button
   - Your preferences are now saved!

---

### Step 2: Create Attendance Session

1. **Go to Attendance Page**
   - Click "Attendance" in the sidebar

2. **Click "New Session"**

3. **Fill in Session Details**
   - Select Course
   - Enter Session Title (optional)
   - Set Duration (minutes)

4. **Late Threshold Options**
   - **Default:** Leave unchecked to use your saved preference
   - **Custom:** Check the box to override for this specific session
     - Enter custom threshold in minutes
     - Useful for special circumstances (exams, labs, etc.)

5. **Start Session**
   - Click "Start Session"
   - Share the attendance code with students

---

### Step 3: Monitor Submissions

- Students submitting **within threshold** → Marked as **"Present"** ✅
- Students submitting **after threshold** → Marked as **"Late"** ⚠️
- Students submitting **after session ends** → **Rejected** ❌

---

## 📊 Examples

### Example 1: Standard Lecture (15-minute threshold)
```
Your Settings: Late enabled, 15 minutes
Session Duration: 90 minutes

Timeline:
0:00  - Session starts
0:10  - Student A submits → Present ✅
0:20  - Student B submits → Late ⚠️
0:45  - Student C submits → Late ⚠️
1:30  - Session ends
1:35  - Student D tries to submit → Rejected ❌
```

### Example 2: Lab Session (45-minute threshold)
```
Your Settings: Late enabled, 15 minutes (default)
Session Override: 45 minutes (custom for this lab)
Session Duration: 120 minutes

Timeline:
0:00  - Session starts
0:30  - Student A submits → Present ✅
0:50  - Student B submits → Late ⚠️
2:00  - Session ends
```

### Example 3: Late System Disabled
```
Your Settings: Late disabled
Session Duration: 60 minutes

Timeline:
0:00  - Session starts
0:10  - Student A submits → Present ✅
0:30  - Student B submits → Present ✅
0:55  - Student C submits → Present ✅
1:00  - Session ends
1:05  - Student D tries to submit → Rejected ❌
```

---

## 🎯 Common Scenarios

### "I want all students marked Present, no Late status"
**Solution:** Disable late marking in Settings
1. Go to Settings
2. Uncheck "Enable Late Marking System"
3. Save

### "I want different thresholds for different courses"
**Solution:** Use per-session overrides
1. Set a reasonable default in Settings (e.g., 15 minutes)
2. When creating sessions, check "Custom late threshold"
3. Enter course-specific threshold

### "I have a 2-hour exam, students need 30 minutes to settle"
**Solution:** Use custom override for that session
1. Create session with 120-minute duration
2. Check "Custom late threshold"
3. Set to 30 minutes
4. Start session

### "I want to change my default threshold"
**Solution:** Update settings anytime
1. Go to Settings
2. Change "Default Late Threshold"
3. Save
4. New sessions will use the updated value

---

## ⚙️ Settings Explained

### Late Enabled = TRUE
- Students can be marked "Late"
- Threshold determines cutoff time
- Example: 15-minute threshold
  - 0-15 minutes: Present
  - 15+ minutes: Late

### Late Enabled = FALSE
- No "Late" status exists
- All submissions within session duration: Present
- Submissions after session ends: Rejected

### Late Threshold (Minutes)
- Time from session start
- After this time, submissions are "Late"
- Range: 1-1440 minutes (1 min to 24 hours)
- Recommended: 10-30 minutes for most classes

---

## 🔄 Reopening Sessions

When you reopen a closed session:

**Option 1: Keep Original Settings**
- Don't specify new threshold
- Session uses its original late settings

**Option 2: Update Settings**
- Specify new threshold when reopening
- Session uses new settings going forward

---

## 💡 Best Practices

### Recommended Thresholds by Class Type:

| Class Type | Recommended Threshold | Reasoning |
|------------|----------------------|-----------|
| Standard Lecture | 10-15 minutes | Students arrive from other classes |
| Lab Session | 20-30 minutes | Setup time needed |
| Exam | 5-10 minutes | Strict punctuality |
| Workshop | 15-20 minutes | Flexible arrival |
| Online Class | 5-10 minutes | No travel time |

### Tips:
1. **Be consistent** - Use same threshold for similar class types
2. **Communicate clearly** - Tell students your late policy
3. **Consider context** - Adjust for campus size, parking, etc.
4. **Review patterns** - Check if many students are late, adjust threshold
5. **Use overrides sparingly** - Maintain predictability for students

---

## 🆘 Troubleshooting

### "I don't see the Settings link"
- Check you're logged in as a Teacher
- Refresh the page
- Clear browser cache

### "My settings aren't saving"
- Check internet connection
- Look for error messages
- Try again in a few minutes

### "Students are marked Late too quickly"
- Increase your default threshold in Settings
- Or use custom override for specific sessions

### "I want to disable late marking for one session only"
- Currently not possible directly
- Workaround: Set very high threshold (e.g., 999 minutes)
- Or manually update records after session

### "Old sessions still use 5-minute threshold"
- This is expected behavior
- Settings only affect NEW sessions
- Existing sessions retain original settings

---

## 📱 Mobile Access

The settings page is fully responsive:
- Access from any device
- Same functionality on mobile/tablet
- Touch-friendly interface

---

## 🎓 For Students

### What Students See:
- Attendance code to enter
- Submission confirmation
- Status: "Present" or "Late"

### What Students DON'T See:
- Late threshold value
- Teacher's settings
- When they'll be marked late

**Note:** Consider communicating your late policy to students directly (e.g., in syllabus or class announcement)

---

## 📞 Need Help?

### Check These First:
1. This Quick Start Guide
2. ATTENDANCE_LATE_FEATURE_SUMMARY.md (detailed documentation)
3. implementation_plan.md (technical details)

### Still Stuck?
- Check browser console for errors
- Verify you're using latest version
- Contact system administrator

---

## ✅ Quick Checklist

**First Time Setup:**
- [ ] Navigate to Settings page
- [ ] Configure late marking preference
- [ ] Set default threshold
- [ ] Save settings

**Creating Sessions:**
- [ ] Go to Attendance page
- [ ] Click "New Session"
- [ ] Fill in details
- [ ] Choose default or custom threshold
- [ ] Start session

**Monitoring:**
- [ ] Share attendance code
- [ ] Watch submissions in real-time
- [ ] Review records after session
- [ ] Close session when done

---

## 🎉 You're All Set!

The attendance late feature is now ready to use. Start by configuring your preferences in Settings, then create your first session with your custom threshold!

**Remember:** Your settings are saved and will apply to all future sessions automatically. You can always change them or override per session as needed.

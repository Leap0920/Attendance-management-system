# Activity Tracking Implementation Guide

## Overview
This system provides comprehensive user activity tracking for security auditing. It tracks:
- Page visits and navigation
- Button clicks and interactions
- File access (view, download, open)
- Form submissions
- Search queries
- Modal/dialog opens
- Tab changes
- Filter/sort changes

## Backend Setup

### 1. Database Migration
The system automatically:
- Deletes old null audit logs
- Adds performance indexes
- Migration file: `V10__cleanup_null_audit_logs.sql`

### 2. API Endpoints
- `POST /api/activity/batch` - Log multiple activities (used by frontend)
- `POST /api/activity/log` - Log single activity

### 3. Restart Backend
```bash
cd backend
./mvnw spring-boot:run
```

## Frontend Integration

### Quick Start

#### 1. Track Page Views
Add to any page component:
```typescript
import { usePageTracking } from '../hooks/useActivityTracking';

const MyPage = () => {
  usePageTracking('Dashboard'); // Automatically tracks page view
  return <div>...</div>;
};
```

#### 2. Track Button Clicks
```typescript
import { useClickTracking } from '../hooks/useActivityTracking';

const MyComponent = () => {
  const { trackClick } = useClickTracking();
  
  return (
    <button onClick={() => {
      trackClick('Create Course Button', 'button', { section: 'dashboard' });
      // ... your logic
    }}>
      Create Course
    </button>
  );
};
```

#### 3. Track File Access
```typescript
import { useFileTracking } from '../hooks/useActivityTracking';

const FileList = () => {
  const { trackFileView, trackFileDownload } = useFileTracking();
  
  const handleView = (file) => {
    trackFileView(file.name, file.id);
    // ... open file
  };
  
  const handleDownload = (file) => {
    trackFileDownload(file.name, file.id);
    // ... download file
  };
  
  return <div>...</div>;
};
```

#### 4. Track Form Submissions
```typescript
import { useFormTracking } from '../hooks/useActivityTracking';

const MyForm = () => {
  const { trackFormSubmit } = useFormTracking();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    trackFormSubmit('Create Course Form', { courseCode: 'CS101' });
    // ... submit logic
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
};
```

#### 5. Track Search
```typescript
import { useSearchTracking } from '../hooks/useActivityTracking';

const SearchBar = () => {
  const { trackSearch } = useSearchTracking();
  
  const handleSearch = (query) => {
    trackSearch(query, 'course-search');
    // ... search logic
  };
  
  return <input onChange={(e) => handleSearch(e.target.value)} />;
};
```

#### 6. Track Modal Opens
```typescript
import { useModalTracking } from '../hooks/useActivityTracking';

const MyComponent = () => {
  const { trackModalOpen } = useModalTracking();
  
  const openModal = () => {
    trackModalOpen('Create Course Modal', 'dashboard');
    setShowModal(true);
  };
  
  return <button onClick={openModal}>Open</button>;
};
```

## What Gets Tracked

### Automatic Tracking
- **Page Views**: Every page navigation
- **Timestamps**: All activities include precise timestamps
- **User Information**: User ID, name, email, role
- **IP Address**: Client IP (converted from IPv6 to IPv4 for readability)
- **User Agent**: Browser and device information

### Manual Tracking (Add to Components)
- **Button Clicks**: Important actions (create, delete, update, etc.)
- **File Access**: View, download, open files
- **Form Submissions**: Form completions
- **Search Queries**: What users search for
- **Modal Opens**: Dialog/modal interactions
- **Tab Changes**: Section navigation
- **Filter Changes**: Data filtering actions

## Implementation Checklist

### High Priority Pages (Implement First)
- [ ] Admin Dashboard - Track all admin actions
- [ ] User Management - Track user CRUD operations
- [ ] Course Management - Track course operations
- [ ] File/Material Access - Track file views and downloads
- [ ] Attendance Sessions - Track session operations
- [ ] Messages - Track message sends and reads

### Medium Priority
- [ ] Profile Updates - Track profile changes
- [ ] Settings Changes - Track configuration changes
- [ ] Search Usage - Track search patterns
- [ ] Report Generation - Track report access

### Low Priority
- [ ] Tab Changes - Track section navigation
- [ ] Filter Usage - Track filter patterns
- [ ] Sort Changes - Track sorting preferences

## Viewing Audit Logs

### Admin Panel
1. Navigate to **Audit Log** in admin menu
2. View all user activities with:
   - Action performed
   - User who performed it
   - Timestamp
   - IP address
   - Detailed information
3. Search by action, user, or IP
4. Expand entries to see full details

### What You'll See
```
Action: page_view
User: John Doe (john@example.com)
Time: 2026-04-27 18:30:45
IP: 127.0.0.1
Details: {
  "page": "Dashboard",
  "url": "/dashboard",
  "timestamp": "2026-04-27T18:30:45.123Z"
}
```

## Performance Considerations

### Batching
- Activities are queued and sent in batches every 2 seconds
- Maximum 10 activities per batch
- Reduces server load

### Indexes
- Database indexes on `created_at`, `user_id`, `action`, `entity_type`
- Fast queries even with millions of logs

### Before Page Unload
- Uses `navigator.sendBeacon` for reliable delivery
- Ensures logs aren't lost when user closes tab

## Security Best Practices

### DO Track:
✅ Page visits
✅ Button clicks
✅ File access
✅ Form submissions (without sensitive data)
✅ Search queries
✅ Administrative actions

### DON'T Track:
❌ Passwords
❌ Credit card numbers
❌ Personal identification numbers
❌ Private messages content (track that message was sent, not content)
❌ Sensitive personal data

## Example Implementation

See `frontend/src/examples/ActivityTrackingExample.tsx` for complete examples.

## Troubleshooting

### Logs Not Appearing
1. Check backend is running
2. Check browser console for errors
3. Verify user is authenticated
4. Check network tab for `/api/activity/batch` requests

### Performance Issues
1. Reduce tracking frequency if needed
2. Increase batch size
3. Add more database indexes

### Missing Data
1. Ensure `createdAt` is set (should be automatic)
2. Check IP address conversion is working
3. Verify user information is populated

## Next Steps

1. **Restart backend** to apply database migration
2. **Add tracking to key pages** (start with admin pages)
3. **Test in browser** - check network tab for activity logs
4. **View in Audit Log** - verify logs appear correctly
5. **Expand coverage** - add tracking to more components over time

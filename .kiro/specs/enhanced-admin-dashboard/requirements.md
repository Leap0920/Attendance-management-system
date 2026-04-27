# Requirements Document: Enhanced Admin Dashboard

## Introduction

This document specifies the requirements for enhancing the admin dashboard with advanced analytics visualization and comprehensive security monitoring capabilities. The enhanced dashboard will provide administrators with interactive data visualizations for system metrics, user activity, and course statistics, alongside real-time security monitoring including IP tracking, failed login detection, IP blocking/whitelisting, and suspicious activity alerting.

The system builds upon the existing Java Spring Boot backend with AdminController, React/TypeScript frontend, PostgreSQL database with AuditLog and LoginAttempt entities, and existing audit logging infrastructure.

## Glossary

- **Admin_Dashboard**: The web-based administrative interface for system management and monitoring
- **Analytics_Engine**: The backend component responsible for aggregating and computing statistical data for visualization
- **Chart_Renderer**: The frontend component responsible for rendering interactive graphs and charts
- **Security_Monitor**: The backend component that tracks, analyzes, and alerts on security events
- **IP_Access_Controller**: The component that manages IP blocking and whitelisting functionality
- **Alert_Dispatcher**: The component that sends real-time notifications to administrators
- **Login_Tracker**: The component that monitors and records login attempts with IP addresses
- **Suspicious_Activity_Detector**: The component that identifies patterns indicating potential security threats
- **Time_Series_Data**: Metrics collected over time intervals (hourly, daily, weekly, monthly)
- **Security_Event**: Any occurrence related to authentication, authorization, or access control
- **Failed_Login_Threshold**: The maximum number of failed login attempts before triggering an alert
- **IP_Blocklist**: A list of IP addresses that are denied access to the system
- **IP_Whitelist**: A list of IP addresses that are always granted access regardless of other rules
- **Real_Time_Notification**: An alert delivered to administrators within 5 seconds of event detection
- **System_Health_Metric**: A measurable indicator of system performance or availability
- **Interactive_Chart**: A graph or visualization that responds to user interactions (hover, click, zoom, filter)
- **Dashboard_Widget**: A self-contained UI component displaying specific metrics or visualizations
- **Trend_Analysis**: Statistical computation identifying patterns in time-series data
- **Security_Dashboard**: A dedicated view displaying security-related metrics and events

## Requirements

### Requirement 1: Analytics Data Aggregation

**User Story:** As an administrator, I want the system to aggregate statistical data about users, courses, and system activity, so that I can visualize trends and patterns over time.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL compute user count statistics grouped by role (student, teacher, admin) for each time interval
2. THE Analytics_Engine SHALL compute course statistics including enrollment counts, active courses, and completion rates for each time interval
3. THE Analytics_Engine SHALL compute system activity metrics including login frequency, page views, and feature usage for each time interval
4. WHEN a time range is specified, THE Analytics_Engine SHALL aggregate data for that range with appropriate granularity (hourly for ranges ≤24 hours, daily for ranges ≤30 days, weekly for ranges ≤90 days, monthly for ranges >90 days)
5. THE Analytics_Engine SHALL compute trend percentages comparing current period to previous period for all metrics
6. THE Analytics_Engine SHALL cache aggregated results for 5 minutes to optimize performance
7. FOR ALL aggregated metrics, THE Analytics_Engine SHALL return results within 2 seconds for time ranges up to 1 year

### Requirement 2: Interactive Chart Visualization

**User Story:** As an administrator, I want to view interactive charts and graphs of system metrics, so that I can understand trends and identify patterns visually.

#### Acceptance Criteria

1. THE Chart_Renderer SHALL display line charts for time-series data with interactive tooltips showing exact values on hover
2. THE Chart_Renderer SHALL display bar charts for categorical comparisons with interactive filtering by category
3. THE Chart_Renderer SHALL display pie charts for proportional data with interactive segment selection
4. WHEN a user clicks on a chart element, THE Chart_Renderer SHALL display detailed drill-down data for that element
5. THE Chart_Renderer SHALL support zoom and pan interactions for time-series charts
6. THE Chart_Renderer SHALL update chart data automatically every 30 seconds when viewing real-time metrics
7. THE Chart_Renderer SHALL render charts within 1 second of receiving data
8. THE Chart_Renderer SHALL display loading indicators while fetching or rendering chart data
9. THE Chart_Renderer SHALL support exporting charts as PNG or SVG images

### Requirement 3: Dashboard Widget System

**User Story:** As an administrator, I want to customize my dashboard layout with different widgets, so that I can focus on the metrics most relevant to my needs.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide predefined widgets for user statistics, course statistics, login activity, security events, and system health
2. WHEN an administrator adds a widget, THE Admin_Dashboard SHALL display the widget with its default configuration
3. WHEN an administrator removes a widget, THE Admin_Dashboard SHALL remove the widget and persist the layout preference
4. THE Admin_Dashboard SHALL allow administrators to reorder widgets via drag-and-drop
5. THE Admin_Dashboard SHALL persist widget layout preferences per administrator user
6. THE Admin_Dashboard SHALL restore the administrator's saved layout on subsequent logins
7. WHEN a widget encounters an error loading data, THE Admin_Dashboard SHALL display an error message within the widget without affecting other widgets

### Requirement 4: Login Attempt Tracking

**User Story:** As an administrator, I want the system to track all login attempts with IP addresses and timestamps, so that I can monitor authentication activity.

#### Acceptance Criteria

1. WHEN a user attempts to login, THE Login_Tracker SHALL record the email, IP address, timestamp, and success status
2. THE Login_Tracker SHALL extract the client IP address from the X-Forwarded-For header if present, otherwise from the request remote address
3. THE Login_Tracker SHALL record login attempts regardless of authentication outcome (success or failure)
4. THE Login_Tracker SHALL store login attempt records in the login_attempts table
5. THE Login_Tracker SHALL retain login attempt records for 90 days
6. WHEN 90 days have elapsed, THE Login_Tracker SHALL automatically delete login attempt records older than 90 days
7. THE Login_Tracker SHALL record login attempts within 100 milliseconds without blocking the authentication flow

### Requirement 5: Failed Login Detection and Alerting

**User Story:** As an administrator, I want to receive alerts when multiple failed login attempts occur, so that I can respond to potential security threats.

#### Acceptance Criteria

1. THE Security_Monitor SHALL detect when a single IP address has 5 or more failed login attempts within a 15-minute window
2. THE Security_Monitor SHALL detect when a single email address has 5 or more failed login attempts from different IP addresses within a 15-minute window
3. WHEN the failed login threshold is exceeded, THE Security_Monitor SHALL create a security event with severity "high"
4. WHEN a security event is created, THE Alert_Dispatcher SHALL send a real-time notification to all active administrators
5. THE Security_Monitor SHALL include in the alert: the IP address or email, number of attempts, time window, and list of attempted emails or IPs
6. THE Security_Monitor SHALL check for failed login patterns every 60 seconds
7. THE Security_Monitor SHALL not send duplicate alerts for the same IP or email within a 1-hour period

### Requirement 6: IP Blocking and Whitelisting

**User Story:** As an administrator, I want to block or whitelist IP addresses, so that I can control access to the system based on network location.

#### Acceptance Criteria

1. WHEN an administrator adds an IP address to the blocklist, THE IP_Access_Controller SHALL deny all requests from that IP address
2. WHEN an administrator adds an IP address to the whitelist, THE IP_Access_Controller SHALL allow all requests from that IP address regardless of other security rules
3. THE IP_Access_Controller SHALL check the whitelist before the blocklist
4. WHEN a blocked IP attempts to access the system, THE IP_Access_Controller SHALL return HTTP 403 Forbidden
5. WHEN a blocked IP attempts to access the system, THE Security_Monitor SHALL log the blocked access attempt
6. THE IP_Access_Controller SHALL support CIDR notation for IP ranges (e.g., 192.168.1.0/24)
7. THE IP_Access_Controller SHALL support both IPv4 and IPv6 addresses
8. THE IP_Access_Controller SHALL cache the blocklist and whitelist in memory and refresh every 5 minutes
9. WHEN an administrator modifies the blocklist or whitelist, THE IP_Access_Controller SHALL apply changes within 10 seconds
10. THE Admin_Dashboard SHALL display the current blocklist and whitelist with add, remove, and edit capabilities

### Requirement 7: Suspicious Activity Detection

**User Story:** As an administrator, I want the system to automatically detect suspicious activity patterns, so that I can proactively address security threats.

#### Acceptance Criteria

1. THE Suspicious_Activity_Detector SHALL flag activity when a user account is accessed from 3 or more different countries within a 24-hour period
2. THE Suspicious_Activity_Detector SHALL flag activity when a user account is accessed from 5 or more different IP addresses within a 1-hour period
3. THE Suspicious_Activity_Detector SHALL flag activity when an administrator performs 10 or more destructive actions (delete, archive) within a 5-minute period
4. THE Suspicious_Activity_Detector SHALL flag activity when a single IP address attempts to access 20 or more different user accounts within a 10-minute period
5. WHEN suspicious activity is detected, THE Suspicious_Activity_Detector SHALL create a security event with severity "critical"
6. WHEN a critical security event is created, THE Alert_Dispatcher SHALL send a real-time notification to all active administrators
7. THE Suspicious_Activity_Detector SHALL analyze activity patterns every 2 minutes
8. THE Suspicious_Activity_Detector SHALL use IP geolocation data to determine country of origin for IP addresses

### Requirement 8: Security Event Dashboard

**User Story:** As an administrator, I want to view a dedicated security dashboard showing all security events and metrics, so that I can monitor the security posture of the system.

#### Acceptance Criteria

1. THE Security_Dashboard SHALL display a real-time feed of security events ordered by timestamp descending
2. THE Security_Dashboard SHALL display charts showing failed login attempts over time
3. THE Security_Dashboard SHALL display charts showing blocked IP access attempts over time
4. THE Security_Dashboard SHALL display charts showing suspicious activity detections over time
5. THE Security_Dashboard SHALL display a geographic map showing the origin of login attempts
6. THE Security_Dashboard SHALL allow filtering security events by severity (low, medium, high, critical)
7. THE Security_Dashboard SHALL allow filtering security events by type (failed_login, blocked_ip, suspicious_activity)
8. THE Security_Dashboard SHALL allow filtering security events by date range
9. THE Security_Dashboard SHALL display the current count of blocked IPs and whitelisted IPs
10. THE Security_Dashboard SHALL update automatically every 10 seconds when viewing real-time data

### Requirement 9: Real-Time Administrator Notifications

**User Story:** As an administrator, I want to receive real-time notifications for security events, so that I can respond immediately to threats.

#### Acceptance Criteria

1. WHEN a security event with severity "high" or "critical" is created, THE Alert_Dispatcher SHALL send a notification to all administrators with active sessions
2. THE Alert_Dispatcher SHALL deliver notifications via WebSocket connections to connected administrators
3. THE Alert_Dispatcher SHALL display notifications as toast messages in the Admin_Dashboard UI
4. THE Alert_Dispatcher SHALL deliver notifications within 5 seconds of security event creation
5. THE Alert_Dispatcher SHALL include in the notification: event type, severity, timestamp, and a brief description
6. WHEN an administrator clicks on a notification, THE Admin_Dashboard SHALL navigate to the relevant security event details
7. THE Admin_Dashboard SHALL display a notification badge showing the count of unread security events
8. THE Admin_Dashboard SHALL persist unread notification status per administrator
9. WHEN an administrator views a security event, THE Admin_Dashboard SHALL mark the corresponding notification as read

### Requirement 10: System Health Monitoring

**User Story:** As an administrator, I want to monitor system health metrics, so that I can ensure the system is operating normally.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL collect system health metrics including CPU usage, memory usage, and disk usage every 60 seconds
2. THE Analytics_Engine SHALL collect application metrics including active user sessions, database connection pool usage, and API response times every 60 seconds
3. THE Admin_Dashboard SHALL display current system health metrics with visual indicators (green for healthy, yellow for warning, red for critical)
4. WHEN CPU usage exceeds 80%, THE Analytics_Engine SHALL set the CPU health status to "warning"
5. WHEN CPU usage exceeds 95%, THE Analytics_Engine SHALL set the CPU health status to "critical"
6. WHEN memory usage exceeds 85%, THE Analytics_Engine SHALL set the memory health status to "warning"
7. WHEN memory usage exceeds 95%, THE Analytics_Engine SHALL set the memory health status to "critical"
8. WHEN disk usage exceeds 80%, THE Analytics_Engine SHALL set the disk health status to "warning"
9. WHEN disk usage exceeds 90%, THE Analytics_Engine SHALL set the disk health status to "critical"
10. WHEN any health metric reaches "critical" status, THE Alert_Dispatcher SHALL send a notification to all active administrators
11. THE Admin_Dashboard SHALL display historical system health metrics as time-series charts for the past 24 hours

### Requirement 11: API Endpoints for Analytics Data

**User Story:** As a frontend developer, I want RESTful API endpoints to retrieve analytics data, so that I can populate dashboard visualizations.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL expose a GET endpoint `/api/admin/analytics/users` that returns user statistics for a specified time range
2. THE Analytics_Engine SHALL expose a GET endpoint `/api/admin/analytics/courses` that returns course statistics for a specified time range
3. THE Analytics_Engine SHALL expose a GET endpoint `/api/admin/analytics/activity` that returns system activity metrics for a specified time range
4. THE Analytics_Engine SHALL expose a GET endpoint `/api/admin/analytics/trends` that returns trend comparisons for all metrics
5. WHEN a request includes query parameters `startDate` and `endDate`, THE Analytics_Engine SHALL return data for that date range
6. WHEN a request omits date range parameters, THE Analytics_Engine SHALL default to the past 30 days
7. THE Analytics_Engine SHALL validate that `startDate` is before `endDate` and return HTTP 400 Bad Request if invalid
8. THE Analytics_Engine SHALL return HTTP 401 Unauthorized for requests without valid administrator authentication
9. THE Analytics_Engine SHALL return data in JSON format with consistent structure across all endpoints

### Requirement 12: API Endpoints for Security Management

**User Story:** As a frontend developer, I want RESTful API endpoints to manage security features, so that I can implement security management UI.

#### Acceptance Criteria

1. THE Security_Monitor SHALL expose a GET endpoint `/api/admin/security/events` that returns paginated security events
2. THE Security_Monitor SHALL expose a GET endpoint `/api/admin/security/login-attempts` that returns paginated login attempts with filtering by IP, email, and date range
3. THE IP_Access_Controller SHALL expose a GET endpoint `/api/admin/security/blocklist` that returns all blocked IP addresses
4. THE IP_Access_Controller SHALL expose a POST endpoint `/api/admin/security/blocklist` that adds an IP address to the blocklist
5. THE IP_Access_Controller SHALL expose a DELETE endpoint `/api/admin/security/blocklist/{ip}` that removes an IP address from the blocklist
6. THE IP_Access_Controller SHALL expose a GET endpoint `/api/admin/security/whitelist` that returns all whitelisted IP addresses
7. THE IP_Access_Controller SHALL expose a POST endpoint `/api/admin/security/whitelist` that adds an IP address to the whitelist
8. THE IP_Access_Controller SHALL expose a DELETE endpoint `/api/admin/security/whitelist/{ip}` that removes an IP address from the whitelist
9. WHEN an invalid IP address format is provided, THE IP_Access_Controller SHALL return HTTP 400 Bad Request with a descriptive error message
10. THE Security_Monitor SHALL return HTTP 401 Unauthorized for requests without valid administrator authentication

### Requirement 13: Data Export Functionality

**User Story:** As an administrator, I want to export analytics and security data to CSV or JSON formats, so that I can perform offline analysis or reporting.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide an export button for each analytics chart
2. WHEN an administrator clicks the export button, THE Admin_Dashboard SHALL display format options (CSV, JSON)
3. WHEN CSV format is selected, THE Analytics_Engine SHALL generate a CSV file with appropriate headers and data rows
4. WHEN JSON format is selected, THE Analytics_Engine SHALL generate a JSON file with structured data
5. THE Admin_Dashboard SHALL trigger a browser download of the exported file
6. THE Admin_Dashboard SHALL include the date range and metric type in the exported filename
7. THE Analytics_Engine SHALL generate export files within 5 seconds for datasets up to 10,000 records
8. THE Security_Monitor SHALL provide export functionality for security events with the same format options
9. THE Security_Monitor SHALL include all event fields in exports: timestamp, type, severity, description, IP address, user email

### Requirement 14: Responsive Dashboard Design

**User Story:** As an administrator, I want the dashboard to work well on different screen sizes, so that I can monitor the system from various devices.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display in a single-column layout on screens smaller than 768px width
2. THE Admin_Dashboard SHALL display in a two-column layout on screens between 768px and 1024px width
3. THE Admin_Dashboard SHALL display in a three-column layout on screens larger than 1024px width
4. THE Chart_Renderer SHALL resize charts automatically when the viewport size changes
5. THE Admin_Dashboard SHALL maintain chart readability by adjusting font sizes and element spacing for smaller screens
6. THE Admin_Dashboard SHALL provide a collapsible sidebar navigation on screens smaller than 768px width
7. THE Admin_Dashboard SHALL render all interactive elements with touch-friendly sizes (minimum 44x44 pixels) on mobile devices

### Requirement 15: Performance Optimization

**User Story:** As an administrator, I want the dashboard to load and respond quickly, so that I can efficiently monitor and manage the system.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL load the initial view within 2 seconds on a standard broadband connection (5 Mbps)
2. THE Analytics_Engine SHALL use database indexes on timestamp, user_id, and ip_address columns for query optimization
3. THE Analytics_Engine SHALL implement pagination for all list endpoints with a default page size of 20 records
4. THE Chart_Renderer SHALL implement lazy loading for charts not currently visible in the viewport
5. THE Admin_Dashboard SHALL implement code splitting to load chart libraries only when needed
6. THE Analytics_Engine SHALL use database connection pooling with a minimum of 10 connections
7. THE Admin_Dashboard SHALL cache static assets with appropriate cache headers (1 hour for JS/CSS, 1 day for images)
8. THE Chart_Renderer SHALL debounce chart resize operations to occur at most once per 250 milliseconds

### Requirement 16: Accessibility Compliance

**User Story:** As an administrator with accessibility needs, I want the dashboard to be accessible via keyboard and screen readers, so that I can use all features effectively.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide keyboard navigation for all interactive elements with visible focus indicators
2. THE Admin_Dashboard SHALL support standard keyboard shortcuts (Tab for navigation, Enter/Space for activation, Escape for closing modals)
3. THE Chart_Renderer SHALL provide text alternatives for all charts via ARIA labels describing the chart type and data summary
4. THE Admin_Dashboard SHALL provide ARIA live regions for real-time notifications and updates
5. THE Admin_Dashboard SHALL maintain a logical tab order following the visual layout
6. THE Admin_Dashboard SHALL use semantic HTML elements (nav, main, section, article) for proper document structure
7. THE Admin_Dashboard SHALL ensure color contrast ratios meet WCAG 2.1 Level AA standards (4.5:1 for normal text, 3:1 for large text)
8. THE Chart_Renderer SHALL provide data tables as an alternative view for chart data accessible via a toggle button

### Requirement 17: Error Handling and User Feedback

**User Story:** As an administrator, I want clear error messages and feedback when operations fail, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN an API request fails, THE Admin_Dashboard SHALL display a user-friendly error message describing the issue
2. WHEN a network error occurs, THE Admin_Dashboard SHALL display a message indicating connectivity issues and offer a retry option
3. WHEN an authentication error occurs, THE Admin_Dashboard SHALL redirect to the login page with a message indicating session expiration
4. WHEN a validation error occurs, THE Admin_Dashboard SHALL highlight the invalid fields and display specific validation messages
5. WHEN a successful operation completes, THE Admin_Dashboard SHALL display a success message for 3 seconds
6. THE Admin_Dashboard SHALL log all errors to the browser console with sufficient detail for debugging
7. THE Analytics_Engine SHALL return structured error responses with HTTP status codes, error codes, and descriptive messages
8. WHEN the Analytics_Engine encounters a database error, it SHALL return HTTP 500 Internal Server Error without exposing sensitive database details

### Requirement 18: IP Geolocation Integration

**User Story:** As an administrator, I want to see the geographic location of IP addresses, so that I can identify the origin of login attempts and security events.

#### Acceptance Criteria

1. THE Security_Monitor SHALL integrate with an IP geolocation service to resolve IP addresses to geographic locations
2. THE Security_Monitor SHALL cache geolocation results for 24 hours to minimize external API calls
3. WHEN displaying login attempts, THE Admin_Dashboard SHALL show the country and city for each IP address
4. WHEN displaying security events, THE Admin_Dashboard SHALL show the country and city for each IP address
5. THE Security_Dashboard SHALL display a world map with markers indicating the geographic distribution of login attempts
6. WHEN an IP geolocation lookup fails, THE Security_Monitor SHALL display "Unknown Location" without failing the entire request
7. THE Security_Monitor SHALL perform geolocation lookups asynchronously without blocking request processing
8. THE Security_Monitor SHALL rate-limit geolocation API calls to 100 requests per minute to comply with service limits

### Requirement 19: Audit Logging for Security Actions

**User Story:** As an administrator, I want all security-related actions to be logged, so that there is an audit trail for compliance and investigation.

#### Acceptance Criteria

1. WHEN an administrator adds an IP to the blocklist, THE Security_Monitor SHALL create an audit log entry with action "add_ip_blocklist"
2. WHEN an administrator removes an IP from the blocklist, THE Security_Monitor SHALL create an audit log entry with action "remove_ip_blocklist"
3. WHEN an administrator adds an IP to the whitelist, THE Security_Monitor SHALL create an audit log entry with action "add_ip_whitelist"
4. WHEN an administrator removes an IP from the whitelist, THE Security_Monitor SHALL create an audit log entry with action "remove_ip_whitelist"
5. WHEN an administrator views security events, THE Security_Monitor SHALL create an audit log entry with action "view_security_events"
6. WHEN an administrator exports security data, THE Security_Monitor SHALL create an audit log entry with action "export_security_data"
7. THE Security_Monitor SHALL include in each audit log: administrator user ID, action, timestamp, IP address, and affected entity details
8. THE Security_Monitor SHALL retain audit logs indefinitely for compliance purposes

### Requirement 20: Configuration Management for Security Thresholds

**User Story:** As an administrator, I want to configure security thresholds and parameters, so that I can tune the security monitoring to my organization's needs.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a settings page for configuring security parameters
2. THE Admin_Dashboard SHALL allow administrators to configure the failed login threshold (default: 5 attempts)
3. THE Admin_Dashboard SHALL allow administrators to configure the failed login time window (default: 15 minutes)
4. THE Admin_Dashboard SHALL allow administrators to configure the login attempt retention period (default: 90 days)
5. THE Admin_Dashboard SHALL allow administrators to configure the suspicious activity thresholds for each detection rule
6. THE Admin_Dashboard SHALL allow administrators to enable or disable individual suspicious activity detection rules
7. WHEN an administrator updates a security parameter, THE Security_Monitor SHALL apply the new value within 60 seconds
8. THE Security_Monitor SHALL validate that threshold values are within acceptable ranges (e.g., failed login threshold between 3 and 20)
9. WHEN an invalid threshold value is provided, THE Admin_Dashboard SHALL display a validation error and prevent saving
10. THE Security_Monitor SHALL store security configuration in the settings table with appropriate defaults

## Correctness Properties for Property-Based Testing

### Property 1: Analytics Aggregation Invariants

**Property:** For any time range, the sum of user counts by role SHALL equal the total user count for that time range.

**Test Strategy:** Generate random time ranges and verify that `countByRole("student") + countByRole("teacher") + countByRole("admin") == totalUsers` for each range.

### Property 2: Time Series Data Ordering

**Property:** For any time-series analytics data, timestamps SHALL be in ascending order and contain no duplicates.

**Test Strategy:** Generate random time ranges and verify that returned time-series data has strictly increasing timestamps with no gaps or duplicates.

### Property 3: Failed Login Detection Idempotence

**Property:** Running the failed login detection algorithm multiple times on the same dataset SHALL produce identical results.

**Test Strategy:** Generate a dataset of login attempts, run detection twice, and verify both runs produce the same security events.

### Property 4: IP Address Validation Round-Trip

**Property:** For any valid IP address (IPv4 or IPv6) or CIDR range, parsing and then formatting SHALL produce the original input.

**Test Strategy:** Generate random valid IP addresses and CIDR ranges, parse them, format them back to strings, and verify equality with the original input.

### Property 5: Blocklist and Whitelist Precedence

**Property:** For any IP address in both blocklist and whitelist, the whitelist SHALL take precedence and the IP SHALL be allowed.

**Test Strategy:** Generate random IP addresses, add them to both lists, attempt access, and verify access is granted.

### Property 6: Security Event Severity Ordering

**Property:** When filtering security events by severity, events with higher severity SHALL appear before events with lower severity when sorted by severity descending.

**Test Strategy:** Generate random security events with different severities, sort by severity descending, and verify the order matches the severity hierarchy (critical > high > medium > low).

### Property 7: Chart Data Consistency

**Property:** For any analytics metric, the sum of data points in a detailed view SHALL equal the aggregated value in the summary view.

**Test Strategy:** Generate random time ranges, fetch both detailed and summary data, and verify that summing detailed data points equals the summary value.

### Property 8: Export and Import Round-Trip

**Property:** Exporting analytics data to JSON and then parsing it SHALL produce data equivalent to the original dataset.

**Test Strategy:** Generate random analytics datasets, export to JSON, parse the JSON, and verify all fields match the original data.

### Property 9: Geolocation Cache Consistency

**Property:** For any IP address, multiple geolocation lookups within the cache period SHALL return identical results.

**Test Strategy:** Generate random IP addresses, perform geolocation lookup twice within the cache period, and verify both results are identical.

### Property 10: Notification Delivery Guarantee

**Property:** For any security event with severity "high" or "critical", at least one notification SHALL be created for each active administrator.

**Test Strategy:** Generate random security events with high/critical severity, simulate multiple active administrators, and verify each administrator receives exactly one notification per event.

### Property 11: Date Range Validation

**Property:** For any analytics request, if startDate is after endDate, the system SHALL reject the request with HTTP 400.

**Test Strategy:** Generate random date pairs where startDate > endDate, make API requests, and verify all return HTTP 400.

### Property 12: Pagination Consistency

**Property:** For any paginated endpoint, fetching all pages and concatenating results SHALL produce the same dataset as fetching without pagination (up to the total count).

**Test Strategy:** Generate random datasets, fetch with pagination (all pages), fetch without pagination, and verify the concatenated paginated results equal the non-paginated results.

### Property 13: Suspicious Activity Detection Monotonicity

**Property:** Adding more suspicious events to a dataset SHALL never decrease the number of detected suspicious activities.

**Test Strategy:** Generate a baseline dataset, run detection, add more suspicious events, run detection again, and verify the count of detected activities is greater than or equal to the baseline.

### Property 14: Widget Layout Persistence

**Property:** For any administrator, saving a widget layout and then loading it SHALL restore the exact same layout configuration.

**Test Strategy:** Generate random widget layouts, save them, reload the dashboard, and verify the restored layout matches the saved configuration.

### Property 15: Audit Log Completeness

**Property:** For any security action performed, exactly one audit log entry SHALL be created with all required fields populated.

**Test Strategy:** Generate random security actions (add/remove blocklist/whitelist), perform them, and verify each action produces exactly one audit log with non-null required fields.

## Non-Functional Requirements

### Performance

- Analytics API endpoints SHALL respond within 2 seconds for time ranges up to 1 year
- Chart rendering SHALL complete within 1 second of receiving data
- Dashboard initial load SHALL complete within 2 seconds on standard broadband
- Security event detection SHALL process patterns every 60 seconds with <100ms processing time
- Real-time notifications SHALL be delivered within 5 seconds of event creation

### Scalability

- The system SHALL support up to 100 concurrent administrator sessions
- The system SHALL handle up to 10,000 login attempts per hour
- The system SHALL store and query up to 1 million security events efficiently
- The Analytics_Engine SHALL handle time-series data for up to 5 years of historical data

### Security

- All API endpoints SHALL require administrator authentication
- All security actions SHALL be logged in the audit trail
- IP addresses SHALL be validated before adding to blocklist or whitelist
- Geolocation API keys SHALL be stored securely and not exposed to the frontend
- WebSocket connections for notifications SHALL be authenticated and encrypted

### Reliability

- The dashboard SHALL remain functional if individual widgets fail to load
- The system SHALL continue operating if the geolocation service is unavailable
- Failed notification deliveries SHALL be retried up to 3 times with exponential backoff
- Database connection failures SHALL be handled gracefully with appropriate error messages

### Maintainability

- Analytics queries SHALL use database indexes for optimal performance
- Security detection rules SHALL be configurable without code changes
- Chart components SHALL be reusable across different dashboard views
- API endpoints SHALL follow RESTful conventions and consistent naming patterns

### Usability

- The dashboard SHALL provide contextual help tooltips for all security features
- Error messages SHALL be user-friendly and actionable
- Charts SHALL include legends and axis labels for clarity
- The UI SHALL provide visual feedback for all user actions within 200 milliseconds

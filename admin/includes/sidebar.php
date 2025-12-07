<aside class="sidebar">
    <div class="sidebar-header">
        <a href="dashboard.php" class="sidebar-logo">
            <div class="logo-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <h2>AttendEase</h2>
        </a>
    </div>

    <nav class="sidebar-nav">
        <div class="nav-section">
            <div class="nav-section-title">Main Menu</div>
            <a href="dashboard.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'dashboard.php' ? 'active' : ''; ?>">
                <i class="fas fa-home"></i>
                <span>Dashboard</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">Management</div>
            <a href="users.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'users.php' ? 'active' : ''; ?>">
                <i class="fas fa-users"></i>
                <span>Users</span>
            </a>
            <a href="courses.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'courses.php' ? 'active' : ''; ?>">
                <i class="fas fa-book"></i>
                <span>Courses</span>
            </a>
            <a href="attendance.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'attendance.php' ? 'active' : ''; ?>">
                <i class="fas fa-calendar-check"></i>
                <span>Attendance</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">Analytics</div>
            <a href="reports.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'reports.php' ? 'active' : ''; ?>">
                <i class="fas fa-chart-bar"></i>
                <span>Reports</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">System</div>
            <a href="audit-log.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'audit-log.php' ? 'active' : ''; ?>">
                <i class="fas fa-history"></i>
                <span>Audit Log</span>
            </a>
            <a href="settings.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'settings.php' ? 'active' : ''; ?>">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </a>
        </div>
    </nav>

    <div class="sidebar-footer">
        <div class="user-card">
            <div class="avatar-initials" style="background: linear-gradient(135deg, var(--primary), var(--purple));">
                <?php echo getInitials($user['first_name'], $user['last_name']); ?>
            </div>
            <div class="user-info">
                <div class="user-name"><?php echo $user['full_name']; ?></div>
                <div class="user-role">Administrator</div>
            </div>
            <a href="../api/auth/logout.php" class="btn btn-icon btn-ghost" title="Logout">
                <i class="fas fa-sign-out-alt"></i>
            </a>
        </div>
    </div>
</aside>
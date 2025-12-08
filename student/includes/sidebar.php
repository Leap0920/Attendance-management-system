<aside class="sidebar">
    <div class="sidebar-header">
        <a href="dashboard.php" class="sidebar-logo">
            <div class="logo-icon"><i class="fas fa-graduation-cap"></i></div>
            <h2>AttendEase</h2>
        </a>
        <button class="sidebar-close-btn" onclick="toggleSidebar()" aria-label="Close menu"><i class="fas fa-times"></i></button>
    </div>

    <nav class="sidebar-nav">
        <div class="nav-section">
            <div class="nav-section-title">Main Menu</div>
            <a href="dashboard.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'dashboard.php' ? 'active' : ''; ?>">
                <i class="fas fa-home"></i><span>Dashboard</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">Learning</div>
            <a href="courses.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'courses.php' ? 'active' : ''; ?>">
                <i class="fas fa-book"></i><span>My Courses</span>
            </a>
            <a href="attendance.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'attendance.php' ? 'active' : ''; ?>">
                <i class="fas fa-calendar-check"></i><span>Attendance</span>
            </a>
            <a href="materials.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'materials.php' ? 'active' : ''; ?>">
                <i class="fas fa-file-alt"></i><span>Materials</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">Communication</div>
            <a href="messages.php"
                class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'messages.php' ? 'active' : ''; ?>">
                <i class="fas fa-envelope"></i><span>Messages</span>
            </a>
        </div>
    </nav>

    <div class="sidebar-footer">
        <div class="user-card">
            <div class="avatar-initials" style="background: linear-gradient(135deg, var(--success), var(--primary));">
                <?php echo getInitials($user['first_name'], $user['last_name']); ?>
            </div>
            <div class="user-info">
                <div class="user-name"><?php echo $user['full_name']; ?></div>
                <div class="user-role">Student</div>
            </div>
                <a href="javascript:void(0)" class="btn btn-icon btn-ghost logout-link" title="Logout" onclick="if(confirm('Are you sure you want to logout?')) { window.location.href='../api/auth/logout.php'; }"><i
                    class="fas fa-sign-out-alt"></i></a>
        </div>
    </div>
</aside>
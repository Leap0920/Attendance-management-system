<header class="top-header">
    <button class="mobile-menu-btn" onclick="toggleSidebar()" aria-label="Toggle menu"><i class="fas fa-bars"></i></button>

    <div class="search-bar">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Search users, courses..." id="globalSearch">
    </div>

    <div class="header-right">
        <button class="notification-btn">
            <i class="fas fa-bell"></i>
            <span class="badge-dot"></span>
        </button>
        <div class="header-date">
            <i class="fas fa-calendar"></i>
            <span><?php echo date('l, F j, Y'); ?></span>
        </div>
    </div>
</header>
// Dashboard JavaScript Functions

// Modal Functions
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on outside click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });

        // close mobile sidebar if open
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('__mobile_sidebar_overlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }

        if (overlay) {
            overlay.classList.remove('active');
            // remove overlay after transition
            setTimeout(() => overlay.remove(), 300);
        }

        document.body.classList.remove('no-scroll');
    }
});

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirm Delete
function confirmDelete(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global Search
const globalSearch = document.getElementById('globalSearch');
if (globalSearch) {
    globalSearch.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            // Implement search logic
            console.log('Searching:', query);
        }
    }, 300));
}

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const overlayId = '__mobile_sidebar_overlay';
    let overlay = document.getElementById(overlayId);

    const isActive = sidebar.classList.toggle('active');

    // update mobile menu button aria state
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');

    // manage body scroll
    if (isActive) {
        document.body.classList.add('no-scroll');
        // create overlay if not exists
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = overlayId;
            overlay.className = 'sidebar-overlay active';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                    // remove overlay after animation
                    setTimeout(() => {
                        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 300);
            });
        } else {
            overlay.classList.add('active');
        }
    } else {
        document.body.classList.remove('no-scroll');
        if (overlay) overlay.classList.remove('active');
        // remove overlay after animation
        if (overlay) setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
        const menuBtn = document.querySelector('.mobile-menu-btn');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    });
}

// Add animation classes on scroll
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.animate-fade-in');
    elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }
    });
};

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Make course cards clickable but ignore clicks on controls inside them
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.course-card[data-course-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('form') || e.target.closest('a') || e.target.closest('button')) return;
            const id = card.getAttribute('data-course-id');
            if (id) window.location.href = 'course.php?id=' + id;
        });
    });
});

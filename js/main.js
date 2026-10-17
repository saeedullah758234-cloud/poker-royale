/**
 * ═══════════════════════════════════════════════════════
 *  POKER ROYALE — MAIN GLOBAL JAVASCRIPT
 *  Version: 1.0.0
 *  Description: Core utilities, UI interactions, and
 *               shared functions for all pages.
 * ═══════════════════════════════════════════════════════
 */

// ─── GLOBAL CONFIG ───
const CONFIG = {
    siteName: 'PokerRoyale',
    currency: 'USD',
    currencySymbol: '$',
    apiBaseURL: 'http://localhost:3001/api',
    socketURL: 'http://localhost:3001',
    tokenKey: 'poker_royale_token',
    userKey: 'poker_royale_user',
    themeKey: 'poker_royale_theme',
    soundKey: 'poker_royale_sound',
    defaultLocale: 'en',
    maxUploadSize: 5 * 1024 * 1024, // 5MB
    toastDuration: 4000,
    animDuration: 300,
    debounceDelay: 300,
};

// ─── APP STATE ───
const AppState = {
    isLoggedIn: false,
    currentUser: null,
    balance: 0,
    bonusBalance: 0,
    soundEnabled: true,
    activeModal: null,
    activePage: '',
    connectionStatus: 'online',
};

// ═══════════════════════════════════════════
//  1. INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🃏 ${CONFIG.siteName} — Initializing...`);

    initPreloader();
    initNavbar();
    initMobileMenu();
    initScrollReveal();
    initCounters();
    initSmoothScroll();
    initBackToTop();
    initTooltips();
    initLazyLoading();
    initLiveStats();
    checkAuthStatus();
    initPageSpecific();

    console.log(`✅ ${CONFIG.siteName} — Ready!`);
});

// ═══════════════════════════════════════════
//  2. PRELOADER
// ═══════════════════════════════════════════

function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }, 800);
    });
}

// ═══════════════════════════════════════════
//  3. NAVBAR
// ═══════════════════════════════════════════

function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastScroll = 0;
    const scrollThreshold = 50;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        // Add/remove scrolled class
        if (currentScroll > scrollThreshold) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show on scroll direction (optional)
        if (currentScroll > lastScroll && currentScroll > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    }, { passive: true });
}

// ═══════════════════════════════════════════
//  4. MOBILE MENU
// ═══════════════════════════════════════════

function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
        navLinks.classList.toggle('mobile-open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open', 'mobile-open');
            document.body.style.overflow = '';
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open', 'mobile-open');
            document.body.style.overflow = '';
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open', 'mobile-open');
            document.body.style.overflow = '';
        }
    });
}

// ═══════════════════════════════════════════
//  5. SCROLL REVEAL ANIMATIONS
// ═══════════════════════════════════════════

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale');
    if (revealElements.length === 0) return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || (index * 80);
                setTimeout(() => {
                    entry.target.classList.add('active', 'revealed');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════
//  6. COUNTER ANIMATIONS
// ═══════════════════════════════════════════

function initCounters() {
    const counters = document.querySelectorAll('[data-target], .counter');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target || element.textContent.replace(/[^0-9]/g, ''));
    const duration = parseInt(element.dataset.duration) || 2000;
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);

        element.textContent = prefix + formatNumber(current) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = prefix + formatNumber(target) + suffix;
        }
    }

    requestAnimationFrame(update);
}

// ═══════════════════════════════════════════
//  7. SMOOTH SCROLL
// ═══════════════════════════════════════════

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ═══════════════════════════════════════════
//  8. BACK TO TOP BUTTON
// ═══════════════════════════════════════════

function initBackToTop() {
    let btn = document.getElementById('backToTop');

    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'backToTop';
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btn.setAttribute('aria-label', 'Back to top');
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E94560, #FF6B6B)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.1rem',
            zIndex: '999',
            opacity: '0',
            transform: 'translateY(20px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(233,69,96,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        document.body.appendChild(btn);
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.style.opacity = '1';
            btn.style.transform = 'translateY(0)';
        } else {
            btn.style.opacity = '0';
            btn.style.transform = 'translateY(20px)';
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-3px)';
        btn.style.boxShadow = '0 8px 30px rgba(233,69,96,0.6)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = window.scrollY > 400 ? 'translateY(0)' : 'translateY(20px)';
        btn.style.boxShadow = '0 4px 20px rgba(233,69,96,0.4)';
    });
}

// ═══════════════════════════════════════════
//  9. TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════

function showToast(message, type = 'success', duration = CONFIG.toastDuration) {
    // Remove existing toasts
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    const colors = {
        success: { bg: 'rgba(0,200,83,0.15)', border: 'rgba(0,200,83,0.3)', text: '#00C853' },
        error: { bg: 'rgba(233,69,96,0.15)', border: 'rgba(233,69,96,0.3)', text: '#E94560' },
        warning: { bg: 'rgba(255,215,0,0.15)', border: 'rgba(255,215,0,0.3)', text: '#FFD700' },
        info: { bg: 'rgba(0,212,255,0.15)', border: 'rgba(0,212,255,0.3)', text: '#00D4FF' }
    };

    const c = colors[type] || colors.info;

    Object.assign(toast.style, {
        position: 'fixed',
        top: '24px',
        right: '24px',
        padding: '14px 22px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.9rem',
        fontWeight: '600',
        zIndex: '10000',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        backdropFilter: 'blur(20px)',
        transform: 'translateX(120%)',
        transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        maxWidth: '400px',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
    });

    toast.innerHTML = `<i class="${icons[type]}" style="font-size:1.1rem"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ═══════════════════════════════════════════
//  10. MODAL SYSTEM
// ═══════════════════════════════════════════

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('open', 'active');
    document.body.style.overflow = 'hidden';
    AppState.activeModal = modalId;

    // Close on backdrop click
    modal.addEventListener('click', function handler(e) {
        if (e.target === modal) {
            closeModal(modalId);
            modal.removeEventListener('click', handler);
        }
    });

    // Close on Escape
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', handler);
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('open', 'active');
    document.body.style.overflow = '';
    AppState.activeModal = null;
}

// ═══════════════════════════════════════════
//  11. TOOLTIPS
// ═══════════════════════════════════════════

function initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.addEventListener('mouseenter', function() {
            const text = this.dataset.tooltip;
            const tip = document.createElement('div');
            tip.className = 'custom-tooltip';
            tip.textContent = text;
            Object.assign(tip.style, {
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.9)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: '9999',
                pointerEvents: 'none',
                fontFamily: "'Inter', sans-serif"
            });
            this.style.position = 'relative';
            this.appendChild(tip);
        });

        el.addEventListener('mouseleave', function() {
            const tip = this.querySelector('.custom-tooltip');
            if (tip) tip.remove();
        });
    });
}

// ═══════════════════════════════════════════
//  12. LAZY LOADING IMAGES
// ═══════════════════════════════════════════

function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if (images.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.addEventListener('load', () => img.classList.add('loaded'));
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => observer.observe(img));
}

// ═══════════════════════════════════════════
//  13. LIVE STATS SIMULATION
// ═══════════════════════════════════════════

function initLiveStats() {
    // Live player count
    const playerCount = document.querySelector('.live-players, [data-live="players"]');
    if (playerCount) {
        setInterval(() => {
            const base = 12847;
            const variation = Math.floor(Math.random() * 300) - 150;
            playerCount.textContent = (base + variation).toLocaleString();
        }, 5000);
    }

    // Live pot amount
    const potAmount = document.querySelector('[data-live="pot"]');
    if (potAmount) {
        setInterval(() => {
            const base = 125000;
            const variation = Math.floor(Math.random() * 10000) - 5000;
            potAmount.textContent = formatCurrency(base + variation);
        }, 8000);
    }
}

// ═══════════════════════════════════════════
//  14. AUTHENTICATION HELPERS
// ═══════════════════════════════════════════

function checkAuthStatus() {
    const token = getLocalStorage(CONFIG.tokenKey);
    const user = getLocalStorage(CONFIG.userKey);

    if (token && user) {
        AppState.isLoggedIn = true;
        AppState.currentUser = typeof user === 'string' ? JSON.parse(user) : user;
        updateUIForLoggedInUser();
    } else {
        AppState.isLoggedIn = false;
        AppState.currentUser = null;
    }
}

function updateUIForLoggedInUser() {
    // Update balance display
    const balanceEls = document.querySelectorAll('.balance-amount, .wallet-balance, .bal');
    balanceEls.forEach(el => {
        if (AppState.currentUser?.balance) {
            el.textContent = formatCurrency(AppState.currentUser.balance);
        }
    });

    // Update user name
    const userEls = document.querySelectorAll('.user-name, .uname');
    userEls.forEach(el => {
        if (AppState.currentUser?.name) {
            el.textContent = AppState.currentUser.name;
        }
    });
}

function login(token, userData) {
    setLocalStorage(CONFIG.tokenKey, token);
    setLocalStorage(CONFIG.userKey, JSON.stringify(userData));
    AppState.isLoggedIn = true;
    AppState.currentUser = userData;
    updateUIForLoggedInUser();
    showToast('Welcome back, ' + userData.name + '! 🎉', 'success');
}

function logout() {
    removeLocalStorage(CONFIG.tokenKey);
    removeLocalStorage(CONFIG.userKey);
    AppState.isLoggedIn = false;
    AppState.currentUser = null;
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 1000);
}

// ═══════════════════════════════════════════
//  15. LOCAL STORAGE UTILITIES
// ═══════════════════════════════════════════

function setLocalStorage(key, value, expiryHours = null) {
    const item = {
        value: value,
        timestamp: Date.now(),
        expiry: expiryHours ? Date.now() + (expiryHours * 3600000) : null
    };
    try {
        localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
        console.warn('LocalStorage full or unavailable:', e);
    }
}

function getLocalStorage(key) {
    try {
        const item = JSON.parse(localStorage.getItem(key));
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch (e) {
        return null;
    }
}

function removeLocalStorage(key) {
    localStorage.removeItem(key);
}

function clearAllStorage() {
    localStorage.clear();
    sessionStorage.clear();
}

// ═══════════════════════════════════════════
//  16. CURRENCY & NUMBER FORMATTING
// ═══════════════════════════════════════════

function formatCurrency(amount, currency = CONFIG.currency) {
    const symbols = { USD: '$', EUR: '€', GBP: '£', PKR: 'PKR ', INR: '₹' };
    const symbol = symbols[currency] || '$';

    if (amount >= 1000000) {
        return symbol + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return symbol + (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1) + 'K';
    }
    return symbol + amount.toLocaleString();
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
    return num.toLocaleString();
}

function formatChips(amount) {
    return CONFIG.currencySymbol + parseInt(amount).toLocaleString();
}

// ═══════════════════════════════════════════
//  17. DATE & TIME UTILITIES
// ═══════════════════════════════════════════

function formatDate(dateStr, format = 'short') {
    const date = new Date(dateStr);
    const options = {
        short: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' },
        full: { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    };
    return date.toLocaleDateString('en-US', options[format] || options.short);
}

function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

function startCountdown(targetDate, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const update = () => {
        const now = new Date().getTime();
        const target = new Date(targetDate).getTime();
        const diff = target - now;

        if (diff <= 0) {
            el.innerHTML = '<span>STARTED!</span>';
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);

        el.innerHTML = `
            <span class="cd-d">${String(days).padStart(2, '0')}</span>d
            <span class="cd-h">${String(hours).padStart(2, '0')}</span>h
            <span class="cd-m">${String(mins).padStart(2, '0')}</span>m
            <span class="cd-s">${String(secs).padStart(2, '0')}</span>s
        `;
    };

    update();
    setInterval(update, 1000);
}

// ═══════════════════════════════════════════
//  18. FORM VALIDATION HELPERS
// ═══════════════════════════════════════════

const Validators = {
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    phone: (val) => /^(\+\d{1,3})?[\s-]?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}$/.test(val),
    password: (val) => val.length >= 8 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /\d/.test(val),
    username: (val) => /^[a-zA-Z0-9_]{3,20}$/.test(val),
    required: (val) => val.trim().length > 0,
    minLength: (val, min) => val.length >= min,
    maxLength: (val, max) => val.length <= max,
    numeric: (val) => /^\d+$/.test(val),
    url: (val) => /^https?:\/\/.+\..+/.test(val),
    age18: (dob) => {
        const age = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
        return age >= 18;
    }
};

function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return { valid: false, errors: ['Form not found'] };

    let isValid = true;
    const errors = [];

    for (const [fieldId, fieldRules] of Object.entries(rules)) {
        const input = document.getElementById(fieldId);
        if (!input) continue;

        const value = input.value.trim();

        for (const rule of fieldRules) {
            let passed = true;

            if (rule.type === 'required') passed = Validators.required(value);
            else if (rule.type === 'email') passed = Validators.email(value);
            else if (rule.type === 'phone') passed = Validators.phone(value);
            else if (rule.type === 'password') passed = Validators.password(value);
            else if (rule.type === 'minLength') passed = Validators.minLength(value, rule.value);
            else if (rule.type === 'age18') passed = Validators.age18(value);

            if (!passed) {
                isValid = false;
                errors.push({ field: fieldId, message: rule.message });
                input.classList.add('error');
                input.classList.remove('success');
                break;
            } else {
                input.classList.remove('error');
                input.classList.add('success');
            }
        }
    }

    return { valid: isValid, errors };
}

// ═══════════════════════════════════════════
//  19. API HELPER FUNCTIONS
// ═══════════════════════════════════════════

async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.apiBaseURL}${endpoint}`;
    const token = getLocalStorage(CONFIG.tokenKey);

    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    if (mergedOptions.body && typeof mergedOptions.body === 'object') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
    }

    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error.message);
        return { success: false, error: error.message };
    }
}

// Shorthand methods
const API = {
    get: (endpoint) => apiRequest(endpoint),
    post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
    put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body }),
    delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

// ═══════════════════════════════════════════
//  20. UTILITY FUNCTIONS
// ═══════════════════════════════════════════

// Debounce
function debounce(func, delay = CONFIG.debounceDelay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

// Throttle
function throttle(func, limit = 200) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard!', 'success');
}

// Generate random ID
function generateId(prefix = 'TXN') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

// Shuffle array
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Get random item
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Sleep/delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════
//  21. SOUND MANAGER
// ═══════════════════════════════════════════

const SoundManager = {
    sounds: {},
    enabled: true,

    init() {
        this.enabled = getLocalStorage(CONFIG.soundKey) !== 'false';
    },

    load(name, src) {
        this.sounds[name] = new Audio(src);
        this.sounds[name].preload = 'auto';
    },

    play(name, volume = 0.5) {
        if (!this.enabled || !this.sounds[name]) return;
        const sound = this.sounds[name].cloneNode();
        sound.volume = volume;
        sound.play().catch(() => {});
    },

    toggle() {
        this.enabled = !this.enabled;
        setLocalStorage(CONFIG.soundKey, this.enabled);
        return this.enabled;
    }
};

// ═══════════════════════════════════════════
//  22. PAGE-SPECIFIC INITIALIZATION
// ═══════════════════════════════════════════

function initPageSpecific() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    AppState.activePage = page;

    switch (page) {
        case 'index.html':
        case '':
            initHomePage();
            break;
        case 'lobby.html':
            initLobbyPage();
            break;
        case 'table.html':
            initTablePage();
            break;
        case 'tournaments.html':
            initTournamentsPage();
            break;
        case 'cashier.html':
            initCashierPage();
            break;
        case 'profile.html':
            initProfilePage();
            break;
        case 'leaderboard.html':
            initLeaderboardPage();
            break;
        case 'promotions.html':
            initPromotionsPage();
            break;
        case 'login.html':
        case 'register.html':
            initAuthPage();
            break;
    }
}

function initHomePage() {
    // Parallax hero
    window.addEventListener('scroll', throttle(() => {
        const hero = document.querySelector('.hero-bg img');
        if (hero && window.scrollY < window.innerHeight) {
            hero.style.transform = `translateY(${window.scrollY * 0.3}px)`;
        }
    }, 16));
}

function initLobbyPage() {
    // Search filter debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            if (typeof applyFilters === 'function') applyFilters();
        }, 300));
    }
}

function initTablePage() {
    // Prevent accidental page leave
    window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
    });
}

function initTournamentsPage() {
    // Auto-refresh tournament list every 30s
    setInterval(() => {
        if (typeof applyFilters === 'function') applyFilters();
    }, 30000);
}

function initCashierPage() {
    // Amount input formatting
    document.querySelectorAll('.amount-input').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9.]/g, '');
        });
    });
}

function initProfilePage() {
    // Tab persistence
    const activeTab = getLocalStorage('active_profile_tab');
    if (activeTab && typeof switchTab === 'function') {
        switchTab(activeTab);
    }
}

function initLeaderboardPage() {
    // Auto-refresh every 60s
    setInterval(() => {
        if (typeof filterTable === 'function') filterTable();
    }, 60000);
}

function initPromotionsPage() {
    // Nothing specific needed
}

function initAuthPage() {
    // Redirect if already logged in
    if (AppState.isLoggedIn) {
        window.location.href = '/lobby.html';
    }
}

// ═══════════════════════════════════════════
//  23. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════

document.addEventListener('keydown', (e) => {
    // Ctrl+K = Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const search = document.querySelector('.search-box input, #searchInput, #tourneySearch');
        if (search) search.focus();
    }

    // Escape = Close modals
    if (e.key === 'Escape') {
        if (AppState.activeModal) {
            closeModal(AppState.activeModal);
        }
    }
});

// ═══════════════════════════════════════════
//  24. CONNECTION STATUS
// ═══════════════════════════════════════════

window.addEventListener('online', () => {
    AppState.connectionStatus = 'online';
    showToast('Connection restored! 🟢', 'success');
});

window.addEventListener('offline', () => {
    AppState.connectionStatus = 'offline';
    showToast('You are offline. Please check your connection. 🔴', 'error');
});

// ═══════════════════════════════════════════
//  25. PERFORMANCE MONITORING
// ═══════════════════════════════════════════

window.addEventListener('load', () => {
    if (window.performance) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`⚡ Page load time: ${loadTime}ms`);
    }
});

// ─── EXPORT FOR GLOBAL USE ───
window.PokerRoyale = {
    CONFIG,
    AppState,
    showToast,
    openModal,
    closeModal,
    formatCurrency,
    formatNumber,
    formatDate,
    timeAgo,
    copyToClipboard,
    generateId,
    debounce,
    throttle,
    Validators,
    validateForm,
    API,
    login,
    logout,
    SoundManager,
    startCountdown,
    setLocalStorage,
    getLocalStorage,
    removeLocalStorage,
};

console.log('🃏 PokerRoyale Main.js — Loaded Successfully');
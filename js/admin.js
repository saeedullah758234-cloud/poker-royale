/**
 * ═══════════════════════════════════════════════════════
 *  PokerRoyale — Admin Panel JavaScript
 *  Version: 1.0.0
 *  Description: Complete Super Admin Dashboard Logic
 *  Base URL: http://localhost:3000/admin
 *  API URL:  http://localhost:3001/api/admin
 * ═══════════════════════════════════════════════════════
 */

// ─── ADMIN CONFIG ───
const ADMIN = {
    name: 'PokerRoyale Admin',
    version: '1.0.0',
    apiBase: 'http://localhost:3001/api/admin',
    refreshInterval: 30000, // 30 seconds
    sessionTimeout: 30 * 60 * 1000,
    currency: 'USD',
    currencySymbol: '$',
};

// ═══════════════════════════════════════════
//  1. INITIALIZATION
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    console.log(`🔐 ${ADMIN.name} v${ADMIN.version} — Loaded`);

    checkAdminAuth();
    initSidebar();
    initTopbar();
    initDashboard();
    initDataTables();
    initCharts();
    initModals();
    initForms();
    initNotifications();
    initLiveUpdates();
    initSearch();
    initExport();
    initDarkMode();
    initKeyboardShortcuts();
});

// ═══════════════════════════════════════════
//  2. ADMIN AUTHENTICATION CHECK
// ═══════════════════════════════════════════
function checkAdminAuth() {
    const token = localStorage.getItem('pr_admin_token');
    const role = localStorage.getItem('pr_admin_role');

    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    if (role !== 'super_admin' && role !== 'finance_admin' &&
        role !== 'game_admin' && role !== 'support_admin' &&
        role !== 'marketing_admin') {
        showToast('Unauthorized access', 'error');
        window.location.href = '/admin/login.html';
        return;
    }

    // Update admin info in topbar
    const adminName = localStorage.getItem('pr_admin_name') || 'Super Admin';
    const adminEl = document.querySelector('.admin-name');
    if (adminEl) adminEl.textContent = adminName;

    const roleEl = document.querySelector('.admin-role');
    if (roleEl) roleEl.textContent = role.replace('_', ' ').toUpperCase();
}

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('pr_admin_token');
        localStorage.removeItem('pr_admin_role');
        localStorage.removeItem('pr_admin_name');
        window.location.href = '/admin/login.html';
    }
}

// ═══════════════════════════════════════════
//  3. SIDEBAR NAVIGATION
// ═══════════════════════════════════════════
function initSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const navItems = document.querySelectorAll('.sidebar-nav a');

    if (!sidebar || !toggleBtn) return;

    // Toggle sidebar collapse
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        document.querySelector('.admin-main').classList.toggle('expanded');
        localStorage.setItem('pr_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore sidebar state
    if (localStorage.getItem('pr_sidebar_collapsed') === 'true') {
        sidebar.classList.add('collapsed');
        document.querySelector('.admin-main')?.classList.add('expanded');
    }

    // Active nav item
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            item.classList.add('active');
            item.closest('.nav-group')?.classList.add('open');
        }

        item.addEventListener('click', function (e) {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Collapsible nav groups
    document.querySelectorAll('.nav-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.closest('.nav-group');
            group.classList.toggle('open');
        });
    });

    // Mobile sidebar
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

// ═══════════════════════════════════════════
//  4. TOPBAR FUNCTIONALITY
// ═══════════════════════════════════════════
function initTopbar() {
    // Search
    const searchInput = document.querySelector('.topbar-search input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                globalSearch(query);
            }
        }, 300));
    }

    // Notification bell
    const notifBell = document.querySelector('.notif-bell');
    const notifPanel = document.querySelector('.notif-panel');
    if (notifBell && notifPanel) {
        notifBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('open');
            if (notifPanel.classList.contains('open')) {
                loadNotifications();
            }
        });

        document.addEventListener('click', () => {
            notifPanel.classList.remove('open');
        });
    }

    // Admin dropdown
    const adminDropdown = document.querySelector('.admin-dropdown');
    const adminMenu = document.querySelector('.admin-menu');
    if (adminDropdown && adminMenu) {
        adminDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            adminMenu.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            adminMenu.classList.remove('open');
        });
    }

    // Fullscreen toggle
    const fsBtn = document.querySelector('.fullscreen-btn');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }
}

// ═══════════════════════════════════════════
//  5. DASHBOARD WIDGETS
// ═══════════════════════════════════════════
function initDashboard() {
    if (!document.querySelector('.admin-dashboard')) return;

    loadDashboardStats();
    loadRevenueChart();
    loadActivityFeed();
    loadTopPlayers();
    loadSystemHealth();

    // Auto-refresh dashboard every 30 seconds
    setInterval(() => {
        loadDashboardStats();
        loadActivityFeed();
    }, ADMIN.refreshInterval);
}

async function loadDashboardStats() {
    try {
        // Simulated data (replace with API call)
        const stats = {
            totalUsers: 52847,
            activePlayers: 12847,
            revenueToday: 45230,
            pendingWithdrawals: 23,
            activeTables: 156,
            activeTournaments: 24,
            newRegistrations: 342,
            totalDeposits: 128500,
            totalWithdrawals: 87200,
            rakeEarned: 12450
        };

        updateStatCard('totalUsers', stats.totalUsers, '+12%');
        updateStatCard('activePlayers', stats.activePlayers, '+5%');
        updateStatCard('revenueToday', formatCurrency(stats.revenueToday), '+18%');
        updateStatCard('pendingWithdrawals', stats.pendingWithdrawals, '-3');
        updateStatCard('activeTables', stats.activeTables, '+8');
        updateStatCard('activeTournaments', stats.activeTournaments, '+2');

    } catch (error) {
        console.error('Dashboard stats error:', error);
    }
}

function updateStatCard(id, value, trend) {
    const card = document.querySelector(`[data-stat="${id}"]`);
    if (!card) return;

    const valueEl = card.querySelector('.stat-value');
    const trendEl = card.querySelector('.stat-trend');

    if (valueEl) {
        animateValue(valueEl, value);
    }

    if (trendEl) {
        trendEl.textContent = trend;
        const isPositive = trend.startsWith('+');
        trendEl.className = `stat-trend ${isPositive ? 'positive' : 'negative'}`;
    }
}

function animateValue(element, newValue) {
    const oldValue = element.textContent;
    element.style.opacity = '0.5';
    setTimeout(() => {
        element.textContent = typeof newValue === 'number' ? newValue.toLocaleString() : newValue;
        element.style.opacity = '1';
    }, 200);
}

// ═══════════════════════════════════════════
//  6. CHARTS (Chart.js Integration)
// ═══════════════════════════════════════════
let chartInstances = {};

function initCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Charts disabled.');
        return;
    }

    Chart.defaults.color = '#8892B0';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = 'Inter, sans-serif';
}

function loadRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (chartInstances.revenue) chartInstances.revenue.destroy();

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const deposits = [45000, 52000, 48000, 61000, 55000, 67000, 72000, 68000, 75000, 82000, 78000, 95000];
    const withdrawals = [32000, 38000, 35000, 42000, 40000, 48000, 52000, 49000, 55000, 60000, 57000, 68000];
    const rake = [5200, 6100, 5800, 7200, 6500, 7800, 8400, 7900, 8800, 9600, 9100, 11200];

    chartInstances.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Deposits',
                    data: deposits,
                    borderColor: '#00C853',
                    backgroundColor: 'rgba(0,200,83,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Withdrawals',
                    data: withdrawals,
                    borderColor: '#E94560',
                    backgroundColor: 'rgba(233,69,96,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Rake Revenue',
                    data: rake,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255,215,0,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(10,10,26,0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (val) => '$' + (val / 1000) + 'K'
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function loadPlayerGrowthChart() {
    const ctx = document.getElementById('playerGrowthChart');
    if (!ctx) return;

    if (chartInstances.playerGrowth) chartInstances.playerGrowth.destroy();

    chartInstances.playerGrowth = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'New Registrations',
                data: [120, 190, 150, 220, 280, 340, 310],
                backgroundColor: 'rgba(0,212,255,0.6)',
                borderColor: '#00D4FF',
                borderWidth: 1,
                borderRadius: 6
            }, {
                label: 'Active Players',
                data: [8500, 9200, 8800, 10500, 12000, 14500, 13200],
                backgroundColor: 'rgba(123,47,247,0.6)',
                borderColor: '#7B2FF7',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function loadPaymentMethodChart() {
    const ctx = document.getElementById('paymentMethodChart');
    if (!ctx) return;

    if (chartInstances.paymentMethod) chartInstances.paymentMethod.destroy();

    chartInstances.paymentMethod = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['PayPal', 'Skrill', 'Bank Transfer', 'Visa', 'MasterCard', 'Crypto'],
            datasets: [{
                data: [35, 20, 18, 12, 10, 5],
                backgroundColor: [
                    '#003087', '#862165', '#0066B2',
                    '#1A1F71', '#EB001B', '#F7931A'
                ],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 16 }
                }
            }
        }
    });
}

function loadActivityHeatmap() {
    const ctx = document.getElementById('activityHeatmap');
    if (!ctx) return;

    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [];

    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const peak = (h >= 18 && h <= 23) || (h >= 12 && h <= 14);
            const weekend = d >= 5;
            const base = peak ? 80 : 30;
            const bonus = weekend ? 20 : 0;
            data.push({
                x: h,
                y: d,
                v: Math.floor(base + bonus + Math.random() * 20)
            });
        }
    }

    if (chartInstances.heatmap) chartInstances.heatmap.destroy();

    chartInstances.heatmap = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Activity',
                data: data,
                backgroundColor: data.map(d =>
                    `rgba(233,69,96,${d.v / 100})`
                ),
                pointRadius: 8,
                pointHoverRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    min: 0, max: 23,
                    ticks: { stepSize: 3 },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                },
                y: {
                    min: 0, max: 6,
                    ticks: {
                        callback: (val) => days[val] || ''
                    },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
//  7. DATA TABLES
// ═══════════════════════════════════════════
function initDataTables() {
    document.querySelectorAll('.data-table').forEach(table => {
        initSortableTable(table);
    });
}

function initSortableTable(table) {
    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const colIndex = Array.from(header.parentNode.children).indexOf(header);
            const isAsc = header.classList.contains('sort-asc');

            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(isAsc ? 'sort-desc' : 'sort-asc');

            rows.sort((a, b) => {
                let aVal = a.children[colIndex]?.textContent.trim() || '';
                let bVal = b.children[colIndex]?.textContent.trim() || '';

                // Try numeric sort
                const aNum = parseFloat(aVal.replace(/[$,]/g, ''));
                const bNum = parseFloat(bVal.replace(/[$,]/g, ''));

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return isAsc ? bNum - aNum : aNum - bNum;
                }

                return isAsc
                    ? bVal.localeCompare(aVal)
                    : aVal.localeCompare(bVal);
            });

            rows.forEach(row => tbody.appendChild(row));
        });
    });
}

function filterTable(tableId, query) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const lowerQuery = query.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(lowerQuery) ? '' : 'none';
    });
}

function paginateTable(tableId, page, perPage = 20) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const totalPages = Math.ceil(rows.length / perPage);

    rows.forEach((row, index) => {
        const rowPage = Math.floor(index / perPage) + 1;
        row.style.display = rowPage === page ? '' : 'none';
    });

    updatePaginationControls(tableId, page, totalPages);
}

function updatePaginationControls(tableId, currentPage, totalPages) {
    const container = document.querySelector(`#${tableId}-pagination`);
    if (!container) return;

    let html = '';

    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}"
             onclick="paginateTable('${tableId}', ${currentPage - 1})">
             <i class="fas fa-chevron-left"></i></button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}"
                     onclick="paginateTable('${tableId}', ${i})">${i}</button>`;
        } else if (Math.abs(i - currentPage) === 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}"
             onclick="paginateTable('${tableId}', ${currentPage + 1})">
             <i class="fas fa-chevron-right"></i></button>`;

    container.innerHTML = html;
}

// ═══════════════════════════════════════════
//  8. USER MANAGEMENT
// ═══════════════════════════════════════════
const AdminUsers = {
    async loadUsers(page = 1, filters = {}) {
        try {
            const params = new URLSearchParams({ page, ...filters });
            const response = await fetch(`${ADMIN.apiBase}/users?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_admin_token')}` }
            });
            const data = await response.json();
            this.renderUsersTable(data.users);
            paginateTable('usersTable', page);
        } catch (error) {
            this.renderDemoUsers();
        }
    },

    renderDemoUsers() {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;

        const users = [
            { id: 1, name: 'Ali Khan', username: 'poker_king', email: 'ali@gmail.com', status: 'active', kyc: 'verified', balance: 1250, deposits: 5000, withdrawals: 3500, joined: '2024-01-15' },
            { id: 2, name: 'Sara Malik', username: 'bluff_queen', email: 'sara@gmail.com', status: 'active', kyc: 'verified', balance: 3200, deposits: 8000, withdrawals: 4500, joined: '2024-02-20' },
            { id: 3, name: 'Ahmed Raza', username: 'ace_master', email: 'ahmed@gmail.com', status: 'active', kyc: 'pending', balance: 750, deposits: 2000, withdrawals: 1200, joined: '2024-03-10' },
            { id: 4, name: 'John Smith', username: 'johnny_poker', email: 'john@gmail.com', status: 'suspended', kyc: 'verified', balance: 0, deposits: 1500, withdrawals: 1500, joined: '2024-01-05' },
            { id: 5, name: 'Fatima Noor', username: 'fatima_n', email: 'fatima@gmail.com', status: 'active', kyc: 'verified', balance: 5600, deposits: 12000, withdrawals: 6000, joined: '2024-04-12' },
        ];

        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>#${u.id}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:50%;background:var(--glass);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--gold);">${u.name[0]}</div>
                        <div>
                            <div style="font-weight:600;">${u.name}</div>
                            <div style="font-size:.72rem;color:var(--text-muted);">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td><span class="status-badge ${u.status}">${u.status}</span></td>
                <td><span class="status-badge ${u.kyc}">${u.kyc}</span></td>
                <td style="font-family:'Orbitron';font-weight:700;">$${u.balance.toLocaleString()}</td>
                <td style="color:var(--green);">$${u.deposits.toLocaleString()}</td>
                <td style="color:var(--accent);">$${u.withdrawals.toLocaleString()}</td>
                <td>${u.joined}</td>
                <td>
                    <div style="display:flex;gap:6px;">
                        <button class="action-btn view" onclick="AdminUsers.viewUser(${u.id})" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="AdminUsers.editUser(${u.id})" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="action-btn ban" onclick="AdminUsers.banUser(${u.id})" title="Ban"><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    viewUser(id) {
        showToast(`Loading user #${id} details...`, 'info');
        // window.location.href = `user-detail.html?id=${id}`;
    },

    editUser(id) {
        showToast(`Opening editor for user #${id}`, 'info');
    },

    banUser(id) {
        if (confirm(`Are you sure you want to ban user #${id}?`)) {
            showToast(`User #${id} has been banned`, 'success');
        }
    },

    adjustBalance(userId) {
        openModal('adjustBalanceModal');
        document.getElementById('adjustUserId').value = userId;
    }
};

// ═══════════════════════════════════════════
//  9. FINANCIAL MANAGEMENT
// ═══════════════════════════════════════════
const AdminFinance = {
    async loadWithdrawals(status = 'pending') {
        try {
            const response = await fetch(`${ADMIN.apiBase}/withdrawals?status=${status}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_admin_token')}` }
            });
            const data = await response.json();
            this.renderWithdrawals(data.withdrawals);
        } catch (error) {
            this.renderDemoWithdrawals();
        }
    },

    renderDemoWithdrawals() {
        const tbody = document.querySelector('#withdrawalsTable tbody');
        if (!tbody) return;

        const withdrawals = [
            { id: 'TXN-94821', user: 'Ali Khan', amount: 1250, method: 'PayPal', account: 'ali@paypal.com', date: '2025-01-20 14:32', status: 'pending', risk: 'low' },
            { id: 'TXN-94820', user: 'Sara Malik', amount: 3200, method: 'Bank Transfer', account: 'PK36HABB0012345678', date: '2025-01-20 12:15', status: 'pending', risk: 'low' },
            { id: 'TXN-94819', user: 'Ahmed Raza', amount: 750, method: 'Skrill', account: 'ahmed@skrill.com', date: '2025-01-20 10:45', status: 'pending', risk: 'medium' },
            { id: 'TXN-94818', user: 'Fatima Noor', amount: 5600, method: 'Crypto (USDT)', account: '0x1234...5678', date: '2025-01-19 22:10', status: 'processing', risk: 'low' },
            { id: 'TXN-94817', user: 'John Smith', amount: 800, method: 'Visa', account: '****4532', date: '2025-01-19 18:30', status: 'completed', risk: 'low' },
        ];

        tbody.innerHTML = withdrawals.map(w => `
            <tr>
                <td style="font-family:'Orbitron';font-size:.78rem;">${w.id}</td>
                <td><strong>${w.user}</strong></td>
                <td style="font-family:'Orbitron';font-weight:700;color:var(--accent);">$${w.amount.toLocaleString()}</td>
                <td>${w.method}</td>
                <td style="font-size:.8rem;">${w.account}</td>
                <td>${w.date}</td>
                <td><span class="status-badge ${w.status}">${w.status}</span></td>
                <td><span class="risk-badge risk-${w.risk}">${w.risk}</span></td>
                <td>
                    ${w.status === 'pending' ? `
                        <button class="action-btn approve" onclick="AdminFinance.approveWithdrawal('${w.id}')" title="Approve"><i class="fas fa-check"></i></button>
                        <button class="action-btn reject" onclick="AdminFinance.rejectWithdrawal('${w.id}')" title="Reject"><i class="fas fa-times"></i></button>
                        <button class="action-btn hold" onclick="AdminFinance.holdWithdrawal('${w.id}')" title="Hold"><i class="fas fa-pause"></i></button>
                    ` : '<span style="color:var(--text-muted);font-size:.78rem;">Processed</span>'}
                </td>
            </tr>
        `).join('');
    },

    approveWithdrawal(txnId) {
        if (confirm(`Approve withdrawal ${txnId}?`)) {
            showToast(`Withdrawal ${txnId} approved!`, 'success');
            this.loadWithdrawals();
        }
    },

    rejectWithdrawal(txnId) {
        const reason = prompt('Rejection reason:');
        if (reason) {
            showToast(`Withdrawal ${txnId} rejected`, 'error');
            this.loadWithdrawals();
        }
    },

    holdWithdrawal(txnId) {
        showToast(`Withdrawal ${txnId} placed on hold`, 'warning');
    },

    batchApprove() {
        const selected = document.querySelectorAll('#withdrawalsTable input[type="checkbox"]:checked');
        if (selected.length === 0) {
            showToast('No withdrawals selected', 'warning');
            return;
        }
        if (confirm(`Approve ${selected.length} withdrawals?`)) {
            showToast(`${selected.length} withdrawals approved!`, 'success');
        }
    }
};

// ═══════════════════════════════════════════
//  10. GAME MANAGEMENT
// ═══════════════════════════════════════════
const AdminGames = {
    loadActiveTables() {
        const container = document.getElementById('activeTablesGrid');
        if (!container) return;

        const tables = [
            { id: 1, name: 'Royal Flush Lounge', game: 'NL Hold\'em', stakes: '$2/$5', players: '7/9', pot: 1250, rake: 62, status: 'active' },
            { id: 2, name: 'Diamond Players', game: 'NL Hold\'em', stakes: '$10/$25', players: '9/9', pot: 4500, rake: 225, status: 'full' },
            { id: 3, name: 'Omaha Masters', game: 'PL Omaha', stakes: '$5/$10', players: '6/6', pot: 1820, rake: 91, status: 'full' },
            { id: 4, name: 'High Roller VIP', game: 'NL Hold\'em', stakes: '$50/$100', players: '4/6', pot: 12500, rake: 625, status: 'active' },
            { id: 5, name: 'Beginner Friendly', game: 'NL Hold\'em', stakes: '$0.5/$1', players: '8/9', pot: 45, rake: 2, status: 'active' },
            { id: 6, name: 'Short Deck Showdown', game: 'NL Short Deck', stakes: '$2/$5', players: '5/6', pot: 740, rake: 37, status: 'active' },
        ];

        container.innerHTML = tables.map(t => `
            <div class="game-monitor-card">
                <div class="gmc-header">
                    <span class="gmc-status ${t.status}"><span class="dot"></span> ${t.status.toUpperCase()}</span>
                    <span class="gmc-id">#${t.id}</span>
                </div>
                <h4 class="gmc-name">${t.name}</h4>
                <div class="gmc-meta">
                    <span><i class="fas fa-gamepad"></i> ${t.game}</span>
                    <span><i class="fas fa-coins"></i> ${t.stakes}</span>
                </div>
                <div class="gmc-stats">
                    <div><div class="gmc-val">${t.players}</div><div class="gmc-lbl">Players</div></div>
                    <div><div class="gmc-val" style="color:var(--gold)">$${t.pot.toLocaleString()}</div><div class="gmc-lbl">Pot</div></div>
                    <div><div class="gmc-val" style="color:var(--green)">$${t.rake}</div><div class="gmc-lbl">Rake</div></div>
                </div>
                <div class="gmc-actions">
                    <button class="action-btn view" onclick="AdminGames.viewTable(${t.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="action-btn warn" onclick="AdminGames.pauseTable(${t.id})"><i class="fas fa-pause"></i> Pause</button>
                    <button class="action-btn reject" onclick="AdminGames.closeTable(${t.id})"><i class="fas fa-times"></i> Close</button>
                </div>
            </div>
        `).join('');
    },

    viewTable(id) { showToast(`Opening table #${id} monitor...`, 'info'); },
    pauseTable(id) { showToast(`Table #${id} paused`, 'warning'); },
    closeTable(id) {
        if (confirm(`Close table #${id}? All players will be refunded.`)) {
            showToast(`Table #${id} closed`, 'success');
        }
    }
};

// ═══════════════════════════════════════════
//  11. TOURNAMENT MANAGEMENT
// ═══════════════════════════════════════════
const AdminTournaments = {
    loadTournaments() {
        const tbody = document.querySelector('#adminTournamentsTable tbody');
        if (!tbody) return;

        const tournaments = [
            { id: 1, name: 'Sunday Million', type: 'MTT', buyin: 250, prize: 50000, players: '642/1000', status: 'registering', start: '2025-01-26 18:00' },
            { id: 2, name: 'Daily Freeroll', type: 'Freeroll', buyin: 0, prize: 2500, players: '1420/2000', status: 'registering', start: '2025-01-21 20:00' },
            { id: 3, name: 'High Roller Super', type: 'MTT', buyin: 1000, prize: 25000, players: '88/150', status: 'running', start: '2025-01-20 14:00' },
            { id: 4, name: 'Omaha PKO Blast', type: 'PKO', buyin: 75, prize: 5000, players: '310/500', status: 'registering', start: '2025-01-21 22:00' },
            { id: 5, name: 'Mega Satellite', type: 'Satellite', buyin: 15, prize: 2500, players: '230/300', status: 'running', start: '2025-01-20 16:00' },
        ];

        tbody.innerHTML = tournaments.map(t => `
            <tr>
                <td><strong>${t.name}</strong><br><span style="font-size:.72rem;color:var(--text-muted)">${t.type}</span></td>
                <td style="font-family:'Orbitron';color:var(--gold)">${t.buyin === 0 ? 'FREE' : '$' + t.buyin}</td>
                <td style="font-family:'Orbitron';font-weight:700;color:var(--green)">$${t.prize.toLocaleString()}</td>
                <td>${t.players}</td>
                <td><span class="status-badge ${t.status}">${t.status}</span></td>
                <td>${t.start}</td>
                <td>
                    <div style="display:flex;gap:6px;">
                        <button class="action-btn view" title="Edit"><i class="fas fa-pen"></i></button>
                        ${t.status === 'running' ? '<button class="action-btn warn" title="Pause"><i class="fas fa-pause"></i></button>' : ''}
                        <button class="action-btn reject" title="Cancel" onclick="AdminTournaments.cancelTournament(${t.id})"><i class="fas fa-times"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    cancelTournament(id) {
        if (confirm(`Cancel tournament #${id}? All buy-ins will be refunded.`)) {
            showToast(`Tournament #${id} cancelled & refunded`, 'success');
        }
    }
};

// ═══════════════════════════════════════════
//  12. KYC VERIFICATION
// ═══════════════════════════════════════════
const AdminKYC = {
    loadQueue() {
        const container = document.getElementById('kycQueue');
        if (!container) return;

        const queue = [
            { id: 1, user: 'Ahmed Raza', type: 'Passport', submitted: '2025-01-20', risk: 'low' },
            { id: 2, user: 'John Smith', type: 'ID Card + Selfie', submitted: '2025-01-19', risk: 'medium' },
            { id: 3, user: 'Ravi Kumar', type: 'Bank Statement', submitted: '2025-01-19', risk: 'low' },
        ];

        container.innerHTML = queue.map(k => `
            <div class="kyc-queue-card">
                <div class="kyc-user">
                    <div style="width:40px;height:40px;border-radius:50%;background:var(--glass);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--gold)">${k.user[0]}</div>
                    <div>
                        <strong>${k.user}</strong>
                        <div style="font-size:.72rem;color:var(--text-muted)">${k.type} • ${k.submitted}</div>
                    </div>
                </div>
                <span class="risk-badge risk-${k.risk}">${k.risk} risk</span>
                <div class="kyc-actions">
                    <button class="action-btn approve" onclick="AdminKYC.approve(${k.id})"><i class="fas fa-check"></i> Approve</button>
                    <button class="action-btn reject" onclick="AdminKYC.reject(${k.id})"><i class="fas fa-times"></i> Reject</button>
                    <button class="action-btn view" onclick="AdminKYC.viewDocs(${k.id})"><i class="fas fa-eye"></i> View Docs</button>
                </div>
            </div>
        `).join('');
    },

    approve(id) { showToast(`KYC #${id} approved`, 'success'); },
    reject(id) {
        const reason = prompt('Rejection reason:');
        if (reason) showToast(`KYC #${id} rejected`, 'error');
    },
    viewDocs(id) { showToast(`Opening documents for KYC #${id}`, 'info'); }
};

// ═══════════════════════════════════════════
//  13. SECURITY & FRAUD
// ═══════════════════════════════════════════
const AdminSecurity = {
    loadAlerts() {
        const container = document.getElementById('fraudAlerts');
        if (!container) return;

        const alerts = [
            { id: 1, user: 'User #4521', type: 'Multi-Account', severity: 'high', desc: 'Same IP as User #3892', time: '5 min ago' },
            { id: 2, user: 'User #2187', type: 'Chip Dumping', severity: 'critical', desc: 'Suspicious all-in pattern detected', time: '12 min ago' },
            { id: 3, user: 'User #5634', type: 'Bonus Abuse', severity: 'medium', desc: 'Multiple accounts using same promo code', time: '1 hr ago' },
            { id: 4, user: 'User #1298', type: 'Bot Detected', severity: 'high', desc: 'Consistent 0.5s response time', time: '2 hrs ago' },
        ];

        container.innerHTML = alerts.map(a => `
            <div class="fraud-alert-card severity-${a.severity}">
                <div class="fa-header">
                    <span class="fa-severity ${a.severity}"><i class="fas fa-exclamation-triangle"></i> ${a.severity.toUpperCase()}</span>
                    <span class="fa-time">${a.time}</span>
                </div>
                <div class="fa-body">
                    <strong>${a.user}</strong> — ${a.type}
                    <p style="font-size:.82rem;color:var(--text-muted);margin-top:4px;">${a.desc}</p>
                </div>
                <div class="fa-actions">
                    <button class="action-btn view"><i class="fas fa-search"></i> Investigate</button>
                    <button class="action-btn ban"><i class="fas fa-ban"></i> Ban User</button>
                    <button class="action-btn approve"><i class="fas fa-check"></i> False Positive</button>
                </div>
            </div>
        `).join('');
    }
};

// ═══════════════════════════════════════════
//  14. MODAL SYSTEM
// ═══════════════════════════════════════════
function initModals() {
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
            }
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

// ═══════════════════════════════════════════
//  15. FORMS
// ═══════════════════════════════════════════
function initForms() {
    document.querySelectorAll('.admin-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }

            try {
                // Simulate save
                await new Promise(r => setTimeout(r, 1500));
                showToast('Settings saved successfully!', 'success');
            } catch (error) {
                showToast('Error saving settings', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                }
            }
        });
    });
}

// ═══════════════════════════════════════════
//  16. NOTIFICATIONS
// ═══════════════════════════════════════════
function initNotifications() {
    loadNotificationCount();
    setInterval(loadNotificationCount, 60000);
}

async function loadNotificationCount() {
    const badge = document.querySelector('.notif-count');
    if (!badge) return;

    // Simulated count
    const count = Math.floor(Math.random() * 10) + 3;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function loadNotifications() {
    const panel = document.querySelector('.notif-list');
    if (!panel) return;

    const notifs = [
        { icon: 'fa-user-plus', color: 'var(--cyan)', text: 'New user registration: poker_ace', time: '2m ago' },
        { icon: 'fa-money-bill', color: 'var(--green)', text: 'Large deposit: $5,000 by Ali K.', time: '5m ago' },
        { icon: 'fa-exclamation-triangle', color: 'var(--accent)', text: 'Fraud alert: Multi-account detected', time: '12m ago' },
        { icon: 'fa-trophy', color: 'var(--gold)', text: 'Tournament "Sunday Million" 80% full', time: '1hr ago' },
        { icon: 'fa-arrow-up', color: 'var(--purple)', text: 'Withdrawal request: $3,200 by Sara M.', time: '2hr ago' },
    ];

    panel.innerHTML = notifs.map(n => `
        <div class="notif-item">
            <div class="notif-icon" style="color:${n.color}"><i class="fas ${n.icon}"></i></div>
            <div class="notif-content">
                <div class="notif-text">${n.text}</div>
                <div class="notif-time">${n.time}</div>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════
//  17. LIVE UPDATES
// ═══════════════════════════════════════════
function initLiveUpdates() {
    // Simulate live activity feed
    setInterval(() => {
        const feed = document.querySelector('.activity-feed');
        if (!feed) return;

        const events = [
            { icon: 'fa-user-plus', text: 'New registration: user_' + Math.floor(Math.random() * 9999), color: 'var(--cyan)' },
            { icon: 'fa-arrow-down', text: `Deposit: $${Math.floor(Math.random() * 5000 + 100)}`, color: 'var(--green)' },
            { icon: 'fa-arrow-up', text: `Withdrawal: $${Math.floor(Math.random() * 2000 + 50)}`, color: 'var(--accent)' },
            { icon: 'fa-gamepad', text: `New table created: NL Hold'em $${Math.random() > 0.5 ? '5/$10' : '1/$2'}`, color: 'var(--purple)' },
            { icon: 'fa-trophy', text: `Tournament completed: ${Math.floor(Math.random() * 50 + 10)} players`, color: 'var(--gold)' },
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <i class="fas ${event.icon}" style="color:${event.color}"></i>
            <span>${event.text}</span>
            <span class="activity-time">Just now</span>
        `;

        feed.insertBefore(item, feed.firstChild);

        // Keep only last 20 items
        while (feed.children.length > 20) {
            feed.removeChild(feed.lastChild);
        }
    }, 8000);
}

// ═══════════════════════════════════════════
//  18. ACTIVITY FEED
// ═══════════════════════════════════════════
function loadActivityFeed() {
    const feed = document.querySelector('.activity-feed');
    if (!feed) return;

    const activities = [
        { icon: 'fa-user-plus', text: 'New registration: poker_star_99', time: '2 min ago', color: 'var(--cyan)' },
        { icon: 'fa-arrow-down', text: 'Deposit: $2,500 via PayPal', time: '5 min ago', color: 'var(--green)' },
        { icon: 'fa-trophy', text: 'Tournament "Daily Freeroll" started', time: '8 min ago', color: 'var(--gold)' },
        { icon: 'fa-arrow-up', text: 'Withdrawal approved: $1,200', time: '12 min ago', color: 'var(--accent)' },
        { icon: 'fa-shield-halved', text: 'KYC verified: User #4521', time: '15 min ago', color: 'var(--purple)' },
        { icon: 'fa-exclamation-triangle', text: 'Fraud alert: IP match detected', time: '18 min ago', color: 'var(--accent)' },
        { icon: 'fa-gamepad', text: 'New table: High Roller $50/$100', time: '22 min ago', color: 'var(--cyan)' },
    ];

    feed.innerHTML = activities.map(a => `
        <div class="activity-item">
            <i class="fas ${a.icon}" style="color:${a.color}"></i>
            <span>${a.text}</span>
            <span class="activity-time">${a.time}</span>
        </div>
    `).join('');
}

function loadTopPlayers() {
    const container = document.querySelector('.top-players-list');
    if (!container) return;

    const players = [
        { name: 'Ali Khan', earnings: 12500, games: 342 },
        { name: 'Sara Malik', earnings: 8750, games: 287 },
        { name: 'Ahmed Raza', earnings: 6250, games: 198 },
        { name: 'Fatima Noor', earnings: 5600, games: 156 },
        { name: 'John Smith', earnings: 4200, games: 134 },
    ];

    container.innerHTML = players.map((p, i) => `
        <div class="top-player-item">
            <span class="tp-rank">${i + 1}</span>
            <span class="tp-name">${p.name}</span>
            <span class="tp-earnings" style="color:var(--green)">$${p.earnings.toLocaleString()}</span>
        </div>
    `).join('');
}

function loadSystemHealth() {
    const container = document.querySelector('.system-health');
    if (!container) return;

    const systems = [
        { name: 'API Server', status: 'online', uptime: '99.98%' },
        { name: 'Database', status: 'online', uptime: '99.99%' },
        { name: 'Payment Gateway', status: 'online', uptime: '99.95%' },
        { name: 'WebSocket', status: 'online', uptime: '99.90%' },
    ];

    container.innerHTML = systems.map(s => `
        <div class="health-item">
            <span class="health-dot ${s.status}"></span>
            <span class="health-name">${s.name}</span>
            <span class="health-uptime">${s.uptime}</span>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════
//  19. GLOBAL SEARCH
// ═══════════════════════════════════════════
function initSearch() {
    const searchInput = document.querySelector('.global-search');
    const searchResults = document.querySelector('.search-results');
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchResults.classList.remove('open');
            return;
        }

        // Simulated search results
        const results = [
            { type: 'User', name: 'Ali Khan', sub: 'poker_king', link: 'user-detail.html?id=1' },
            { type: 'Transaction', name: 'TXN-94821', sub: '$1,250 Deposit', link: 'transactions.html' },
            { type: 'Tournament', name: 'Sunday Million', sub: '$50,000 GTD', link: 'tournaments.html' },
        ].filter(r => r.name.toLowerCase().includes(query.toLowerCase()));

        searchResults.innerHTML = results.map(r => `
            <a href="${r.link}" class="search-result-item">
                <span class="sr-type">${r.type}</span>
                <span class="sr-name">${r.name}</span>
                <span class="sr-sub">${r.sub}</span>
            </a>
        `).join('');

        searchResults.classList.toggle('open', results.length > 0);
    }, 300));
}

function globalSearch(query) {
    console.log('Global search:', query);
}

// ═══════════════════════════════════════════
//  20. EXPORT DATA
// ═══════════════════════════════════════════
function initExport() {
    document.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tableId = btn.dataset.export;
            exportTableToCSV(tableId);
        });
    });
}

function exportTableToCSV(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = Array.from(cols).map(col =>
            '"' + col.textContent.trim().replace(/"/g, '""') + '"'
        );
        csv.push(rowData.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableId}_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported successfully!', 'success');
}

// ═══════════════════════════════════════════
//  21. DARK MODE TOGGLE
// ═══════════════════════════════════════════
function initDarkMode() {
    const toggle = document.querySelector('.dark-mode-toggle');
    if (!toggle) return;

    const isDark = localStorage.getItem('pr_admin_dark') !== 'false';
    document.body.classList.toggle('dark-mode', isDark);

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('pr_admin_dark', document.body.classList.contains('dark-mode'));
    });
}

// ═══════════════════════════════════════════
//  22. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K = Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.global-search')?.focus();
        }

        // Ctrl+Shift+A = Approve all pending
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            AdminFinance.batchApprove();
        }

        // Escape = Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        }
    });
}

// ═══════════════════════════════════════════
//  23. UTILITY FUNCTIONS
// ═══════════════════════════════════════════
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'success', duration = 4000) {
    document.querySelectorAll('.admin-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const colors = {
        success: 'rgba(0,200,83,0.15)',
        error: 'rgba(233,69,96,0.15)',
        warning: 'rgba(255,215,0,0.15)',
        info: 'rgba(0,212,255,0.15)'
    };

    const borderColors = {
        success: 'rgba(0,200,83,0.3)',
        error: 'rgba(233,69,96,0.3)',
        warning: 'rgba(255,215,0,0.3)',
        info: 'rgba(0,212,255,0.3)'
    };

    const textColors = {
        success: '#00C853',
        error: '#E94560',
        warning: '#FFD700',
        info: '#00D4FF'
    };

    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '14px 22px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '.88rem',
        fontWeight: '600',
        zIndex: '9999',
        transform: 'translateX(120%)',
        transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        backdropFilter: 'blur(20px)',
        background: colors[type],
        border: `1px solid ${borderColors[type]}`,
        color: textColors[type]
    });

    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function confirmAction(message, callback) {
    if (confirm(message)) callback();
}

console.log('🔐 PokerRoyale Admin Panel JS — Loaded');
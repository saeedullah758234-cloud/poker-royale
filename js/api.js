// ===== USER API (Profile Save) =====
const UserAPI = {
    async getProfile() {
        const token = localStorage.getItem('pr_token');
        const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },

    async updateProfile(data) {
        const token = localStorage.getItem('pr_token');
        const res = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: data.username || data.name,
                email: data.email,
                phone: data.phone || data.number || data.mobile,
                avatar: data.avatar || null
            })
        });
        return res.json();
    },

    async changePassword(currentPassword, newPassword) {
        const token = localStorage.getItem('pr_token');
        const res = await fetch('/api/users/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        return res.json();
    },

    async getWallet() {
        const token = localStorage.getItem('pr_token');
        const res = await fetch('/api/users/wallet', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    }
};

// Global export if needed
window.UserAPI = UserAPI;
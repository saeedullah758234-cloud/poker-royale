/**
 * PokerRoyale - Profile Save (English + USD)
 */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('pr_token');
    if (!token) {
        // Optional: redirect only on real profile pages
        // window.location.href = 'login.html';
        return;
    }

    const nameInput = document.getElementById('profile-username') ||
                      document.getElementById('username') ||
                      document.getElementById('name');
    const emailInput = document.getElementById('profile-email') ||
                       document.getElementById('email');
    const phoneInput = document.getElementById('profile-phone') ||
                       document.getElementById('phone') ||
                       document.getElementById('number') ||
                       document.getElementById('mobile');
    const saveBtn = document.getElementById('btn-save-profile') ||
                    document.getElementById('save-profile') ||
                    document.querySelector('button[type="submit"].save-profile');

    // Load current profile
    try {
        const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
            if (nameInput) nameInput.value = data.user.username || '';
            if (emailInput) emailInput.value = data.user.email || '';
            if (phoneInput) phoneInput.value = data.user.phone || '';
            // Update local storage
            const u = JSON.parse(localStorage.getItem('pr_user') || '{}');
            localStorage.setItem('pr_user', JSON.stringify({ ...u, ...data.user }));
        }
    } catch (e) {
        console.warn('Could not load profile', e);
    }

    // Save handler
    async function saveProfile(e) {
        if (e) e.preventDefault();
        const payload = {
            username: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            phone: phoneInput ? phoneInput.value.trim() : ''
        };

        if (!payload.username || payload.username.length < 3) {
            alert('Username must be at least 3 characters.');
            return;
        }
        if (!payload.email || !payload.email.includes('@')) {
            alert('Please enter a valid email address.');
            return;
        }

        try {
            const res = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('pr_user', JSON.stringify(data.user));
                alert('Profile saved successfully!');
                // Optional UI feedback
                const msg = document.getElementById('profile-message');
                if (msg) {
                    msg.style.color = '#4caf50';
                    msg.innerText = 'Profile updated successfully.';
                }
            } else {
                alert(data.message || 'Failed to save profile.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error. Please try again.');
        }
    }

    if (saveBtn) saveBtn.addEventListener('click', saveProfile);

    const form = document.getElementById('profile-form') || document.querySelector('form.profile-form');
    if (form) form.addEventListener('submit', saveProfile);
});
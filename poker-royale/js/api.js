/**
 * js/api.js
 * Frontend to Backend communication
 */
const API_BASE_URL = 'http://localhost:3000/api';

const API = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...(options.body && { body: JSON.stringify(options.body) }),
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'API request failed');
            return data;
        } catch (error) {
            throw error;
        }
    }
};

const AuthAPI = {
    async register(data) {
        return await API.request('/auth/register', { method: 'POST', body: data });
    },
    async verifyOTP(phone, otp) {
        return await API.request('/auth/verify-otp', { method: 'POST', body: { phone, otp } });
    },
    async resendOTP(phone) {
        return await API.request('/auth/resend-otp', { method: 'POST', body: { phone } });
    }
};
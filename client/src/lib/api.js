import axios from 'axios';

let accessToken = null;
let refreshPromise = null;

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 8000,
    withCredentials: true
});

export function setAccessToken(token) {
    accessToken = token || null;
}

export async function refreshSession() {
    if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh')
            .then(response => {
                const token = response.data?.data?.accessToken;

                if (!token) {
                    throw new Error('Refresh response did not include an access token.');
                }

                setAccessToken(token);
                return token;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

api.interceptors.request.use(config => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

api.interceptors.response.use(
    response => response,
    async error => {
        const original = error.config;
        const url = String(original?.url || '');
        const isAuthFlow = /\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(url);

        if (
            error.response?.status !== 401 ||
            !original ||
            original._retry ||
            isAuthFlow
        ) {
            return Promise.reject(error);
        }

        original._retry = true;

        try {
            const token = await refreshSession();
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
        } catch (refreshError) {
            setAccessToken(null);
            return Promise.reject(refreshError);
        }
    }
);

export async function getHealth() {
    const response = await api.get('/health');
    return response.data;
}

export default api;

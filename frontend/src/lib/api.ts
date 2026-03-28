import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Inject auth token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('cogni_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('cogni_token');
            localStorage.removeItem('cogni_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ===== Auth API =====
export const authAPI = {
    signup: (data: { email: string; password: string; full_name: string }) =>
        api.post('/auth/signup', data),

    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),

    logout: () => api.post('/auth/logout'),

    getProfile: () => api.get('/auth/profile'),
};

// ===== Document API =====
export const documentAPI = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            // Uploading + server-side PDF processing can take a while.
            // Make sure the request doesn't hang forever.
            timeout: 10 * 60 * 1000,
        });
    },

    list: () => api.get('/documents/'),
};

// ===== Chat API =====
export const chatAPI = {
    listSessions: () => api.get('/chat/sessions'),

    createSession: (data: { document_id: string; title: string }) =>
        api.post('/chat/sessions', data),

    getMessages: (sessionId: string) =>
        api.get(`/chat/sessions/${sessionId}/messages`),

    deleteSession: (sessionId: string) =>
        api.delete(`/chat/sessions/${sessionId}`),
};

// ===== AI API =====
export const aiAPI = {
    getSummary: (documentId: string) =>
        api.post('/ai/summary', { document_id: documentId }, { timeout: 3 * 60 * 1000 }),

    askQuestion: (data: {
        document_id: string;
        query: string;
        session_id?: string;
    }) => api.post('/ai/query', data, { timeout: 3 * 60 * 1000 }),

    getFlashcards: (documentId: string) =>
        api.post('/ai/flashcards', { document_id: documentId }, { timeout: 3 * 60 * 1000 }),
};

// ===== Admin API =====
export const adminAPI = {
    getMetrics: () => api.get('/admin/metrics'),
};

export default api;

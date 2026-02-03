import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Company API endpoints
export const companyAPI = {
    // Get all companies
    getAll: async () => {
        const response = await api.get('/companies');
        return response.data;
    },

    // Get company by ID
    getById: async (id) => {
        const response = await api.get(`/companies/${id}`);
        return response.data;
    },

    // Create new company
    create: async (companyData) => {
        const response = await api.post('/companies', companyData);
        return response.data;
    },

    // Update company
    update: async (id, companyData) => {
        const response = await api.put(`/companies/${id}`, companyData);
        return response.data;
    },

    // Delete company
    delete: async (id) => {
        const response = await api.delete(`/companies/${id}`);
        return response.data;
    },
};

export default api;

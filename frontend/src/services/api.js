import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const generateCRUD = (endpoint) => ({
    getAll: async () => {
        const response = await api.get(endpoint);
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`${endpoint}/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post(endpoint, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`${endpoint}/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`${endpoint}/${id}`);
        return response.data;
    },
});

// APIs
export const companyAPI = generateCRUD('/companies');
export const productAPI = generateCRUD('/products');
export const driverAPI = generateCRUD('/drivers');
export const pumpAPI = generateCRUD('/pumps');
export const placeAPI = generateCRUD('/places');
export const dealerAPI = generateCRUD('/dealers');
export const vehicleAPI = generateCRUD('/vehicles');
export const ownerAPI = generateCRUD('/owners');
export const bankAPI = generateCRUD('/banks');
export const rateCardAPI = generateCRUD('/rate-cards');
export const loadingAdvanceAPI = {
    ...generateCRUD('/loading-advances'),
    getNextVoucher: async (login_prefix) => {
        const response = await api.get('/loading-advances/next-voucher', { params: { login_prefix } });
        return response.data;
    },
    getInvoices: async (id) => {
        const response = await api.get(`/loading-advances/${id}/invoices`);
        return response.data;
    }
};

export const acknowledgementAPI = generateCRUD('/acknowledgements');

export const authAPI = {
    register: async (data) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },
    login: async (data) => {
        const response = await api.post('/auth/login', data);
        return response.data;
    }
};

export const templatesAPI = {
    list: async () => {
        const response = await api.get('/templates');
        return response.data;
    },
    getColumns: async (master) => {
        const response = await api.get(`/templates/${master}/columns`);
        return response.data;
    },
};

export default api;

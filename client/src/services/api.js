import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Axios instance with default configuration
 * Follows Single Responsibility Principle - handles HTTP communication
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor - adds auth token to all requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - handles common errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Auth Service
 */
export const authService = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
  }
};

/**
 * Income Service
 */
export const incomeService = {
  getAll: () => api.get('/incomes'),
  getById: (id) => api.get(`/incomes/${id}`),
  create: (data) => api.post('/incomes', data),
  bulkCreate: (items) => api.post('/incomes/bulk', { items }),
  update: (id, data) => api.put(`/incomes/${id}`, data),
  delete: (id) => api.delete(`/incomes/${id}`)
};

/**
 * Expense Service
 */
export const expenseService = {
  getAll: () => api.get('/expenses'),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  bulkCreate: (items) => api.post('/expenses/bulk', { items }),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`)
};

/**
 * Loan Service
 */
export const loanService = {
  getAll: () => api.get('/loans'),
  getById: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  bulkCreate: (items) => api.post('/loans/bulk', { items }),
  update: (id, data) => api.put(`/loans/${id}`, data),
  delete: (id) => api.delete(`/loans/${id}`)
};

/**
 * Export Service
 */
export const exportService = {
  exportData: (params) => api.get('/export', { 
    params,
    responseType: 'blob' 
  })
};

export default api;


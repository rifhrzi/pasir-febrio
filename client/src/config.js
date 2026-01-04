// API Configuration
// Production: Uses Railway backend
// Development: Uses local backend

const RAILWAY_BACKEND_URL = 'https://pasir-finance-production.up.railway.app/api';
const LOCAL_BACKEND_URL = 'http://localhost:4000/api';

const isProd = import.meta.env.PROD;

export const API_BASE_URL = isProd ? RAILWAY_BACKEND_URL : LOCAL_BACKEND_URL;

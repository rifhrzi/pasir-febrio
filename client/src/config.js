// API Configuration
// Production: Uses Railway backend
// Development/Docker: Uses relative path (nginx proxy)

const RAILWAY_BACKEND_URL = 'https://pasir-finance-production.up.railway.app/api'; // Replace with your Railway URL

export const API_BASE_URL = import.meta.env.PROD
    ? RAILWAY_BACKEND_URL
    : '/api';


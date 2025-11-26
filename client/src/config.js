// API Configuration
// Production: Uses Railway backend
// Development: Uses local backend

export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://pasir-finance-production.up.railway.app/api'
  : '/api';

// Railway Backend: https://pasir-finance-production.up.railway.app
// Supabase Database: db.uoddaqiwpdudgmovatbr.supabase.co


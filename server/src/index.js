import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import incomesRouter from './routes/incomes.js';
import expensesRouter from './routes/expenses.js';
import loansRouter from './routes/loans.js';
import exportRouter from './routes/export.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware - CORS must be first
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false // Set to false when using origin: '*'
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/incomes', incomesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/loans', loansRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

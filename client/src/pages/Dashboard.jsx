import Layout from '../components/Layout.jsx';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

const TIME_FILTERS = {
  all: 'Semua',
  daily: 'Hari Ini',
  weekly: 'Minggu Ini',
  monthly: 'Bulan Ini'
};

const formatCurrency = value => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value ?? '-';
  return numeric.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
};

const parseIncomeDescription = value => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.__type === 'income-v1') return parsed;
  } catch {
    return null;
  }
  return null;
};

const isInTimeRange = (dateStr, filter) => {
  if (filter === 'all') return true;
  
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (filter === 'daily') {
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return itemDate.getTime() === today.getTime();
  }
  
  if (filter === 'weekly') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return date >= startOfWeek && date < endOfWeek;
  }
  
  if (filter === 'monthly') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  
  return true;
};

export default function Dashboard() {
  const token = localStorage.getItem('token');
  const api = axios.create({ baseURL: API_BASE_URL, headers: { Authorization: `Bearer ${token}` } });

  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incomesRes, expensesRes, loansRes] = await Promise.all([
        api.get('/incomes'),
        api.get('/expenses'),
        api.get('/loans')
      ]);

      setIncomes(Array.isArray(incomesRes.data) ? incomesRes.data : []);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);
    } catch (err) {
      if (err?.response && [401, 403].includes(err.response.status)) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const filteredIncomes = incomes.filter(item => isInTimeRange(item.trans_date, timeFilter));
    const filteredExpenses = expenses.filter(item => isInTimeRange(item.trans_date, timeFilter));
    const filteredLoans = loans.filter(item => isInTimeRange(item.trans_date, timeFilter));

    const totalIncome = filteredIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalLoan = filteredLoans.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Calculate deductions from incomes
    let totalLoading = 0;
    let totalMarket = 0;
    let totalBroker = 0;

    filteredIncomes.forEach(item => {
      const parsed = parseIncomeDescription(item.description);
      if (parsed && parsed.perLoadDeductions) {
        const qty = parsed.quantity || 1;
        totalLoading += (parsed.perLoadDeductions.loading || 0) * qty;
        totalMarket += (parsed.perLoadDeductions.market || 0) * qty;
        totalBroker += (parsed.perLoadDeductions.broker || 0) * qty;
      }
    });

    return {
      incomes: { count: filteredIncomes.length, total: totalIncome },
      expenses: { count: filteredExpenses.length, total: totalExpense },
      loans: { count: filteredLoans.length, total: totalLoan },
      deductions: { loading: totalLoading, market: totalMarket, broker: totalBroker }
    };
  }, [incomes, expenses, loans, timeFilter]);

  const netRevenue = stats.incomes.total - stats.expenses.total - stats.loans.total;

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-slate-500">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 sm:p-8 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Overview data keuangan PT. DZIKRY MULTI LABA
          </p>
        </div>

        {/* Time Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Filter Periode</h2>
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {Object.entries(TIME_FILTERS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition ${
                  timeFilter === key
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Link 
            to="/income"
            className="group block rounded-xl border border-slate-200 bg-white p-4 sm:p-5 transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <span className="text-xs text-emerald-600 opacity-0 transition group-hover:opacity-100">View →</span>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Income</p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-slate-900">{formatCurrency(stats.incomes.total)}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.incomes.count} entries</p>
            </div>
          </Link>

          <Link 
            to="/expense"
            className="group block rounded-xl border border-slate-200 bg-white p-4 sm:p-5 transition hover:border-rose-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <span className="text-xs text-rose-600 opacity-0 transition group-hover:opacity-100">View →</span>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Expenses</p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-slate-900">{formatCurrency(stats.expenses.total)}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.expenses.count} entries</p>
            </div>
          </Link>

          <Link 
            to="/loans"
            className="group block rounded-xl border border-slate-200 bg-white p-4 sm:p-5 transition hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-amber-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-amber-600 opacity-0 transition group-hover:opacity-100">View →</span>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Loans</p>
              <p className="mt-1 text-lg sm:text-2xl font-bold text-slate-900">{formatCurrency(stats.loans.total)}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.loans.count} entries</p>
            </div>
          </Link>

          <Link 
            to="/revenue"
            className={`group block rounded-xl border p-4 sm:p-5 transition hover:shadow-md ${
              netRevenue >= 0
                ? 'border-slate-200 bg-white hover:border-blue-300'
                : 'border-slate-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg ${
                netRevenue >= 0 ? 'bg-blue-100' : 'bg-red-100'
              }`}>
                <svg className={`h-5 w-5 sm:h-6 sm:w-6 ${netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className={`text-xs opacity-0 transition group-hover:opacity-100 ${
                netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>View →</span>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Net Revenue</p>
              <p className={`mt-1 text-lg sm:text-2xl font-bold ${netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(netRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Current balance</p>
            </div>
          </Link>
        </div>

        {/* Deductions Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Summary Potongan ({TIME_FILTERS[timeFilter]})</h2>
          <div className="grid gap-4 grid-cols-3">
            <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-widest text-purple-600">Loading</p>
              </div>
              <p className="text-lg sm:text-xl font-semibold text-purple-700">{formatCurrency(stats.deductions.loading)}</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-widest text-indigo-600">Market</p>
              </div>
              <p className="text-lg sm:text-xl font-semibold text-indigo-700">{formatCurrency(stats.deductions.market)}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                  <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Broker</p>
              </div>
              <p className="text-lg sm:text-xl font-semibold text-cyan-700">{formatCurrency(stats.deductions.broker)}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Link
              to="/income"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <div className="text-xl sm:text-2xl">💰</div>
              <div>
                <div className="text-sm font-medium text-slate-900">Add Income</div>
                <div className="text-xs text-slate-500 hidden sm:block">Record income</div>
              </div>
            </Link>

            <Link
              to="/expense"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <div className="text-xl sm:text-2xl">💸</div>
              <div>
                <div className="text-sm font-medium text-slate-900">Add Expense</div>
                <div className="text-xs text-slate-500 hidden sm:block">Record expense</div>
              </div>
            </Link>

            <Link
              to="/loans"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 transition hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="text-xl sm:text-2xl">💳</div>
              <div>
                <div className="text-sm font-medium text-slate-900">Add Loan</div>
                <div className="text-xs text-slate-500 hidden sm:block">Record loan</div>
              </div>
            </Link>

            <Link
              to="/revenue"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="text-xl sm:text-2xl">📊</div>
              <div>
                <div className="text-sm font-medium text-slate-900">Analytics</div>
                <div className="text-xs text-slate-500 hidden sm:block">View reports</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import Layout from '../components/Layout.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const formatCurrency = value => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value ?? '-';
  return numeric.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
};

export default function Dashboard() {
  const token = localStorage.getItem('token');
  const api = axios.create({ baseURL: '/api', headers: { Authorization: `Bearer ${token}` } });

  const [stats, setStats] = useState({
    incomes: { count: 0, total: 0 },
    expenses: { count: 0, total: 0 },
    loans: { count: 0, total: 0 }
  });

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const [incomesRes, expensesRes, loansRes] = await Promise.all([
        api.get('/incomes'),
        api.get('/expenses'),
        api.get('/loans')
      ]);

      setStats({
        incomes: {
          count: incomesRes.data.length,
          total: incomesRes.data.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        },
        expenses: {
          count: expensesRes.data.length,
          total: expensesRes.data.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        },
        loans: {
          count: loansRes.data.length,
          total: loansRes.data.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        }
      });
    } catch (err) {
      if (err?.response && [401, 403].includes(err.response.status)) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const netRevenue = stats.incomes.total - stats.expenses.total - stats.loans.total;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Overview of your financial data
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link 
            to="/income"
            className="group block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <span className="text-xs text-emerald-600 opacity-0 transition group-hover:opacity-100">View →</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-600">Income</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(stats.incomes.total)}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.incomes.count} entries</p>
            </div>
          </Link>

          <Link 
            to="/expense"
            className="group block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-rose-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <span className="text-xs text-rose-600 opacity-0 transition group-hover:opacity-100">View →</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-600">Expenses</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(stats.expenses.total)}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.expenses.count} entries</p>
            </div>
          </Link>

          <Link 
            to="/loans"
            className="group block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-amber-600 opacity-0 transition group-hover:opacity-100">View →</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-600">Loans</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(stats.loans.total)}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.loans.count} entries</p>
            </div>
          </Link>

          <Link 
            to="/revenue"
            className={`group block rounded-xl border p-5 transition hover:shadow-md ${
              netRevenue >= 0
                ? 'border-slate-200 bg-white hover:border-blue-300'
                : 'border-slate-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                netRevenue >= 0 ? 'bg-blue-100' : 'bg-red-100'
              }`}>
                <svg className={`h-6 w-6 ${netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className={`text-xs opacity-0 transition group-hover:opacity-100 ${
                netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>View →</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-600">Net Revenue</p>
              <p className={`mt-1 text-2xl font-bold ${netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(netRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Current balance</p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/income"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <div className="text-2xl">💰</div>
              <div>
                <div className="font-medium text-slate-900">Add Income</div>
                <div className="text-xs text-slate-500">Record income</div>
              </div>
            </Link>

            <Link
              to="/expense"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <div className="text-2xl">💸</div>
              <div>
                <div className="font-medium text-slate-900">Add Expense</div>
                <div className="text-xs text-slate-500">Record expense</div>
              </div>
            </Link>

            <Link
              to="/loans"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="text-2xl">💳</div>
              <div>
                <div className="font-medium text-slate-900">Add Loan</div>
                <div className="text-xs text-slate-500">Record loan</div>
              </div>
            </Link>

            <Link
              to="/revenue"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="text-2xl">📊</div>
              <div>
                <div className="font-medium text-slate-900">Analytics</div>
                <div className="text-xs text-slate-500">View reports</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

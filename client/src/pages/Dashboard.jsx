import Layout from '../components/Layout.jsx';
import ExportButton, { exportFromServer } from '../components/ExcelExport.jsx';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

// Simple Pie Chart Component
function PieChart({ data, size = 200 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-slate-400 text-sm">No data</div>
      </div>
    );
  }

  let currentAngle = 0;
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;

  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathD = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return (
      <path
        key={index}
        d={pathD}
        fill={item.color}
        stroke="white"
        strokeWidth="2"
        className="transition-all duration-300 hover:opacity-80"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      {/* Inner circle for donut effect */}
      <circle cx={centerX} cy={centerY} r={radius * 0.5} fill="white" />
    </svg>
  );
}

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
  const [isExporting, setIsExporting] = useState(false);

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

    // Calculate expense breakdown by category from database
    const expenseByCategory = {};
    filteredExpenses.forEach(item => {
      const cat = (item.category || 'LAINNYA').toUpperCase();
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(item.amount || 0);
    });

    // Calculate income breakdown by category
    const incomeByCategory = {};
    filteredIncomes.forEach(item => {
      const cat = (item.category || 'LAINNYA').toUpperCase();
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(item.amount || 0);
    });

    return {
      incomes: { count: filteredIncomes.length, total: totalIncome, byCategory: incomeByCategory },
      expenses: { count: filteredExpenses.length, total: totalExpense, byCategory: expenseByCategory },
      loans: { count: filteredLoans.length, total: totalLoan }
    };
  }, [incomes, expenses, loans, timeFilter]);

  const netRevenue = stats.incomes.total - stats.expenses.total - stats.loans.total;

  const handleExportComplete = async () => {
    setIsExporting(true);
    try {
      const filename = await exportFromServer('all', 'xlsx');
      console.log('Exported complete report to:', filename);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal export data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="mt-2 text-sm text-slate-300">
                Overview data keuangan PT. DZIKRY MULTI LABA
              </p>
            </div>
            <ExportButton 
              onClick={handleExportComplete} 
              loading={isExporting}
              colorScheme="blue"
            >
              Export Laporan
            </ExportButton>
          </div>
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

        {/* Income Breakdown by Category */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Rincian Pendapatan ({TIME_FILTERS[timeFilter]})</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.incomes.byCategory || {})
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = stats.incomes.total > 0 ? (amount / stats.incomes.total * 100).toFixed(1) : 0;
                const colors = {
                  'TRONTON': { bg: 'from-emerald-500 to-green-600', icon: '🚛' },
                  'COLT DIESEL': { bg: 'from-blue-500 to-indigo-600', icon: '🚚' },
                };
                const color = colors[category] || { bg: 'from-slate-500 to-slate-600', icon: '💰' };
                
                return (
                  <div key={category} className={`rounded-xl bg-gradient-to-br ${color.bg} p-4 text-white shadow-lg`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{color.icon}</span>
                      <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">{percentage}%</span>
                    </div>
                    <div className="text-sm font-medium opacity-90">{category}</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(amount)}</div>
                  </div>
                );
              })}
            {Object.keys(stats.incomes.byCategory || {}).length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-4">Tidak ada data pendapatan</div>
            )}
          </div>
          {/* Total Income */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-700">Total Pendapatan</span>
              <span className="text-lg font-bold text-emerald-700">
                {formatCurrency(stats.incomes.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Pie Chart & Expense Breakdown */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Pie Chart Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribusi Keuangan</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <PieChart 
                  data={[
                    { value: stats.incomes.total, color: '#10b981', label: 'Income' },
                    { value: stats.expenses.total, color: '#f43f5e', label: 'Expenses' },
                    { value: stats.loans.total, color: '#f59e0b', label: 'Loans' }
                  ]}
                  size={180}
                />
              </div>
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-slate-700">Income</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(stats.incomes.total)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-sm font-medium text-slate-700">Expenses</span>
                  </div>
                  <span className="text-sm font-bold text-rose-600">{formatCurrency(stats.expenses.total)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm font-medium text-slate-700">Loans</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{formatCurrency(stats.loans.total)}</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${netRevenue >= 0 ? 'bg-blue-50 border border-blue-100' : 'bg-red-50 border border-red-100'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${netRevenue >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium text-slate-700">Net Revenue</span>
                  </div>
                  <span className={`text-sm font-bold ${netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(netRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Breakdown by Category */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Rincian Pengeluaran ({TIME_FILTERS[timeFilter]})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(stats.expenses.byCategory || {})
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                  const percentage = stats.expenses.total > 0 ? (amount / stats.expenses.total * 100).toFixed(1) : 0;
                  const colors = {
                    'BBM': { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', bar: 'bg-orange-500' },
                    'UANG HARIAN': { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' },
                    'PINJAMAN': { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', bar: 'bg-red-500' },
                    'DEPOSIT': { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' },
                    'BELANJA': { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-600', bar: 'bg-pink-500' },
                    'MAKAN MINUM': { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', bar: 'bg-amber-500' },
                    'BOP': { bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600', bar: 'bg-teal-500' },
                    'OPERASIONAL': { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', bar: 'bg-indigo-500' },
                    'SPAREPART': { bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-600', bar: 'bg-cyan-500' },
                  };
                  const color = colors[category] || { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' };
                  
                  return (
                    <div key={category} className={`p-3 rounded-lg ${color.bg} ${color.border} border`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold uppercase ${color.text}`}>{category}</span>
                        <span className={`text-sm font-bold ${color.text}`}>{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${color.bar}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-xs text-slate-500">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              {Object.keys(stats.expenses.byCategory || {}).length === 0 && (
                <div className="text-center text-slate-400 py-4">Tidak ada data pengeluaran</div>
              )}
            </div>
            {/* Total Expenses */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-100 to-rose-50 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-rose-700">Total Pengeluaran</span>
                <span className="text-lg font-bold text-rose-700">
                  {formatCurrency(stats.expenses.total)}
                </span>
              </div>
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

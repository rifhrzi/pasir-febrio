import Layout from '../components/Layout.jsx';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

const TIME_FILTERS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly'
};

const formatCurrency = value => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value ?? '-';
  return numeric.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
};

const formatDate = value => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

const getWeekNumber = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  // Calculate week number within the month (1-5)
  const weekOfMonth = Math.ceil(day / 7);
  
  return `${year}-${month.toString().padStart(2, '0')}-W${weekOfMonth}`;
};

const getMonthKey = date => {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

const getDayKey = date => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export default function Revenue() {
  const token = localStorage.getItem('token');
  const api = axios.create({ baseURL: API_BASE_URL, headers: { Authorization: `Bearer ${token}` } });
  
  const [timeFilter, setTimeFilter] = useState('daily');
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }, [token]);

  const handleAuthError = error => {
    if (error?.response && [401, 403].includes(error.response.status)) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

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
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedData = useMemo(() => {
    const getKey = (date) => {
      if (timeFilter === 'daily') return getDayKey(date);
      if (timeFilter === 'weekly') return getWeekNumber(date);
      if (timeFilter === 'monthly') return getMonthKey(date);
      return date;
    };

    const groups = {};

    // Group incomes
    incomes.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0, items: [] };
      }
      groups[key].incomes += Number(item.amount || 0);
      groups[key].items.push({ ...item, type: 'income' });
    });

    // Group expenses
    expenses.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0, items: [] };
      }
      groups[key].expenses += Number(item.amount || 0);
      groups[key].items.push({ ...item, type: 'expense' });
    });

    // Group loans
    loans.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0, items: [] };
      }
      groups[key].loans += Number(item.amount || 0);
      groups[key].items.push({ ...item, type: 'loan' });
    });

    // Calculate net revenue for each group
    Object.keys(groups).forEach(key => {
      groups[key].netRevenue = groups[key].incomes - groups[key].expenses - groups[key].loans;
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, data]) => ({ period, ...data }));
  }, [incomes, expenses, loans, timeFilter]);

  const totals = useMemo(() => {
    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalLoans = loans.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const netRevenue = totalIncome - totalExpense - totalLoans;
    
    return { totalIncome, totalExpense, totalLoans, netRevenue };
  }, [incomes, expenses, loans]);

  const formatPeriodLabel = period => {
    if (timeFilter === 'daily') {
      return formatDate(period);
    }
    if (timeFilter === 'weekly') {
      const parts = period.split('-');
      const year = parts[0];
      const month = parts[1];
      const week = parts[2].replace('W', '');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year} - Week ${week}`;
    }
    if (timeFilter === 'monthly') {
      const [year, month] = period.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    return period;
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/export/all', { params: { format: 'xlsx' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `revenue_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      handleAuthError(err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-slate-500">Loading revenue data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <section className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Revenue Analytics</p>
          <h1 className="mt-3 text-4xl font-semibold">Revenue Dashboard</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Track your net revenue by analyzing income, expenses, and loans across different time periods.
            Filter by daily, weekly, or monthly views to get insights into your financial performance.
          </p>
        </section>

        {/* Time Filter & Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Time Period</p>
            <h2 className="text-2xl font-semibold text-slate-900">Select your view</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {Object.entries(TIME_FILTERS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTimeFilter(key)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    timeFilter === key
                      ? 'bg-slate-900 text-white shadow'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">XLSX</span>
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-emerald-600">Total Income</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{formatCurrency(totals.totalIncome)}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-rose-600">Total Expenses</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700">{formatCurrency(totals.totalExpense)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-amber-600">Total Loans</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{formatCurrency(totals.totalLoans)}</p>
          </div>
          <div className={`rounded-2xl border p-5 shadow-lg ${
            totals.netRevenue >= 0
              ? 'border-blue-100 bg-gradient-to-br from-blue-50 to-white'
              : 'border-red-100 bg-gradient-to-br from-red-50 to-white'
          }`}>
            <p className={`text-xs uppercase tracking-widest ${
              totals.netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              Net Revenue
            </p>
            <p className={`mt-2 text-2xl font-semibold ${
              totals.netRevenue >= 0 ? 'text-blue-700' : 'text-red-700'
            }`}>
              {formatCurrency(totals.netRevenue)}
            </p>
          </div>
        </div>

        {/* Revenue Table */}
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-semibold text-slate-900">
              {TIME_FILTERS[timeFilter]} Revenue Breakdown
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Detailed view of your financial performance grouped by {timeFilter} periods
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Income</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3 text-right">Loans</th>
                  <th className="px-4 py-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {groupedData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                      No data available for the selected period
                    </td>
                  </tr>
                )}
                {groupedData.map((row, idx) => (
                  <tr key={idx} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatPeriodLabel(row.period)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatCurrency(row.incomes)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">
                      {formatCurrency(row.loans)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      row.netRevenue >= 0 ? 'text-blue-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(row.netRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}


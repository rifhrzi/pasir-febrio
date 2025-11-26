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
        groups[key] = { incomes: 0, expenses: 0, loans: 0, items: [], loading: 0, market: 0, broker: 0 };
      }
      groups[key].incomes += Number(item.amount || 0);
      
      // Parse deductions from income description
      const parsed = parseIncomeDescription(item.description);
      if (parsed && parsed.perLoadDeductions) {
        const qty = parsed.quantity || 1;
        groups[key].loading += (parsed.perLoadDeductions.loading || 0) * qty;
        groups[key].market += (parsed.perLoadDeductions.market || 0) * qty;
        groups[key].broker += (parsed.perLoadDeductions.broker || 0) * qty;
      }
      
      groups[key].items.push({ ...item, type: 'income' });
    });

    // Group expenses
    expenses.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0, items: [], loading: 0, market: 0, broker: 0 };
      }
      groups[key].expenses += Number(item.amount || 0);
      groups[key].items.push({ ...item, type: 'expense' });
    });

    // Group loans
    loans.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0, items: [], loading: 0, market: 0, broker: 0 };
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
    
    // Calculate total deductions
    let totalLoading = 0;
    let totalMarket = 0;
    let totalBroker = 0;
    
    incomes.forEach(item => {
      const parsed = parseIncomeDescription(item.description);
      if (parsed && parsed.perLoadDeductions) {
        const qty = parsed.quantity || 1;
        totalLoading += (parsed.perLoadDeductions.loading || 0) * qty;
        totalMarket += (parsed.perLoadDeductions.market || 0) * qty;
        totalBroker += (parsed.perLoadDeductions.broker || 0) * qty;
      }
    });
    
    return { totalIncome, totalExpense, totalLoans, netRevenue, totalLoading, totalMarket, totalBroker };
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

  // Chart calculations
  const chartData = useMemo(() => {
    const displayData = [...groupedData].reverse().slice(-10);
    const maxValue = Math.max(
      ...displayData.map(d => Math.max(d.incomes, d.expenses + d.loans, Math.abs(d.netRevenue)))
    );
    return { displayData, maxValue: maxValue || 1 };
  }, [groupedData]);

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
      <div className="space-y-6">
        {/* Header Section */}
        <section className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Revenue Analytics</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Revenue Dashboard</h1>
        </section>

        {/* Time Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Pilih Periode</h2>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {Object.entries(TIME_FILTERS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-emerald-600">Total Income</p>
            <p className="mt-2 text-lg sm:text-xl font-semibold text-emerald-700">{formatCurrency(totals.totalIncome)}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-rose-600">Total Expenses</p>
            <p className="mt-2 text-lg sm:text-xl font-semibold text-rose-700">{formatCurrency(totals.totalExpense)}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-amber-600">Total Loans</p>
            <p className="mt-2 text-lg sm:text-xl font-semibold text-amber-700">{formatCurrency(totals.totalLoans)}</p>
          </div>
          <div className={`rounded-xl border p-4 shadow-lg ${
            totals.netRevenue >= 0
              ? 'border-blue-100 bg-gradient-to-br from-blue-50 to-white'
              : 'border-red-100 bg-gradient-to-br from-red-50 to-white'
          }`}>
            <p className={`text-xs uppercase tracking-widest ${
              totals.netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              Net Revenue
            </p>
            <p className={`mt-2 text-lg sm:text-xl font-semibold ${
              totals.netRevenue >= 0 ? 'text-blue-700' : 'text-red-700'
            }`}>
              {formatCurrency(totals.netRevenue)}
            </p>
          </div>
        </div>

        {/* Deductions Summary */}
        <div className="grid gap-4 grid-cols-3">
          <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-purple-600">Total Loading</p>
            <p className="mt-2 text-lg font-semibold text-purple-700">{formatCurrency(totals.totalLoading)}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-indigo-600">Total Market</p>
            <p className="mt-2 text-lg font-semibold text-indigo-700">{formatCurrency(totals.totalMarket)}</p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-cyan-600">Total Broker</p>
            <p className="mt-2 text-lg font-semibold text-cyan-700">{formatCurrency(totals.totalBroker)}</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-xl backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Grafik Revenue ({TIME_FILTERS[timeFilter]})</h2>
          
          <div className="chart-container">
            {chartData.displayData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                Tidak ada data untuk ditampilkan
              </div>
            ) : (
              <div className="h-full flex items-end gap-2 sm:gap-4 pb-8 pt-4 px-2">
                {chartData.displayData.map((item, idx) => {
                  const incomeHeight = (item.incomes / chartData.maxValue) * 100;
                  const expenseHeight = (item.expenses / chartData.maxValue) * 100;
                  const loanHeight = (item.loans / chartData.maxValue) * 100;
                  const netHeight = (Math.abs(item.netRevenue) / chartData.maxValue) * 100;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex gap-1 items-end justify-center h-56 sm:h-72">
                        {/* Income Bar */}
                        <div 
                          className="w-1/4 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500 relative group/bar"
                          style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                          title={`Income: ${formatCurrency(item.incomes)}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {formatCurrency(item.incomes)}
                          </div>
                        </div>
                        {/* Expense Bar */}
                        <div 
                          className="w-1/4 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t transition-all duration-300 hover:from-rose-600 hover:to-rose-500 relative group/bar"
                          style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                          title={`Expense: ${formatCurrency(item.expenses)}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {formatCurrency(item.expenses)}
                          </div>
                        </div>
                        {/* Loan Bar */}
                        <div 
                          className="w-1/4 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all duration-300 hover:from-amber-600 hover:to-amber-500 relative group/bar"
                          style={{ height: `${Math.max(loanHeight, 2)}%` }}
                          title={`Loan: ${formatCurrency(item.loans)}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {formatCurrency(item.loans)}
                          </div>
                        </div>
                        {/* Net Revenue Bar */}
                        <div 
                          className={`w-1/4 rounded-t transition-all duration-300 relative group/bar ${
                            item.netRevenue >= 0 
                              ? 'bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500' 
                              : 'bg-gradient-to-t from-red-500 to-red-400 hover:from-red-600 hover:to-red-500'
                          }`}
                          style={{ height: `${Math.max(netHeight, 2)}%` }}
                          title={`Net: ${formatCurrency(item.netRevenue)}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {formatCurrency(item.netRevenue)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-slate-500 text-center truncate max-w-full px-1">
                        {timeFilter === 'daily' ? formatDate(item.period).split(' ').slice(0, 2).join(' ') : formatPeriodLabel(item.period).split(' ').slice(0, 2).join(' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Chart Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
              <span className="text-xs text-slate-600">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
              <span className="text-xs text-slate-600">Expense</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
              <span className="text-xs text-slate-600">Loan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
              <span className="text-xs text-slate-600">Net (+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span className="text-xs text-slate-600">Net (-)</span>
            </div>
          </div>
        </section>

        {/* Revenue Table */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-xl backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            {TIME_FILTERS[timeFilter]} Revenue Breakdown
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Income</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Expenses</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Loans</th>
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
                    <td className="px-4 py-3 text-right font-medium text-rose-600 hidden sm:table-cell">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600 hidden sm:table-cell">
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

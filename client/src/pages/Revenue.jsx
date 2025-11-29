import Layout from '../components/Layout.jsx';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

// Pie Chart Component
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
        strokeWidth="3"
        className="transition-all duration-300 hover:opacity-80"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      {paths}
      <circle cx={centerX} cy={centerY} r={radius * 0.5} fill="white" />
    </svg>
  );
}

const TIME_FILTERS = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan'
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
  
  const [timeFilter, setTimeFilter] = useState('monthly');
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

    incomes.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0 };
      }
      groups[key].incomes += Number(item.amount || 0);
    });

    expenses.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0 };
      }
      groups[key].expenses += Number(item.amount || 0);
    });

    loans.forEach(item => {
      const key = getKey(item.trans_date);
      if (!groups[key]) {
        groups[key] = { incomes: 0, expenses: 0, loans: 0 };
      }
      groups[key].loans += Number(item.amount || 0);
    });

    Object.keys(groups).forEach(key => {
      groups[key].netRevenue = groups[key].incomes - groups[key].expenses - groups[key].loans;
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, data]) => ({ period, ...data }));
  }, [incomes, expenses, loans, timeFilter]);

  // Filtered totals based on time period
  const filteredTotals = useMemo(() => {
    const totalIncome = groupedData.reduce((sum, item) => sum + item.incomes, 0);
    const totalExpense = groupedData.reduce((sum, item) => sum + item.expenses, 0);
    const totalLoans = groupedData.reduce((sum, item) => sum + item.loans, 0);
    const netRevenue = totalIncome - totalExpense - totalLoans;
    
    return { totalIncome, totalExpense, totalLoans, netRevenue };
  }, [groupedData]);

  // Category breakdown from database
  const categoryBreakdown = useMemo(() => {
    // Expense categories
    const expenseByCategory = {};
    expenses.forEach(item => {
      const cat = (item.category || 'LAINNYA').toUpperCase();
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(item.amount || 0);
    });

    // Income categories
    const incomeByCategory = {};
    incomes.forEach(item => {
      const cat = (item.category || 'LAINNYA').toUpperCase();
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(item.amount || 0);
    });

    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return { expenseByCategory, incomeByCategory, totalExpense, totalIncome };
  }, [incomes, expenses]);

  const formatPeriodLabel = period => {
    if (timeFilter === 'daily') {
      return formatDate(period);
    }
    if (timeFilter === 'weekly') {
      const parts = period.split('-');
      const year = parts[0];
      const month = parts[1];
      const week = parts[2].replace('W', '');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${monthNames[parseInt(month) - 1]} ${year} - Minggu ${week}`;
    }
    if (timeFilter === 'monthly') {
      const [year, month] = period.split('-');
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    return period;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white">
          <p className="text-xs uppercase tracking-widest text-white/70">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold">Revenue</h1>
        </div>

        {/* Time Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Periode</h2>
          <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
            {Object.entries(TIME_FILTERS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  timeFilter === key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Pie Chart & Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Distribusi Keuangan ({TIME_FILTERS[timeFilter]})
          </h3>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Pie Chart */}
            <div className="flex justify-center lg:justify-start">
              <PieChart 
                data={[
                  { value: filteredTotals.totalIncome, color: '#10b981' },
                  { value: filteredTotals.totalExpense, color: '#f43f5e' },
                  { value: filteredTotals.totalLoans, color: '#f59e0b' }
                ]}
                size={200}
              />
            </div>
            
            {/* Summary List */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                  <span className="font-medium text-slate-700">Income</span>
                </div>
                <span className="font-bold text-emerald-600">{formatCurrency(filteredTotals.totalIncome)}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-rose-500"></div>
                  <span className="font-medium text-slate-700">Expenses</span>
                </div>
                <span className="font-bold text-rose-600">{formatCurrency(filteredTotals.totalExpense)}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="font-medium text-slate-700">Loans</span>
                </div>
                <span className="font-bold text-amber-600">{formatCurrency(filteredTotals.totalLoans)}</span>
              </div>
              
              <div className={`flex items-center justify-between p-4 rounded-xl ${
                filteredTotals.netRevenue >= 0 
                  ? 'bg-blue-50 border border-blue-100' 
                  : 'bg-red-50 border border-red-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${filteredTotals.netRevenue >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium text-slate-700">Net Revenue</span>
                </div>
                <span className={`font-bold ${filteredTotals.netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(filteredTotals.netRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Income Breakdown by Category */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Rincian Pendapatan
          </h3>
          
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(categoryBreakdown.incomeByCategory || {})
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = categoryBreakdown.totalIncome > 0 ? (amount / categoryBreakdown.totalIncome * 100).toFixed(1) : 0;
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
            {Object.keys(categoryBreakdown.incomeByCategory || {}).length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-4">Tidak ada data pendapatan</div>
            )}
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-emerald-700">Total Pendapatan</span>
              <span className="text-xl font-bold text-emerald-700">
                {formatCurrency(categoryBreakdown.totalIncome)}
              </span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown by Category */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Rincian Pengeluaran
          </h3>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {Object.entries(categoryBreakdown.expenseByCategory || {})
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = categoryBreakdown.totalExpense > 0 ? (amount / categoryBreakdown.totalExpense * 100).toFixed(1) : 0;
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
            {Object.keys(categoryBreakdown.expenseByCategory || {}).length === 0 && (
              <div className="text-center text-slate-400 py-4">Tidak ada data pengeluaran</div>
            )}
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-100 to-rose-50 border border-rose-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-rose-700">Total Pengeluaran</span>
              <span className="text-xl font-bold text-rose-700">
                {formatCurrency(categoryBreakdown.totalExpense)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Detail Revenue ({TIME_FILTERS[timeFilter]})
          </h3>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Periode</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Income</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500 hidden sm:table-cell">Expense</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500 hidden sm:table-cell">Loan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  groupedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatPeriodLabel(row.period)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {formatCurrency(row.incomes)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium hidden sm:table-cell">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-medium hidden sm:table-cell">
                        {formatCurrency(row.loans)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        row.netRevenue >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(row.netRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

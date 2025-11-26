import Layout from '../components/Layout.jsx';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

const expensePresets = [
  { label: 'Alat', hint: 'Biaya peralatan dan maintenance' },
  { label: 'Lapangan', hint: 'Biaya operasional lapangan' },
  { label: 'ATK', hint: 'Alat tulis kantor' },
  { label: 'BBM', hint: 'Bahan bakar minyak' },
  { label: 'Bayar Hutang', hint: 'Pembayaran hutang/pinjaman' }
];

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

const formatNumberInput = (value) => {
  const num = value.replace(/\D/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseFormattedNumber = (value) => {
  return value.replace(/\./g, '');
};

export default function Expense() {
  const token = localStorage.getItem('token');
  const api = axios.create({ baseURL: API_BASE_URL, headers: { Authorization: `Bearer ${token}` } });

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
    throw error;
  };

  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    trans_date: '',
    category: expensePresets[0]?.label || '',
    description: '',
    amount: ''
  });
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryKey, setCategoryKey] = useState(expensePresets[0]?.label || '__custom');
  const [customCategory, setCustomCategory] = useState('');
  const [confirmItem, setConfirmItem] = useState(null);

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/expenses');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      handleAuthError(err);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAmountChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatNumberInput(rawValue);
    setDisplayAmount(formatted);
    setForm(prev => ({ ...prev, amount: parseFormattedNumber(formatted) }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        trans_date: form.trans_date,
        category: form.category || customCategory || 'Lainnya',
        description: form.description,
        amount: Number(form.amount || 0)
      };
      await api.post('/expenses', payload);
      setForm({
        trans_date: '',
        category: expensePresets[0]?.label || '',
        description: '',
        amount: ''
      });
      setDisplayAmount('');
      setCategoryKey(expensePresets[0]?.label || '__custom');
      setCustomCategory('');
      fetchItems();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/expenses/${id}`);
      fetchItems();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const confirmDelete = async () => {
    if (!confirmItem) return;
    await handleDelete(confirmItem.id);
    setConfirmItem(null);
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const activePresetHint = expensePresets.find(opt => opt.label === form.category)?.hint;

  return (
    <Layout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 p-6 sm:p-8 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Expense Management</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Expense</h1>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Input Expense</h2>
          </div>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Entries</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length.toString().padStart(2, '0')}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
              <p className="text-xs uppercase tracking-widest text-slate-500">Total Amount</p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-rose-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                value={form.trans_date}
                onChange={e => setForm(prev => ({ ...prev, trans_date: e.target.value }))}
                required
              />
              <div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  value={
                    expensePresets.some(opt => opt.label === form.category)
                      ? form.category
                      : '__custom'
                  }
                  onChange={e => {
                    const value = e.target.value;
                    setCategoryKey(value);
                    if (value === '__custom') {
                      setForm(prev => ({ ...prev, category: customCategory }));
                    } else {
                      setForm(prev => ({ ...prev, category: value }));
                    }
                  }}
                >
                  {expensePresets.map(option => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                  <option value="__custom">Kategori lainnya...</option>
                </select>
                {categoryKey === '__custom' && (
                  <input
                    type="text"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    placeholder="Tulis kategori custom"
                    value={customCategory}
                    onChange={e => {
                      setCustomCategory(e.target.value);
                      setForm(prev => ({ ...prev, category: e.target.value }));
                    }}
                    required={!form.category}
                  />
                )}
                {activePresetHint && (
                  <p className="mt-2 text-xs text-slate-500">Hint: {activePresetHint}</p>
                )}
              </div>
            </div>

            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
              rows="2"
              placeholder="Deskripsi / detail catatan"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />

            <div className="nominal-input-wrapper">
              <span className="currency-prefix">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-sm text-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                placeholder="0"
                value={displayAmount}
                onChange={handleAmountChange}
                required
              />
            </div>

            <button className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:opacity-95">
              Simpan Expense
            </button>
          </form>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                      Belum ada data. Silakan isi form di atas.
                    </td>
                  </tr>
                )}
                {items.map(item => (
                  <tr key={item.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-700">{formatDate(item.trans_date)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.category}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {item.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmItem({ id: item.id, category: item.category, amount: item.amount, date: item.trans_date })}
                        className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {confirmItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Confirm deletion</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Hapus data ini?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDate(confirmItem.date)} · {confirmItem.category}
                </p>
                <p className="text-base font-semibold text-rose-600">{formatCurrency(confirmItem.amount)}</p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={confirmDelete}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:opacity-95"
                  >
                    Ya, hapus
                  </button>
                  <button
                    onClick={() => setConfirmItem(null)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

import Layout from '../components/Layout.jsx';
import DataFilter from '../components/DataFilter.jsx';
import ExportButton, { exportFromServer } from '../components/ExcelExport.jsx';
import { useEffect, useState, useCallback } from 'react';
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
  const userRole = localStorage.getItem('userRole') || 'admin';
  const isAdmin = userRole === 'admin';
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
  const [filteredItems, setFilteredItems] = useState([]);
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
  const [detailItem, setDetailItem] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleFilteredItems = useCallback((filtered) => {
    setFilteredItems(filtered);
  }, []);

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

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const filename = await exportFromServer('expenses', 'xlsx');
      console.log('Exported to:', filename);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal export data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const activePresetHint = expensePresets.find(opt => opt.label === form.category)?.hint;

  return (
    <Layout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 p-6 sm:p-8 text-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Expense Management</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Expense</h1>
            </div>
            <ExportButton 
              onClick={handleExportExcel} 
              loading={isExporting}
              colorScheme="rose"
            >
              Export Excel
            </ExportButton>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-xl backdrop-blur">
          <div className="border-b border-slate-100 pb-4 mb-4">
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

          {isAdmin && (
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
          )}

          {!isAdmin && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              <span className="font-semibold">View Only Mode:</span> Anda hanya dapat melihat data. Hubungi admin untuk menambah atau mengedit data.
            </div>
          )}

          {/* Filter Section */}
          <div className="mt-6">
            <DataFilter
              items={items}
              onFilteredItems={handleFilteredItems}
              colorScheme="rose"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
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
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                      {items.length === 0 ? 'Belum ada data. Silakan isi form di atas.' : 'Tidak ada data yang sesuai dengan filter.'}
                    </td>
                  </tr>
                )}
                {filteredItems.map(item => (
                  <tr 
                    key={item.id} 
                    className="transition hover:bg-slate-50/60 cursor-pointer"
                    onClick={() => setDetailItem(item)}
                  >
                    <td className="px-4 py-3 text-slate-700">{formatDate(item.trans_date)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.category}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {item.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmItem({ id: item.id, category: item.category, amount: item.amount, date: item.trans_date })}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                        >
                          Delete
                        </button>
                      )}
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

          {/* Detail Modal */}
          {detailItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setDetailItem(null)}>
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-rose-600 font-semibold">Detail Expense</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">{detailItem.category}</h3>
                  </div>
                  <button 
                    onClick={() => setDetailItem(null)}
                    className="p-2 rounded-full hover:bg-slate-100 transition"
                  >
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Main Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs uppercase tracking-wider text-slate-500">Tanggal</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatDate(detailItem.trans_date)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50">
                      <p className="text-xs uppercase tracking-wider text-rose-600">Amount</p>
                      <p className="mt-1 font-bold text-rose-600">{formatCurrency(detailItem.amount)}</p>
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Kategori</p>
                    <p className="mt-1 font-semibold text-slate-900">{detailItem.category}</p>
                    {expensePresets.find(p => p.label === detailItem.category)?.hint && (
                      <p className="mt-1 text-sm text-slate-500">
                        {expensePresets.find(p => p.label === detailItem.category)?.hint}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Deskripsi</p>
                    <p className="mt-1 text-sm text-slate-700">{detailItem.description || 'Tidak ada deskripsi'}</p>
                  </div>

                  {/* Created Info */}
                  {detailItem.created_at && (
                    <div className="p-3 rounded-xl bg-slate-50/50 text-center">
                      <p className="text-xs text-slate-400">
                        Dibuat pada {new Date(detailItem.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setDetailItem(null);
                          setConfirmItem({ id: detailItem.id, category: detailItem.category, amount: detailItem.amount, date: detailItem.trans_date });
                        }}
                        className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:opacity-95"
                      >
                        Hapus Data
                      </button>
                    )}
                    <button
                      onClick={() => setDetailItem(null)}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

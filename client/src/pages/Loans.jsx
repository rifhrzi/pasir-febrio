import Layout from '../components/Layout.jsx';
import { useEffect, useState } from 'react';
import axios from 'axios';

const loansPresets = [
  { label: 'Pra-penjualan: Deposit 350jt (1.000 rit tronton)', hint: 'Pinjaman dari orang tua' },
  { label: 'Pinjaman selama proses galian', hint: 'Kebutuhan berjalan selama galian' },
  { label: 'Utang stokfile', hint: 'Pembelian stok sebelum gajian' },
  { label: 'Utang solar Yadi / Ipan', hint: 'BBM via pinjaman' },
  { label: 'Utang kebutuhan lapangan', hint: 'BOP, warung, kebutuhan lain' },
  { label: 'Utang lainnya sebelum gajian', hint: 'Catat vendor lain' }
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

export default function Loans() {
  const token = localStorage.getItem('token');
  const api = axios.create({ baseURL: '/api', headers: { Authorization: `Bearer ${token}` } });

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
    category: loansPresets[0]?.label || '',
    description: '',
    amount: ''
  });
  const [categoryKey, setCategoryKey] = useState(loansPresets[0]?.label || '__custom');
  const [customCategory, setCustomCategory] = useState('');
  const [confirmItem, setConfirmItem] = useState(null);

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/loans');
      setItems(data);
    } catch (err) {
      handleAuthError(err);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleExport = async () => {
    try {
      const { data } = await api.get('/export/all', { params: { format: 'xlsx' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loans_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      handleAuthError(err);
    }
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
      await api.post('/loans', payload);
      setForm({
        trans_date: '',
        category: loansPresets[0]?.label || '',
        description: '',
        amount: ''
      });
      setCategoryKey(loansPresets[0]?.label || '__custom');
      setCustomCategory('');
      fetchItems();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/loans/${id}`);
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
  const activePresetHint = loansPresets.find(opt => opt.label === form.category)?.hint;

  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 p-8 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Loans Management</p>
          <h1 className="mt-3 text-4xl font-semibold">Loans</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Catat pinjaman dan hutang dengan rapi menggunakan preset kategori sesuai catatan operasional.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Catat loans dengan rapi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Gunakan preset kategori sesuai catatan operasional.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">XLSX</span>
                Export
              </button>
            </div>
          </div>

          <div className="grid gap-4 py-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Entries</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length.toString().padStart(2, '0')}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
              <p className="text-xs uppercase tracking-widest text-slate-500">Total Amount</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={form.trans_date}
                onChange={e => setForm(prev => ({ ...prev, trans_date: e.target.value }))}
                required
              />
              <div>
                <select
                  className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={
                    loansPresets.some(opt => opt.label === form.category)
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
                  {loansPresets.map(option => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                  <option value="__custom">Kategori lainnya...</option>
                </select>
                {categoryKey === '__custom' && (
                  <input
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-transparent bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
              className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows="2"
              placeholder="Deskripsi / detail catatan"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />

            <input
              type="number"
              className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Nominal"
              value={form.amount}
              onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              required
            />

            <button className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:opacity-95">
              Simpan Loans
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
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
                    <td className="px-4 py-3 text-slate-600">
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
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Confirm deletion</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Hapus data ini?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDate(confirmItem.date)} · {confirmItem.category}
                </p>
                <p className="text-base font-semibold text-rose-600">{formatCurrency(confirmItem.amount)}</p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={confirmDelete}
                    className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:opacity-95"
                  >
                    Ya, hapus
                  </button>
                  <button
                    onClick={() => setConfirmItem(null)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
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


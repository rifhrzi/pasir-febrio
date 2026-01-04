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
    amount: '',
    proof_image: ''
  });
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryKey, setCategoryKey] = useState(expensePresets[0]?.label || '__custom');
  const [customCategory, setCustomCategory] = useState('');
  const [confirmItem, setConfirmItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleProofImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setProofPreview(null);
      setForm(prev => ({ ...prev, proof_image: '' }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan (JPG, PNG, etc.)');
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setProofPreview(base64);
      setForm(prev => ({ ...prev, proof_image: base64 }));
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Gagal membaca file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const clearProofImage = () => {
    setProofPreview(null);
    setForm(prev => ({ ...prev, proof_image: '' }));
    // Reset file input
    const fileInput = document.getElementById('proof-image-input');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        trans_date: form.trans_date,
        category: form.category || customCategory || 'Lainnya',
        description: form.description,
        amount: Number(form.amount || 0),
        proof_image: form.proof_image || null
      };
      await api.post('/expenses', payload);
      setForm({
        trans_date: '',
        category: expensePresets[0]?.label || '',
        description: '',
        amount: '',
        proof_image: ''
      });
      setDisplayAmount('');
      setCategoryKey(expensePresets[0]?.label || '__custom');
      setCustomCategory('');
      setProofPreview(null);
      // Reset file input
      const fileInput = document.getElementById('proof-image-input');
      if (fileInput) fileInput.value = '';
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

            {/* Bukti Transaksi Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Bukti Transaksi (Opsional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed ${proofPreview ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'} px-4 py-3 transition hover:border-rose-400 hover:bg-rose-50`}>
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm">Memproses...</span>
                      </div>
                    ) : proofPreview ? (
                      <div className="flex items-center gap-2 text-rose-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">Bukti sudah diupload</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">Upload foto/gambar bukti</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="proof-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProofImageChange}
                  />
                </label>
                {proofPreview && (
                  <button
                    type="button"
                    onClick={clearProofImage}
                    className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
                    title="Hapus bukti"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Preview Image */}
              {proofPreview && (
                <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img 
                    src={proofPreview} 
                    alt="Preview bukti transaksi" 
                    className="w-full h-40 object-contain"
                  />
                </div>
              )}
              <p className="text-xs text-slate-400">Format: JPG, PNG (Maks. 5MB)</p>
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
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {item.category}
                        {item.proof_image && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100" title="Ada bukti transaksi">
                            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
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

                  {/* Bukti Transaksi */}
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Bukti Transaksi</p>
                    {detailItem.proof_image ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img 
                            src={detailItem.proof_image} 
                            alt="Bukti transaksi" 
                            className="w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(detailItem.proof_image, '_blank')}
                          />
                        </div>
                        <button
                          onClick={() => window.open(detailItem.proof_image, '_blank')}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Lihat ukuran penuh
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">Tidak ada bukti transaksi</span>
                      </div>
                    )}
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

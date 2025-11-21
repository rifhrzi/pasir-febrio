import Layout from '../components/Layout.jsx';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import fileDownload from 'js-file-download';

const endpoints = {
  incomes: '/incomes',
  expenses: '/expenses',
  loans: '/loans'
};

const POTONGAN_LABELS = {
  loading: 'Loading',
  market: 'Market',
  broker: 'Broker'
};

const incomeProducts = {
  pasirAyak: {
    label: 'Pasir Ayak',
    trucks: {
      tronton: {
        label: 'Tronton',
        price: 1100000,
        deductions: { loading: 50000, market: 35000, broker: 40000 }
      },
      colt: {
        label: 'Colt Diesel',
        price: 300000,
        deductions: { loading: 10000, market: 10000, broker: 40000 }
      }
    }
  },
  pasirLempung: {
    label: 'Pasir Lempung',
    trucks: {
      colt: {
        label: 'Colt Diesel',
        price: 300000,
        deductions: { loading: 10000, market: 10000 }
      }
    }
  }
};

const ledgerPresets = {
  expenses: [
    { label: 'Operator (3 orang)', hint: '400k / orang / hari' },
    { label: 'Checker (pagi & malam)', hint: '200k per shift' },
    { label: 'Pengawas', hint: '400k / hari / orang' },
    { label: 'Security', hint: '50k / hari' },
    { label: 'Welder', hint: 'Isi sesuai kebutuhan' },
    { label: 'Helper', hint: 'Isi sesuai kebutuhan' },
    { label: 'Admin', hint: '150k per shift' },
    { label: 'Makan pagi', hint: 'Biaya konsumsi pagi' },
    { label: 'Makan malam', hint: 'Biaya konsumsi malam' },
    { label: 'Gajian crew', hint: 'Kecuali security/welder' },
    { label: 'BOP lapangan', hint: 'Pengeluaran operasional' },
    { label: 'Warung / kebutuhan harian', hint: 'Catat pembelian kecil' },
    { label: 'Maintenance / MT', hint: 'Perawatan alat & ayakan' },
    { label: 'Belanja grease', hint: 'Pelumas/grease' },
    { label: 'Belanja kuku bucket', hint: 'Sparepart bucket' },
    { label: 'Belanja boshing', hint: 'Sparepart lainnya' },
    { label: 'Service alat', hint: 'Service alat berat' },
    { label: 'Service ayakan', hint: 'Perbaikan ayakan' },
    { label: 'Listrik', hint: 'Tagihan listrik lokasi' },
    { label: 'Solar Ipan', hint: 'BBM untuk armada / Ipan' },
    { label: 'Solar Yadi', hint: 'BBM untuk armada / Yadi' },
    { label: 'Lain-lain', hint: 'Catatan lainnya' }
  ],
  loans: [
    { label: 'Pra-penjualan: Deposit 350jt (1.000 rit tronton)', hint: 'Pinjaman dari orang tua' },
    { label: 'Pinjaman selama proses galian', hint: 'Kebutuhan berjalan selama galian' },
    { label: 'Utang stokfile', hint: 'Pembelian stok sebelum gajian' },
    { label: 'Utang solar Yadi / Ipan', hint: 'BBM via pinjaman' },
    { label: 'Utang kebutuhan lapangan', hint: 'BOP, warung, kebutuhan lain' },
    { label: 'Utang lainnya sebelum gajian', hint: 'Catat vendor lain' }
  ]
};

const defaultIncomeForm = () => {
  const productKey = 'pasirAyak';
  const truckKey = 'tronton';
  const truck = incomeProducts[productKey].trucks[truckKey];
  return {
    trans_date: '',
    productKey,
    truckKey,
    quantity: 1,
    price: truck.price,
    deductions: { ...truck.deductions },
    notes: ''
  };
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

function TableSection({ title, type }) {
  const isIncome = type === 'incomes';
  const token = localStorage.getItem('token');
  const api = axios.create({ baseURL: '/api', headers: { Authorization: `Bearer ${token}` } });
  const apiAuth = axios.create({ baseURL: '/api', headers: { Authorization: `Bearer ${token}` } });
  const presetOptions = ledgerPresets[type] || [];

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
  const [basicForm, setBasicForm] = useState(() => ({
    trans_date: '',
    category: presetOptions[0]?.label || '',
    description: '',
    amount: ''
  }));
  const [categoryKey, setCategoryKey] = useState(presetOptions[0]?.label || '__custom');
  const [customCategory, setCustomCategory] = useState('');
  const [incomeForm, setIncomeForm] = useState(defaultIncomeForm);
  const [confirmItem, setConfirmItem] = useState(null);

  const currentProduct = incomeProducts[incomeForm.productKey];
  const currentTruck = currentProduct?.trucks[incomeForm.truckKey];

  const perLoadDeduction = useMemo(() => {
    if (!isIncome) return 0;
    return Object.values(incomeForm.deductions || {}).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );
  }, [incomeForm.deductions, isIncome]);

  const grossAmount = useMemo(() => {
    if (!isIncome) return 0;
    return Number(incomeForm.price || 0) * Number(incomeForm.quantity || 0);
  }, [incomeForm.price, incomeForm.quantity, isIncome]);

  const totalDeductions = useMemo(() => {
    if (!isIncome) return 0;
    return perLoadDeduction * Number(incomeForm.quantity || 0);
  }, [perLoadDeduction, incomeForm.quantity, isIncome]);

  const netIncome = useMemo(() => {
    if (!isIncome) return 0;
    return grossAmount - totalDeductions;
  }, [grossAmount, totalDeductions, isIncome]);

  const fetchItems = async () => {
    try {
      const { data } = await api.get(endpoints[type]);
      setItems(data);
    } catch (err) {
      handleAuthError(err);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    if (!isIncome || !currentTruck) return;
    setIncomeForm(prev => ({
      ...prev,
      price: currentTruck.price,
      deductions: { ...currentTruck.deductions }
    }));
  }, [isIncome, incomeForm.productKey, incomeForm.truckKey]);

  const handleExport = async format => {
    try {
      const { data } = await apiAuth.get('/export/all', { params: { format }, responseType: 'blob' });
      fileDownload(data, `export_${Date.now()}.${format}`);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const submitIncome = async () => {
    const productLabel = currentProduct?.label || 'Pasir';
    const truckLabel = currentTruck?.label || '';
    const payload = {
      trans_date: incomeForm.trans_date,
      category: `${productLabel} - ${truckLabel}`.trim(),
      description: JSON.stringify({
        __type: 'income-v1',
        productKey: incomeForm.productKey,
        productLabel,
        truckKey: incomeForm.truckKey,
        truckLabel,
        quantity: Number(incomeForm.quantity || 0),
        unitPrice: Number(incomeForm.price || 0),
        perLoadDeductions: incomeForm.deductions,
        gross: grossAmount,
        perLoadDeductionTotal: perLoadDeduction,
        deductionTotal: totalDeductions,
        net: netIncome,
        notes: incomeForm.notes || ''
      }),
      amount: Number(netIncome.toFixed(2))
    };
    await api.post(endpoints.incomes, payload);
    setIncomeForm(defaultIncomeForm());
  };

  const submitLedger = async () => {
    const payload = {
      trans_date: basicForm.trans_date,
      category: basicForm.category || customCategory || 'Lainnya',
      description: basicForm.description,
      amount: Number(basicForm.amount || 0)
    };
    await api.post(endpoints[type], payload);
    setBasicForm({
      trans_date: '',
      category: presetOptions[0]?.label || '',
      description: '',
      amount: ''
    });
    setCategoryKey(presetOptions[0]?.label || '__custom');
    setCustomCategory('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (isIncome) {
        await submitIncome();
      } else {
        await submitLedger();
      }
      fetchItems();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`${endpoints[type]}/${id}`);
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
  const activePresetHint = presetOptions.find(opt => opt.label === basicForm.category)?.hint;

  const renderIncomeDescription = row => {
    const parsed = parseIncomeDescription(row.description);
    if (!parsed) return row.description || 'N/A';
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">
          {parsed.quantity} rit • {parsed.productLabel} {parsed.truckLabel}
        </p>
        <p className="text-xs text-slate-500">
          Gross {formatCurrency(parsed.gross)} · Potongan {formatCurrency(parsed.deductionTotal)} · Net {formatCurrency(parsed.net)}
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(parsed.perLoadDeductions || {}).map(([key, value]) => (
            <span key={key} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
              {POTONGAN_LABELS[key] || key}: {formatCurrency(value)} / rit
            </span>
          ))}
        </div>
        {parsed.notes && <p className="text-xs italic text-slate-500">{parsed.notes}</p>}
      </div>
    );
  };

  return (
    <section className="mb-12 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{title}</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {isIncome ? 'Retail pasir ayak & lempung' : `Catat ${title.toLowerCase()} dengan rapi`}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isIncome
              ? 'Hitung otomatis harga rit, potongan loading/market/broker, dan simpan bersihnya.'
              : 'Gunakan preset kategori sesuai catatan operasional.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">XLSX</span>
            Export
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">PDF</span>
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
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="date"
            className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={isIncome ? incomeForm.trans_date : basicForm.trans_date}
            onChange={e => {
              if (isIncome) setIncomeForm(prev => ({ ...prev, trans_date: e.target.value }));
              else setBasicForm(prev => ({ ...prev, trans_date: e.target.value }));
            }}
            required
          />
          {!isIncome && (
            <div>
              <select
                className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={
                  presetOptions.some(opt => opt.label === basicForm.category)
                    ? basicForm.category
                    : '__custom'
                }
                onChange={e => {
                  const value = e.target.value;
                  setCategoryKey(value);
                  if (value === '__custom') {
                    setBasicForm(prev => ({ ...prev, category: customCategory }));
                  } else {
                    setBasicForm(prev => ({ ...prev, category: value }));
                  }
                }}
              >
                {presetOptions.map(option => (
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
                    setBasicForm(prev => ({ ...prev, category: e.target.value }));
                  }}
                  required={!basicForm.category}
                />
              )}
              {activePresetHint && (
                <p className="mt-2 text-xs text-slate-500">Hint: {activePresetHint}</p>
              )}
            </div>
          )}
          {isIncome && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={incomeForm.productKey}
                  onChange={e => setIncomeForm(prev => ({ ...prev, productKey: e.target.value, truckKey: Object.keys(incomeProducts[e.target.value].trucks)[0] }))}
                >
                  {Object.entries(incomeProducts).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={incomeForm.truckKey}
                  onChange={e => setIncomeForm(prev => ({ ...prev, truckKey: e.target.value }))}
                >
                  {Object.entries(currentProduct?.trucks || {}).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={incomeForm.quantity}
                  onChange={e => setIncomeForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  placeholder="Jumlah rit / truk"
                  required
                />
                <input
                  type="number"
                  className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={incomeForm.price}
                  onChange={e => setIncomeForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="Harga per rit"
                  required
                />
              </div>
            </>
          )}
        </div>

        {isIncome ? (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {['loading', 'market', 'broker']
                .filter(key => incomeForm.deductions?.[key] !== undefined)
                .map(key => (
                  <div key={key}>
                    <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">
                      {POTONGAN_LABELS[key]}
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-transparent bg-white px-3 py-2 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      value={incomeForm.deductions[key]}
                      onChange={e =>
                        setIncomeForm(prev => ({
                          ...prev,
                          deductions: { ...prev.deductions, [key]: Number(e.target.value) }
                        }))
                      }
                      placeholder="Nominal potongan / rit"
                    />
                  </div>
                ))}
            </div>
            <textarea
              className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows="2"
              placeholder="Catatan tambahan (opsional)"
              value={incomeForm.notes}
              onChange={e => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-500">
                Gross
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(grossAmount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-500">
                Potongan total
                <p className="text-lg font-semibold text-rose-600">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-500">
                Bersih
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(netIncome)}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows="2"
              placeholder="Deskripsi / detail catatan"
              value={basicForm.description}
              onChange={e => setBasicForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <input
              type="number"
              className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Nominal"
              value={basicForm.amount}
              onChange={e => setBasicForm(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </>
        )}

        <button className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:opacity-95">
          Simpan {title}
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
                  {isIncome ? renderIncomeDescription(item) : (item.description || 'N/A')}
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
  );
}

export default function Dashboard() {
  const tabs = [
    { key: 'incomes', label: 'Income' },
    { key: 'expenses', label: 'Expense' },
    { key: 'loans', label: 'Loans' }
  ];
  const [active, setActive] = useState('incomes');
  const activeTab = tabs.find(tab => tab.key === active);

  return (
    <Layout>
      <div className="space-y-10">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 p-8 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Finance Control</p>
          <h1 className="mt-3 text-4xl font-semibold">Pasir Finance Dashboard</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Fokus pada retail pasir ayak & lempung. Catat pemasukan, potongan loading/market/broker, biaya operasional,
            dan pinjaman pra-penjualan dalam satu workspace admin.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/80">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-sm font-semibold">DF</span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Active Dataset</p>
                <p className="text-base font-medium text-white">{activeTab?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-sm font-semibold">EX</span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Instant Exports</p>
                <p className="text-base font-medium text-white">Excel & PDF</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Data streams</p>
            <h2 className="text-2xl font-semibold text-slate-900">Switch between categories seamlessly</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${active === t.key ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {active === 'incomes' && <TableSection title="Income" type="incomes" />}
        {active === 'expenses' && <TableSection title="Expense" type="expenses" />}
        {active === 'loans' && <TableSection title="Loans" type="loans" />}
      </div>
    </Layout>
  );
}

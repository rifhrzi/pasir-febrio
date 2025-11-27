import Layout from '../components/Layout.jsx';
import DataFilter from '../components/DataFilter.jsx';
import ExportButton, { exportIncomesToExcel } from '../components/ExcelExport.jsx';
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

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

const formatNumberInput = (value) => {
  const num = String(value).replace(/\D/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseFormattedNumber = (value) => {
  return String(value).replace(/\./g, '');
};

export default function Income() {
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
  const [incomeForm, setIncomeForm] = useState(defaultIncomeForm);
  const [confirmItem, setConfirmItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const handleFilteredItems = useCallback((filtered) => {
    setFilteredItems(filtered);
  }, []);
  const [displayPrice, setDisplayPrice] = useState(formatNumberInput(defaultIncomeForm().price));
  const [displayDeductions, setDisplayDeductions] = useState(() => {
    const form = defaultIncomeForm();
    const result = {};
    Object.keys(form.deductions).forEach(key => {
      result[key] = formatNumberInput(form.deductions[key]);
    });
    return result;
  });

  const currentProduct = incomeProducts[incomeForm.productKey];
  const currentTruck = currentProduct?.trucks[incomeForm.truckKey];

  const perLoadDeduction = useMemo(() => {
    return Object.values(incomeForm.deductions || {}).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );
  }, [incomeForm.deductions]);

  const grossAmount = useMemo(() => {
    return Number(incomeForm.price || 0) * Number(incomeForm.quantity || 0);
  }, [incomeForm.price, incomeForm.quantity]);

  const totalDeductions = useMemo(() => {
    return perLoadDeduction * Number(incomeForm.quantity || 0);
  }, [perLoadDeduction, incomeForm.quantity]);

  const netIncome = useMemo(() => {
    return grossAmount - totalDeductions;
  }, [grossAmount, totalDeductions]);

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/incomes');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      handleAuthError(err);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    if (!currentTruck) return;
    setIncomeForm(prev => ({
      ...prev,
      price: currentTruck.price,
      deductions: { ...currentTruck.deductions }
    }));
    setDisplayPrice(formatNumberInput(currentTruck.price));
    const newDisplayDeductions = {};
    Object.keys(currentTruck.deductions).forEach(key => {
      newDisplayDeductions[key] = formatNumberInput(currentTruck.deductions[key]);
    });
    setDisplayDeductions(newDisplayDeductions);
  }, [incomeForm.productKey, incomeForm.truckKey]);

  const handlePriceChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatNumberInput(rawValue);
    setDisplayPrice(formatted);
    setIncomeForm(prev => ({ ...prev, price: Number(parseFormattedNumber(formatted)) }));
  };

  const handleDeductionChange = (key, value) => {
    const formatted = formatNumberInput(value);
    setDisplayDeductions(prev => ({ ...prev, [key]: formatted }));
    setIncomeForm(prev => ({
      ...prev,
      deductions: { ...prev.deductions, [key]: Number(parseFormattedNumber(formatted)) }
    }));
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
    await api.post('/incomes', payload);
    setIncomeForm(defaultIncomeForm());
    const defaultForm = defaultIncomeForm();
    setDisplayPrice(formatNumberInput(defaultForm.price));
    const newDisplayDeductions = {};
    Object.keys(defaultForm.deductions).forEach(key => {
      newDisplayDeductions[key] = formatNumberInput(defaultForm.deductions[key]);
    });
    setDisplayDeductions(newDisplayDeductions);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await submitIncome();
      fetchItems();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/incomes/${id}`);
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

  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }
    setIsExporting(true);
    try {
      const filename = exportIncomesToExcel(items, 'PT_Dzikry_Income');
      console.log('Exported to:', filename);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal export data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

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
    <Layout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Income Management</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Income</h1>
            </div>
            <ExportButton 
              onClick={handleExportExcel} 
              loading={isExporting}
              colorScheme="emerald"
            >
              Export Excel
            </ExportButton>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-xl backdrop-blur">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Input Income</h2>
          </div>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Entries</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length.toString().padStart(2, '0')}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
              <p className="text-xs uppercase tracking-widest text-slate-500">Total Amount</p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-emerald-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          {isAdmin && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={incomeForm.trans_date}
                onChange={e => setIncomeForm(prev => ({ ...prev, trans_date: e.target.value }))}
                required
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={incomeForm.productKey}
                  onChange={e => setIncomeForm(prev => ({ ...prev, productKey: e.target.value, truckKey: Object.keys(incomeProducts[e.target.value].trucks)[0] }))}
                >
                  {Object.entries(incomeProducts).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={incomeForm.truckKey}
                  onChange={e => setIncomeForm(prev => ({ ...prev, truckKey: e.target.value }))}
                >
                  {Object.entries(currentProduct?.trucks || {}).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                min="1"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={incomeForm.quantity}
                onChange={e => setIncomeForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                placeholder="Jumlah rit / truk"
                required
              />
              <div className="nominal-input-wrapper">
                <span className="currency-prefix">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-12 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={displayPrice}
                  onChange={handlePriceChange}
                  placeholder="Harga per rit"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {['loading', 'market', 'broker']
                .filter(key => incomeForm.deductions?.[key] !== undefined)
                .map(key => (
                  <div key={key}>
                    <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">
                      {POTONGAN_LABELS[key]}
                    </label>
                    <div className="nominal-input-wrapper">
                      <span className="currency-prefix text-xs">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        value={displayDeductions[key] || ''}
                        onChange={e => handleDeductionChange(key, e.target.value)}
                        placeholder="Nominal / rit"
                      />
                    </div>
                  </div>
                ))}
            </div>

            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              rows="2"
              placeholder="Catatan tambahan (opsional)"
              value={incomeForm.notes}
              onChange={e => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-500">
                Gross
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(grossAmount)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-500">
                Potongan total
                <p className="text-lg font-semibold text-rose-600">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-500">
                Bersih
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(netIncome)}</p>
              </div>
            </div>

            <button className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:opacity-95">
              Simpan Income
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
              colorScheme="emerald"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 hidden md:table-cell">Description</th>
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
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {renderIncomeDescription(item)}
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
            <div 
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setConfirmItem(null)}
            >
              <div 
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideUp 0.2s ease-out' }}
              >
                {/* Warning Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900">Hapus Data Ini?</h3>
                  <p className="mt-2 text-sm text-slate-500">Data yang dihapus tidak dapat dikembalikan</p>
                </div>

                {/* Data Info Card */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">Tanggal</p>
                      <p className="font-medium text-slate-700">{formatDate(confirmItem.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-slate-400">Amount</p>
                      <p className="font-bold text-rose-600">{formatCurrency(confirmItem.amount)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Kategori</p>
                    <p className="font-semibold text-slate-900">{confirmItem.category}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setConfirmItem(null)}
                    className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-700 active:scale-95"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {detailItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setDetailItem(null)}>
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 font-semibold">Detail Income</p>
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
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs uppercase tracking-wider text-slate-500">Tanggal</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatDate(detailItem.trans_date)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50">
                      <p className="text-xs uppercase tracking-wider text-emerald-600">Total Amount</p>
                      <p className="mt-1 font-bold text-emerald-600">{formatCurrency(detailItem.amount)}</p>
                    </div>
                  </div>

                  {/* Parsed Income Details */}
                  {(() => {
                    const parsed = parseIncomeDescription(detailItem.description);
                    if (parsed) {
                      return (
                        <>
                          <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Detail Transaksi</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-slate-500">Produk</p>
                                <p className="font-semibold text-slate-900">{parsed.product}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Tipe Truk</p>
                                <p className="font-semibold text-slate-900">{parsed.truck}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Jumlah Rit</p>
                                <p className="font-semibold text-slate-900">{parsed.quantity} rit</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Harga per Rit</p>
                                <p className="font-semibold text-slate-900">{formatCurrency(parsed.price)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Deductions */}
                          {parsed.deductions && Object.keys(parsed.deductions).length > 0 && (
                            <div className="p-4 rounded-xl bg-rose-50 space-y-3">
                              <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold">Potongan per Rit</p>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                {Object.entries(parsed.deductions).map(([key, value]) => (
                                  <div key={key}>
                                    <p className="text-rose-500 capitalize">{POTONGAN_LABELS[key] || key}</p>
                                    <p className="font-semibold text-rose-700">{formatCurrency(value)}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-rose-200">
                                <p className="text-xs text-rose-500">Total Potongan</p>
                                <p className="font-bold text-rose-700">
                                  {formatCurrency(
                                    Object.values(parsed.deductions).reduce((sum, v) => sum + Number(v || 0), 0) * parsed.quantity
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Calculation Summary */}
                          <div className="p-4 rounded-xl bg-emerald-50 space-y-2">
                            <p className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">Ringkasan</p>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Gross ({parsed.quantity} × {formatCurrency(parsed.price)})</span>
                              <span className="font-semibold">{formatCurrency(parsed.quantity * parsed.price)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-rose-600">Potongan</span>
                              <span className="font-semibold text-rose-600">
                                -{formatCurrency(
                                  Object.values(parsed.deductions || {}).reduce((sum, v) => sum + Number(v || 0), 0) * parsed.quantity
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-emerald-200">
                              <span className="font-semibold text-emerald-700">Net Income</span>
                              <span className="font-bold text-emerald-700">{formatCurrency(detailItem.amount)}</span>
                            </div>
                          </div>

                          {/* Notes */}
                          {parsed.notes && (
                            <div className="p-4 rounded-xl bg-slate-50">
                              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Catatan</p>
                              <p className="mt-1 text-sm text-slate-700">{parsed.notes}</p>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      return (
                        <div className="p-4 rounded-xl bg-slate-50">
                          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Deskripsi</p>
                          <p className="mt-1 text-sm text-slate-700">{detailItem.description || 'Tidak ada deskripsi'}</p>
                        </div>
                      );
                    }
                  })()}

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

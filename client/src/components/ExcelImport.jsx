import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

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

// Parse Excel date (Excel stores dates as numbers)
const parseExcelDate = (value) => {
  if (!value) return null;
  
  // If it's already a valid date string
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    // Try DD/MM/YYYY format
    const parts = value.split(/[\/\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return null;
  }
  
  // If it's an Excel serial date number
  if (typeof value === 'number') {
    // Excel date serial number starts from 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }
  
  return null;
};

// Parse amount (handle various formats)
const parseAmount = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols, spaces, dots (thousands separator), and replace comma with dot
    const cleaned = value.replace(/[Rp\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export default function ExcelImport({ 
  isOpen, 
  onClose, 
  onImport, 
  type = 'income', // 'income', 'expense', 'loans'
  isLoading = false 
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload', 'preview', 'mapping'
  const [columnMapping, setColumnMapping] = useState({});
  const [headers, setHeaders] = useState([]);
  const fileInputRef = useRef(null);

  const requiredFields = {
    income: ['trans_date', 'category', 'amount'],
    expense: ['trans_date', 'category', 'amount'],
    loans: ['trans_date', 'category', 'amount']
  };

  const fieldLabels = {
    trans_date: 'Tanggal',
    category: 'Kategori',
    description: 'Deskripsi',
    amount: 'Jumlah/Amount'
  };

  const colorScheme = {
    income: { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    expense: { bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    loans: { bg: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' }
  };

  const colors = colorScheme[type] || colorScheme.income;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

        if (jsonData.length < 2) {
          setError('File Excel harus memiliki minimal 1 baris header dan 1 baris data');
          return;
        }

        // First row is headers
        const rawHeaders = jsonData[0].map((h, i) => String(h || `Column ${i + 1}`).trim());
        setHeaders(rawHeaders);

        // Auto-detect column mapping
        const autoMapping = {};
        rawHeaders.forEach((header, index) => {
          const h = header.toLowerCase();
          if (h.includes('tanggal') || h.includes('date') || h.includes('tgl')) {
            autoMapping.trans_date = index;
          } else if (h.includes('kategori') || h.includes('category') || h.includes('jenis')) {
            autoMapping.category = index;
          } else if (h.includes('deskripsi') || h.includes('description') || h.includes('keterangan') || h.includes('notes')) {
            autoMapping.description = index;
          } else if (h.includes('jumlah') || h.includes('amount') || h.includes('nominal') || h.includes('total') || h.includes('harga')) {
            autoMapping.amount = index;
          }
        });
        setColumnMapping(autoMapping);

        // Data rows (skip header)
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        setPreview(rows);
        setStep('mapping');
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setError('Gagal membaca file Excel. Pastikan format file benar.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (field, columnIndex) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnIndex === '' ? undefined : parseInt(columnIndex)
    }));
  };

  const validateMapping = () => {
    const missing = requiredFields[type].filter(field => columnMapping[field] === undefined);
    if (missing.length > 0) {
      setError(`Kolom wajib belum dipilih: ${missing.map(f => fieldLabels[f]).join(', ')}`);
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateMapping()) return;
    setError('');
    setStep('preview');
  };

  const getMappedData = () => {
    return preview.map((row, idx) => {
      const trans_date = parseExcelDate(row[columnMapping.trans_date]);
      const category = String(row[columnMapping.category] || '').trim() || 'Lainnya';
      const description = columnMapping.description !== undefined 
        ? String(row[columnMapping.description] || '').trim() 
        : '';
      const amount = parseAmount(row[columnMapping.amount]);

      return {
        _rowNum: idx + 2, // Excel row number (1-indexed + header)
        trans_date,
        category,
        description,
        amount,
        _valid: !!trans_date && amount > 0
      };
    });
  };

  const handleImport = () => {
    const mappedData = getMappedData();
    const validData = mappedData.filter(d => d._valid).map(({ _rowNum, _valid, ...rest }) => rest);
    
    if (validData.length === 0) {
      setError('Tidak ada data valid untuk diimport. Pastikan tanggal dan jumlah terisi dengan benar.');
      return;
    }

    onImport(validData);
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError('');
    setStep('upload');
    setColumnMapping({});
    setHeaders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  const mappedData = step === 'preview' ? getMappedData() : [];
  const validCount = mappedData.filter(d => d._valid).length;
  const invalidCount = mappedData.filter(d => !d._valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={handleClose}>
      <div 
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${colors.bg} px-6 py-4 rounded-t-2xl flex items-center justify-between`}>
          <div>
            <h2 className="text-xl font-bold text-white">Import dari Excel</h2>
            <p className="text-white/80 text-sm">
              {type === 'income' ? 'Import Data Income' : type === 'expense' ? 'Import Data Expense' : 'Import Data Loans'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/20 transition"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="text-center py-8">
              <div className={`w-20 h-20 mx-auto rounded-full ${colors.light} flex items-center justify-center mb-4`}>
                <svg className={`w-10 h-10 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload File Excel</h3>
              <p className="text-slate-500 text-sm mb-6">
                Pilih file .xlsx atau .xls yang berisi data {type}
              </p>
              
              <label className={`inline-flex items-center gap-2 px-6 py-3 ${colors.bg} text-white rounded-xl font-semibold cursor-pointer hover:opacity-90 transition`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Pilih File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="mt-8 p-4 rounded-xl bg-slate-50 text-left max-w-md mx-auto">
                <p className="font-semibold text-slate-700 mb-2">Format yang didukung:</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Baris pertama harus berisi header kolom</li>
                  <li>• Kolom wajib: <strong>Tanggal, Kategori, Jumlah</strong></li>
                  <li>• Kolom opsional: Deskripsi/Keterangan</li>
                  <li>• Format tanggal: DD/MM/YYYY atau YYYY-MM-DD</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Mapping Kolom</h3>
                <p className="text-slate-500 text-sm">
                  Pilih kolom dari file Excel yang sesuai dengan field yang dibutuhkan
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                {Object.entries(fieldLabels).map(([field, label]) => (
                  <div key={field} className="p-4 rounded-xl bg-slate-50">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {label}
                      {requiredFields[type].includes(field) && (
                        <span className="text-rose-500 ml-1">*</span>
                      )}
                    </label>
                    <select
                      value={columnMapping[field] ?? ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className={`w-full rounded-lg border ${colors.border} bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-${colors.text.replace('text-', '')}/20`}
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {headers.map((header, idx) => (
                        <option key={idx} value={idx}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-100 mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Preview Header dari File:</p>
                <div className="flex flex-wrap gap-2">
                  {headers.map((h, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white text-xs font-medium text-slate-600 border">
                      {i + 1}. {h}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Ditemukan <strong>{preview.length}</strong> baris data
              </p>
            </div>
          )}

          {/* Step 3: Preview Data */}
          {step === 'preview' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Preview Data Import</h3>
                  <p className="text-slate-500 text-sm">
                    Review data sebelum import
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    ✓ Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-medium">
                      ✗ Invalid: {invalidCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Row</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Tanggal</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Kategori</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Deskripsi</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {mappedData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className={row._valid ? '' : 'bg-rose-50'}>
                        <td className="px-4 py-2 text-slate-500">{row._rowNum}</td>
                        <td className="px-4 py-2 text-slate-700">{row.trans_date || <span className="text-rose-500">Invalid</span>}</td>
                        <td className="px-4 py-2 font-medium text-slate-900">{row.category}</td>
                        <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate">{row.description || '-'}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {row.amount > 0 ? formatCurrency(row.amount) : <span className="text-rose-500">Invalid</span>}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row._valid ? (
                            <span className="text-emerald-600">✓</span>
                          ) : (
                            <span className="text-rose-600">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedData.length > 50 && (
                <p className="mt-2 text-sm text-slate-500 text-center">
                  Menampilkan 50 dari {mappedData.length} baris
                </p>
              )}

              {invalidCount > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <span className="font-semibold">Catatan:</span> {invalidCount} baris dengan data tidak valid akan dilewati saat import.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <div>
            {file && (
              <span className="text-sm text-slate-500">
                📄 {file.name}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'mapping' && (
              <>
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={handlePreview}
                  className={`px-6 py-2 rounded-xl ${colors.bg} text-white font-semibold hover:opacity-90 transition`}
                >
                  Preview Data
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || validCount === 0}
                  className={`px-6 py-2 rounded-xl ${colors.bg} text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>Import {validCount} Data</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


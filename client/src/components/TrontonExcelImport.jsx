import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

const formatCurrency = value => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value ?? '-';
  return numeric.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
};

// Parse Excel date (Excel stores dates as numbers)
const parseExcelDate = (value) => {
  if (!value) return null;
  
  // If it's already a valid date string
  if (typeof value === 'string') {
    // Try DD/MM/YYYY format first (common in Indonesia)
    const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Try other formats
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }
  
  // If it's an Excel serial date number
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }
  
  return null;
};

// Parse amount (handle various formats like "Rp 1.100.000")
const parseAmount = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove "Rp", spaces, dots (thousands separator)
    const cleaned = value.replace(/[Rp\s.]/gi, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// Sheet to truck type mapping
const SHEET_TRUCK_MAP = {
  'TRONTON': { key: 'tronton', label: 'Tronton' },
  'COLTDIESEL': { key: 'colt', label: 'Colt Diesel' },
  'COLT DIESEL': { key: 'colt', label: 'Colt Diesel' },
  'EXPANDING': { key: 'expanding', label: 'Expanding' }
};

// Column detection patterns
const COLUMN_PATTERNS = {
  no: ['no', 'nomor', 'number', '#'],
  date: ['date', 'tanggal', 'tgl'],
  day: ['day', 'hari'],
  productName: ['product', 'produk', 'product name', 'nama produk', 'barang'],
  qty: ['qty', 'quantity', 'jumlah', 'rit'],
  price: ['price', 'harga', 'unit price'],
  total: ['total', 'gross', 'subtotal'],
  loading: ['loading', 'load', 'biaya loading'],
  market: ['market', 'pasar', 'biaya market'],
  do: ['do', 'd.o', 'delivery order'],
  totalBayar: ['total bayar', 'net', 'netto', 'bayar', 'dibayar', 'net payment']
};

export default function TrontonExcelImport({ 
  isOpen, 
  onClose, 
  onImport, 
  isLoading = false 
}) {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload', 'sheets', 'preview'
  const [parsingStatus, setParsingStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);
    setParsingStatus('Membaca file Excel...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        
        setWorkbook(wb);
        
        // Get relevant sheets (TRONTON, COLTDIESEL, EXPANDING)
        const relevantSheets = wb.SheetNames.filter(name => {
          const upperName = name.toUpperCase().replace(/\s+/g, '');
          return Object.keys(SHEET_TRUCK_MAP).some(key => 
            upperName.includes(key.replace(/\s+/g, ''))
          );
        });

        if (relevantSheets.length === 0) {
          setError('Tidak ditemukan sheet TRONTON, COLTDIESEL, atau EXPANDING dalam file Excel');
          setParsingStatus('');
          return;
        }

        setSheets(relevantSheets);
        setSelectedSheets(relevantSheets); // Select all by default
        setStep('sheets');
        setParsingStatus('');
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setError('Gagal membaca file Excel. Pastikan format file benar.');
        setParsingStatus('');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const toggleSheet = (sheetName) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName) 
        ? prev.filter(s => s !== sheetName)
        : [...prev, sheetName]
    );
  };

  const detectColumnIndex = (headers, patterns) => {
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase().trim();
      if (patterns.some(pattern => header.includes(pattern.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  };

  const parseSheet = (sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
    
    // Find the header row (row with NO, DATE, etc.)
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
      
      // Check if this row contains column headers
      if ((rowStr.includes('date') || rowStr.includes('tanggal')) && 
          (rowStr.includes('qty') || rowStr.includes('jumlah') || rowStr.includes('rit'))) {
        headerRowIndex = i;
        headers = row.map((h, idx) => String(h || `Col${idx}`).trim());
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      return { error: `Tidak dapat menemukan header kolom di sheet ${sheetName}` };
    }

    // Detect column indices
    const columnMap = {
      no: detectColumnIndex(headers, COLUMN_PATTERNS.no),
      date: detectColumnIndex(headers, COLUMN_PATTERNS.date),
      day: detectColumnIndex(headers, COLUMN_PATTERNS.day),
      productName: detectColumnIndex(headers, COLUMN_PATTERNS.productName),
      qty: detectColumnIndex(headers, COLUMN_PATTERNS.qty),
      price: detectColumnIndex(headers, COLUMN_PATTERNS.price),
      total: detectColumnIndex(headers, COLUMN_PATTERNS.total),
      loading: detectColumnIndex(headers, COLUMN_PATTERNS.loading),
      market: detectColumnIndex(headers, COLUMN_PATTERNS.market),
      do: detectColumnIndex(headers, COLUMN_PATTERNS.do),
      totalBayar: detectColumnIndex(headers, COLUMN_PATTERNS.totalBayar)
    };

    // Determine truck type from sheet name
    const upperSheetName = sheetName.toUpperCase().replace(/\s+/g, '');
    let truckInfo = { key: 'tronton', label: 'Tronton' };
    for (const [key, info] of Object.entries(SHEET_TRUCK_MAP)) {
      if (upperSheetName.includes(key.replace(/\s+/g, ''))) {
        truckInfo = info;
        break;
      }
    }

    // Parse data rows
    const dataRows = [];
    let lastValidDate = null;
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      // Skip empty rows or summary rows
      const rowContent = row.join('').trim();
      if (!rowContent || rowContent.toLowerCase().includes('summary') || rowContent.toLowerCase().includes('total')) {
        continue;
      }

      // Get values
      const dateValue = columnMap.date >= 0 ? row[columnMap.date] : null;
      const parsedDate = parseExcelDate(dateValue);
      
      // Use last valid date if current date is empty (for multiple entries per day)
      const effectiveDate = parsedDate || lastValidDate;
      if (parsedDate) lastValidDate = parsedDate;
      
      const qty = columnMap.qty >= 0 ? parseInt(row[columnMap.qty]) || 0 : 0;
      const productName = columnMap.productName >= 0 ? String(row[columnMap.productName] || '').trim() : '';
      
      // Skip if no quantity or product
      if (qty === 0 || !productName) continue;
      
      const price = columnMap.price >= 0 ? parseAmount(row[columnMap.price]) : 0;
      const total = columnMap.total >= 0 ? parseAmount(row[columnMap.total]) : qty * price;
      const loading = columnMap.loading >= 0 ? parseAmount(row[columnMap.loading]) : 0;
      const market = columnMap.market >= 0 ? parseAmount(row[columnMap.market]) : 0;
      const doFee = columnMap.do >= 0 ? parseAmount(row[columnMap.do]) : 0;
      const totalBayar = columnMap.totalBayar >= 0 ? parseAmount(row[columnMap.totalBayar]) : 0;
      
      // Calculate per-load deductions
      const loadingPerLoad = qty > 0 ? Math.round(loading / qty) : 0;
      const marketPerLoad = qty > 0 ? Math.round(market / qty) : 0;
      const doPerLoad = qty > 0 ? Math.round(doFee / qty) : 0;

      dataRows.push({
        _rowNum: i + 1,
        _sheetName: sheetName,
        _truckKey: truckInfo.key,
        _truckLabel: truckInfo.label,
        trans_date: effectiveDate,
        day: columnMap.day >= 0 ? String(row[columnMap.day] || '').trim() : '',
        productName,
        quantity: qty,
        unitPrice: price,
        gross: total,
        loading,
        market,
        doFee,
        totalBayar: totalBayar || (total - loading - market - doFee),
        // Per-load deductions for the income description
        loadingPerLoad,
        marketPerLoad,
        doPerLoad,
        _valid: !!effectiveDate && qty > 0 && productName
      });
    }

    return { data: dataRows, truckInfo };
  };

  const handleParseSheets = () => {
    if (selectedSheets.length === 0) {
      setError('Pilih minimal satu sheet untuk diimport');
      return;
    }

    setParsingStatus('Menganalisis data...');
    setError('');

    try {
      let allData = [];
      const errors = [];

      for (const sheetName of selectedSheets) {
        const result = parseSheet(sheetName);
        if (result.error) {
          errors.push(result.error);
        } else if (result.data && result.data.length > 0) {
          allData = [...allData, ...result.data];
        }
      }

      if (errors.length > 0 && allData.length === 0) {
        setError(errors.join('. '));
        setParsingStatus('');
        return;
      }

      if (allData.length === 0) {
        setError('Tidak ada data valid yang ditemukan');
        setParsingStatus('');
        return;
      }

      // Sort by date
      allData.sort((a, b) => {
        if (!a.trans_date) return 1;
        if (!b.trans_date) return -1;
        return new Date(b.trans_date) - new Date(a.trans_date);
      });

      setPreview(allData);
      setStep('preview');
      setParsingStatus('');
    } catch (err) {
      console.error('Error parsing sheets:', err);
      setError('Gagal memproses data: ' + err.message);
      setParsingStatus('');
    }
  };

  const handleImport = () => {
    const validData = preview.filter(d => d._valid);
    
    if (validData.length === 0) {
      setError('Tidak ada data valid untuk diimport');
      return;
    }

    // Transform to income format
    const incomeData = validData.map(row => {
      const category = `${row.productName} - ${row._truckLabel}`;
      const deductions = {};
      
      if (row.loadingPerLoad > 0) deductions.loading = row.loadingPerLoad;
      if (row.marketPerLoad > 0) deductions.market = row.marketPerLoad;
      if (row.doPerLoad > 0) deductions.broker = row.doPerLoad; // DO maps to broker
      
      const description = JSON.stringify({
        __type: 'income-v1',
        productKey: row.productName.toLowerCase().includes('ayak') ? 'pasirAyak' : 
                   row.productName.toLowerCase().includes('lempung') ? 'pasirLempung' : 'other',
        productLabel: row.productName,
        truckKey: row._truckKey,
        truckLabel: row._truckLabel,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        perLoadDeductions: deductions,
        gross: row.gross,
        perLoadDeductionTotal: row.loadingPerLoad + row.marketPerLoad + row.doPerLoad,
        deductionTotal: row.loading + row.market + row.doFee,
        net: row.totalBayar,
        notes: `Imported from ${row._sheetName} - Row ${row._rowNum}`,
        importedFrom: 'excel-template'
      });

      return {
        trans_date: row.trans_date,
        category,
        description,
        amount: row.totalBayar
      };
    });

    onImport(incomeData);
  };

  const handleClose = () => {
    setFile(null);
    setWorkbook(null);
    setSheets([]);
    setSelectedSheets([]);
    setPreview([]);
    setError('');
    setStep('upload');
    setParsingStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  const validCount = preview.filter(d => d._valid).length;
  const invalidCount = preview.filter(d => !d._valid).length;
  const totalAmount = preview.filter(d => d._valid).reduce((sum, d) => sum + d.totalBayar, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={handleClose}>
      <div 
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Import Template PT Dzikry Multi Laba</h2>
            <p className="text-white/80 text-sm">
              Import data dari Excel template TRONTON, COLTDIESEL, EXPANDING
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

          {/* Parsing Status */}
          {parsingStatus && (
            <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center gap-3">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {parsingStatus}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload File Excel Template</h3>
              <p className="text-slate-500 text-sm mb-6">
                Pilih file Excel dengan format template PT Dzikry Multi Laba
              </p>
              
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold cursor-pointer hover:opacity-90 transition shadow-lg shadow-teal-600/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Pilih File Excel
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="mt-8 p-5 rounded-xl bg-slate-50 text-left max-w-lg mx-auto">
                <p className="font-semibold text-slate-700 mb-3">Format Template yang Didukung:</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Sheet: TRONTON, COLTDIESEL, EXPANDING</p>
                      <p className="text-xs text-slate-500">Sistem akan otomatis mendeteksi sheet yang sesuai</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Kolom: DATE, QTY, PRICE, TOTAL, LOADING, MARKET, DO, TOTAL BAYAR</p>
                      <p className="text-xs text-slate-500">Header kolom akan dideteksi otomatis</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-teal-600 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Format Tanggal: DD/MM/YYYY</p>
                      <p className="text-xs text-slate-500">Contoh: 19/11/2025</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Sheets */}
          {step === 'sheets' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Pilih Sheet untuk Diimport</h3>
                <p className="text-slate-500 text-sm">
                  Ditemukan {sheets.length} sheet yang sesuai dengan template
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                {sheets.map(sheetName => {
                  const isSelected = selectedSheets.includes(sheetName);
                  const upperName = sheetName.toUpperCase();
                  let icon = '🚛';
                  let color = 'teal';
                  
                  if (upperName.includes('TRONTON')) {
                    icon = '🚚';
                    color = 'emerald';
                  } else if (upperName.includes('COLT')) {
                    icon = '🛻';
                    color = 'blue';
                  } else if (upperName.includes('EXPAND')) {
                    icon = '🚛';
                    color = 'amber';
                  }

                  return (
                    <button
                      key={sheetName}
                      onClick={() => toggleSheet(sheetName)}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        isSelected 
                          ? `border-${color}-500 bg-${color}-50` 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{sheetName}</p>
                          <p className="text-xs text-slate-500">
                            {upperName.includes('TRONTON') && 'Truck Tronton'}
                            {upperName.includes('COLT') && 'Colt Diesel'}
                            {upperName.includes('EXPAND') && 'Expanding'}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? `border-${color}-500 bg-${color}-500` 
                            : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-slate-100 text-sm text-slate-600">
                <span className="font-semibold">{selectedSheets.length}</span> sheet dipilih untuk diimport
              </div>
            </div>
          )}

          {/* Step 3: Preview Data */}
          {step === 'preview' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Preview Data Import</h3>
                  <p className="text-slate-500 text-sm">
                    Review data sebelum import ke sistem
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    ✓ Valid: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-medium">
                      ✗ Invalid: {invalidCount}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    Total: {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-3 sm:grid-cols-3 mb-4">
                {selectedSheets.map(sheetName => {
                  const sheetData = preview.filter(d => d._sheetName === sheetName && d._valid);
                  const sheetTotal = sheetData.reduce((sum, d) => sum + d.totalBayar, 0);
                  const sheetQty = sheetData.reduce((sum, d) => sum + d.quantity, 0);
                  
                  return (
                    <div key={sheetName} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{sheetName}</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(sheetTotal)}</p>
                      <p className="text-xs text-slate-500">{sheetData.length} entries • {sheetQty} rit</p>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs">Sheet</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs">Tanggal</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-600 text-xs">Product</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs">Qty</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs hidden md:table-cell">Gross</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs hidden lg:table-cell">Loading</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs hidden lg:table-cell">Market</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs hidden lg:table-cell">DO</th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 text-xs">Net</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600 text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preview.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className={row._valid ? '' : 'bg-rose-50'}>
                        <td className="px-3 py-2 text-slate-500 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100">{row._sheetName}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.trans_date || <span className="text-rose-500">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">{row.productName}</p>
                          <p className="text-xs text-slate-500">{row._truckLabel}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">{row.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600 hidden md:table-cell">{formatCurrency(row.gross)}</td>
                        <td className="px-3 py-2 text-right text-rose-600 hidden lg:table-cell">{formatCurrency(row.loading)}</td>
                        <td className="px-3 py-2 text-right text-rose-600 hidden lg:table-cell">{formatCurrency(row.market)}</td>
                        <td className="px-3 py-2 text-right text-rose-600 hidden lg:table-cell">{formatCurrency(row.doFee)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600">{formatCurrency(row.totalBayar)}</td>
                        <td className="px-3 py-2 text-center">
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
              
              {preview.length > 100 && (
                <p className="mt-2 text-sm text-slate-500 text-center">
                  Menampilkan 100 dari {preview.length} baris
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
              <span className="text-sm text-slate-500 flex items-center gap-2">
                📄 {file.name}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'sheets' && (
              <>
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={handleParseSheets}
                  disabled={selectedSheets.length === 0}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analisis Data
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('sheets')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || validCount === 0}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    <>Import {validCount} Data ({formatCurrency(totalAmount)})</>
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


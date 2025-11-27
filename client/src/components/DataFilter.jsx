import { useState, useMemo } from 'react';

export default function DataFilter({ 
  items = [], 
  onFilteredItems, 
  categories = [],
  colorScheme = 'emerald' // 'emerald', 'rose', 'amber'
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      focus: 'focus:border-emerald-500 focus:ring-emerald-100',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700'
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      focus: 'focus:border-rose-500 focus:ring-rose-100',
      button: 'bg-rose-600 hover:bg-rose-700',
      badge: 'bg-rose-100 text-rose-700'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      focus: 'focus:border-amber-500 focus:ring-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700',
      badge: 'bg-amber-100 text-amber-700'
    }
  };

  const colors = colorClasses[colorScheme] || colorClasses.emerald;

  // Extract unique categories from items
  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(items.map(item => item.category))].filter(Boolean);
    return cats.sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item => 
        item.category?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter(item => item.category === filters.category);
    }

    // Date from filter
    if (filters.dateFrom) {
      result = result.filter(item => {
        const itemDate = new Date(item.trans_date);
        const fromDate = new Date(filters.dateFrom);
        return itemDate >= fromDate;
      });
    }

    // Date to filter
    if (filters.dateTo) {
      result = result.filter(item => {
        const itemDate = new Date(item.trans_date);
        const toDate = new Date(filters.dateTo);
        return itemDate <= toDate;
      });
    }

    return result;
  }, [items, filters]);

  // Notify parent of filtered items
  useMemo(() => {
    onFilteredItems(filteredItems);
  }, [filteredItems, onFilteredItems]);

  const activeFilterCount = [
    filters.search,
    filters.category,
    filters.dateFrom,
    filters.dateTo
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  return (
    <div className="mb-4">
      {/* Filter Toggle Button */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${colors.bg} ${colors.text} font-medium transition text-sm border ${colors.border} hover:opacity-80`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}

        {/* Quick Stats */}
        <div className="ml-auto text-sm text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{filteredItems.length}</span> dari <span className="font-semibold text-slate-700">{items.length}</span> data
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4" style={{ animation: 'slideDown 0.2s ease-out' }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Cari
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari kategori, deskripsi..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm ${colors.focus} focus:outline-none focus:ring-2`}
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Kategori
              </label>
              <select
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm ${colors.focus} focus:outline-none focus:ring-2`}
                value={filters.category}
                onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Semua Kategori</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm ${colors.focus} focus:outline-none focus:ring-2`}
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm ${colors.focus} focus:outline-none focus:ring-2`}
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          {/* Active Filters Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500">Filter aktif:</span>
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 text-xs text-slate-700">
                  Cari: "{filters.search}"
                  <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="hover:text-slate-900">×</button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 text-xs text-slate-700">
                  Kategori: {filters.category}
                  <button onClick={() => setFilters(prev => ({ ...prev, category: '' }))} className="hover:text-slate-900">×</button>
                </span>
              )}
              {filters.dateFrom && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 text-xs text-slate-700">
                  Dari: {filters.dateFrom}
                  <button onClick={() => setFilters(prev => ({ ...prev, dateFrom: '' }))} className="hover:text-slate-900">×</button>
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 text-xs text-slate-700">
                  Sampai: {filters.dateTo}
                  <button onClick={() => setFilters(prev => ({ ...prev, dateTo: '' }))} className="hover:text-slate-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


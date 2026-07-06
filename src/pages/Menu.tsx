import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Category, Product, FlashDeal } from '../types';
import { STATIC_CATEGORIES, STATIC_PRODUCTS } from '../lib/staticData';
import ProductCard from '../components/ProductCard';
import { GridSkeleton, EmptyState } from '../components/Loader';
import { Search, X, SlidersHorizontal, ChevronDown, Zap, Clock } from 'lucide-react';
import { money } from '../lib/settings';

interface HappyHourStatus { active: boolean; discount_percent?: number; discount_flat?: number; end_time?: string }

export default function Menu() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [showVeg, setShowVeg] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [showSort, setShowSort] = useState(false);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [happyHour, setHappyHour] = useState<HappyHourStatus | null>(null);
  const [tab, setTab] = useState<'all' | 'flash'>('all');

  const categoryId = params.get('category') ? Number(params.get('category')) : null;

  useEffect(() => {
    api.get('/categories.php').then(({ data }) => { if (data.categories?.length) setCategories(data.categories); }).catch(() => {});
    api.get('/flash-deals.php?active=1&per_page=20').then(r => setFlashDeals(r.data.deals ?? r.data.data ?? [])).catch(() => {});
    api.get('/happy-hour.php?current=1').then(r => { if (r.data.active) setHappyHour(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (categoryId) qs.set('category_id', String(categoryId));
    if (search.trim()) qs.set('search', search.trim());
    qs.set('per_page', '80');

    api.get(`/products.php?${qs.toString()}`)
      .then(({ data }) => { if (data.data?.length) setProducts(data.data); })
      .catch(() => {
        let filtered = STATIC_PRODUCTS;
        if (categoryId) filtered = filtered.filter(p => p.category_id === categoryId);
        if (search.trim()) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()));
        setProducts(filtered);
      })
      .finally(() => setLoading(false));
  }, [categoryId, search]);

  // Build a flash deal map: product_id → deal
  const flashMap = useMemo(() => {
    const map: Record<number, FlashDeal> = {};
    flashDeals.forEach(fd => { map[fd.product_id] = fd; });
    return map;
  }, [flashDeals]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (tab === 'flash') list = list.filter(p => !!flashMap[p.id]);
    if (showVeg) list = list.filter(p => p.is_veg === 1);
    if (sortBy === 'rating') list.sort((a, b) => Number(b.avg_rating ?? b.rating) - Number(a.avg_rating ?? a.rating));
    else if (sortBy === 'price_asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }, [products, showVeg, sortBy, tab, flashMap]);

  const activeCat = categories.find(c => c.id === categoryId);

  return (
    <div className="fade-in">
      {/* ── HAPPY HOUR BANNER ─────────────────────────────── */}
      {happyHour?.active && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Clock size={18} className="shrink-0" />
              <p className="text-sm font-semibold">
                Happy Hour is On!{' '}
                {happyHour.discount_percent ? `${happyHour.discount_percent}% off` : happyHour.discount_flat ? `₹${happyHour.discount_flat} off` : ''}
                {happyHour.end_time ? ` until ${happyHour.end_time}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY HEADER ─────────────────────────────────────────── */}
      <div className="border-b border-neutral-100 bg-white px-4 pt-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-extrabold text-neutral-900 sm:text-2xl">
            {activeCat ? activeCat.name : 'Our Menu'}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {activeCat?.description || 'Freshly prepared authentic North Indian cuisine'}
          </p>

          {/* Category pills */}
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-3">
            <button
              onClick={() => { const p = new URLSearchParams(params); p.delete('category'); setParams(p); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${!categoryId ? 'border-brand-500 bg-brand-500 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-300'}`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => { const p = new URLSearchParams(params); p.set('category', String(c.id)); setParams(p); }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${categoryId === c.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {/* ── FILTER BAR ──────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Tab: All / Flash Deals */}
          <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white text-xs font-semibold">
            <button onClick={() => setTab('all')} className={`px-4 py-2 transition-colors ${tab === 'all' ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>All</button>
            {flashDeals.length > 0 && (
              <button onClick={() => setTab('flash')} className={`flex items-center gap-1 px-4 py-2 transition-colors ${tab === 'flash' ? 'bg-rose-500 text-white' : 'text-rose-600 hover:bg-rose-50'}`}>
                <Zap size={12} /> Flash Deals
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Search dishes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Veg toggle */}
          <button
            onClick={() => setShowVeg(v => !v)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${showVeg ? 'border-green-600 bg-green-600 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-green-400'}`}
          >
            <div className={`grid h-4 w-4 place-items-center rounded-sm border-2 ${showVeg ? 'border-white' : 'border-green-600'}`}>
              <div className={`h-2 w-2 rounded-full bg-green-600 ${showVeg ? 'bg-white' : ''}`} />
            </div>
            Pure Veg
          </button>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:border-brand-300"
            >
              <SlidersHorizontal size={14} />
              {sortBy === 'default' ? 'Sort' : sortBy === 'rating' ? 'Top Rated' : sortBy === 'price_asc' ? 'Price ↑' : 'Price ↓'}
              <ChevronDown size={14} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-xl">
                {[
                  { v: 'default', l: 'Relevance' },
                  { v: 'rating', l: 'Top Rated' },
                  { v: 'price_asc', l: 'Price: Low to High' },
                  { v: 'price_desc', l: 'Price: High to Low' },
                ].map(({ v, l }) => (
                  <button key={v} onClick={() => { setSortBy(v); setShowSort(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-neutral-50 ${sortBy === v ? 'font-semibold text-brand-600' : 'text-neutral-700'}`}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── GRID ────────────────────────────────────────────────────── */}
        {loading ? (
          <GridSkeleton count={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={40} />} title="No dishes found" subtitle="Try a different category or search term." />
        ) : (
          <>
            <p className="mb-3 text-sm text-neutral-500">{filtered.length} dish{filtered.length !== 1 ? 'es' : ''} found</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map(p => {
                const fd = flashMap[p.id];
                return (
                  <div key={p.id} className="relative">
                    {fd && (
                      <div className="absolute -top-1.5 -right-1.5 z-10 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        <Zap size={9} /> {money(fd.deal_price)}
                      </div>
                    )}
                    <ProductCard product={fd ? { ...p, discount_price: fd.deal_price } : p} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showSort && <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />}
    </div>
  );
}

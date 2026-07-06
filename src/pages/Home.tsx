import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Banner, Category, Product, Coupon, Settings, FlashDeal } from '../types';
import { STATIC_BANNERS, STATIC_CATEGORIES, STATIC_PRODUCTS } from '../lib/staticData';
import ProductCard from '../components/ProductCard';
import { ChevronRight, ChevronLeft, Clock, Shield, Star, Zap, Search, MapPin, Sparkles, Copy, Check } from 'lucide-react';
import { fetchSettings, getRestaurantStatus, money } from '../lib/settings';

interface HappyHourStatus { active: boolean; discount_percent?: number; discount_flat?: number; end_time?: string }
interface Testimonial { id: number; author_name: string; rating: number; review_text: string; designation?: string }
interface Statistic { key: string; value: string; label: string }

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>(STATIC_BANNERS);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [featured, setFeatured] = useState<Product[]>(STATIC_PRODUCTS.filter(p => p.is_featured));
  const [bestsellers, setBestsellers] = useState<Product[]>(STATIC_PRODUCTS.filter(p => p.is_best_seller));
  const [promos, setPromos] = useState<Coupon[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [happyHour, setHappyHour] = useState<HappyHourStatus | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [statistics, setStatistics] = useState<Statistic[]>([]);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<Settings>({});
  const { customer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/banners.php').then(r => { if (r.data.banners?.length) setBanners(r.data.banners); }).catch(() => {});
    api.get('/categories.php').then(r => { if (r.data.categories?.length) setCategories(r.data.categories); }).catch(() => {});
    api.get('/products.php?is_featured=1&per_page=8').then(r => { if (r.data.data?.length) setFeatured(r.data.data); }).catch(() => {});
    api.get('/products.php?is_best_seller=1&per_page=8').then(r => { if (r.data.data?.length) setBestsellers(r.data.data); }).catch(() => {});
    fetchSettings(true).then(setSettings).catch(() => undefined);
    // V3 data
    api.get('/flash-deals.php?active=1&per_page=6').then(r => setFlashDeals(r.data.deals ?? r.data.data ?? [])).catch(() => {});
    api.get('/happy-hour.php?current=1').then(r => {
      if (r.data.active) setHappyHour(r.data);
    }).catch(() => {});
    api.get('/settings.php?resource=testimonials').then(r => setTestimonials(r.data.testimonials ?? [])).catch(() => {});
    api.get('/settings.php?resource=statistics').then(r => setStatistics(r.data.statistics ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/delivery.php?resource=coupons&public=1', {
      params: {
        customer_id: customer?.id ?? 0,
        customer_email: customer?.email ?? '',
        customer_phone: customer?.phone ?? '',
      },
    }).then(r => { setPromos(r.data.coupons ?? []); }).catch(() => {});
  }, [customer?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/menu?search=${encodeURIComponent(search.trim())}`);
  };

  const restaurantStatus = getRestaurantStatus(settings);

  return (
    <div className="fade-in">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1c] via-[#2d1a0e] to-[#1c1c1c] text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=1400')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24 text-center">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm ${restaurantStatus.isOpen ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>
            <span className={`h-2 w-2 rounded-full ${restaurantStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {restaurantStatus.label} · Delivering in Muzaffarnagar
          </div>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Authentic Flavours of
            <span className="block text-brand-400">Zaika Lounge</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/75 sm:text-lg">
            Mughlai · Biryani · Kebabs · Curries — Delivered hot to your doorstep
          </p>

          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl items-center gap-0 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30">
            <div className="flex flex-1 items-center gap-2 px-4 py-1">
              <MapPin size={18} className="shrink-0 text-neutral-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search biryani, butter chicken, kebabs..."
                className="flex-1 bg-transparent py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
            <button type="submit" className="flex items-center gap-2 bg-brand-500 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
              <Search size={16} /> Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Biryani', 'Butter Chicken', 'Seekh Kebab', 'Paneer', 'Desserts'].map(tag => (
              <button key={tag} onClick={() => navigate(`/menu?search=${encodeURIComponent(tag)}`)}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20">
                {tag}
              </button>
            ))}
          </div>

          {promos.length > 0 && (
            <div className="mx-auto mt-5 flex max-w-fit flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">Limited time deal</span>
              {promos.slice(0, 3).map((promo) => (
                <PromoPill key={promo.id} promo={promo} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HAPPY HOUR BANNER ─────────────────────────────────────────── */}
      {happyHour?.active && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><Clock size={18} /></div>
              <div>
                <p className="font-bold">Happy Hour is On!</p>
                <p className="text-xs text-white/85">
                  {happyHour.discount_percent ? `${happyHour.discount_percent}% off ` : happyHour.discount_flat ? `₹${happyHour.discount_flat} off ` : ''}
                  on all orders
                  {happyHour.end_time ? ` until ${happyHour.end_time}` : ''}
                </p>
              </div>
            </div>
            <Link to="/menu" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition-colors whitespace-nowrap">
              Order Now
            </Link>
          </div>
        </div>
      )}

      {/* ── TRUST BADGES / STATS ─────────────────────────────────────── */}
      <section className="border-b border-neutral-100 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-neutral-100 sm:grid-cols-4">
          {(statistics.length > 0
            ? statistics.map(s => ({ Icon: Zap, title: s.value, subtitle: s.label }))
            : [
                { Icon: Zap, title: '30 min delivery', subtitle: 'Average order time' },
                { Icon: Shield, title: '100% hygienic', subtitle: 'FSSAI certified kitchen' },
                { Icon: Star, title: '4.8 ★ rated', subtitle: '500+ happy customers' },
                { Icon: Clock, title: 'Open 11am–11pm', subtitle: 'All days including holidays' },
              ]
          ).map(({ Icon, title, subtitle }, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{title}</p>
                <p className="text-xs text-neutral-500">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BANNER CAROUSEL ─────────────────────────────────────────── */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <BannerCarousel banners={banners} />
      </section>

      {/* ── FLASH DEALS ──────────────────────────────────────────────── */}
      {flashDeals.length > 0 && (
        <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Zap size={20} /></div>
              <div>
                <h2 className="text-xl font-extrabold">Flash Deals</h2>
                <p className="text-sm text-white/80">Limited stock · Ends soon</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {flashDeals.map(deal => (
                <FlashDealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORIES ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <SectionHeader title="What's on your mind?" linkTo="/menu" linkText="See all" />
        <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Link key={cat.id} to={`/menu?category=${cat.id}`}
              className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center sm:w-28">
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-transparent transition-all group-hover:ring-brand-200 sm:h-24 sm:w-24">
                <img
                  src={cat.image_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=200'}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <span className="text-xs font-semibold text-neutral-700 group-hover:text-brand-600">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BESTSELLERS ─────────────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <SectionHeader title="Bestsellers" linkTo="/menu" linkText="View all" />
          <HorizontalScroll>
            {bestsellers.map(p => (
              <div key={p.id} className="w-64 shrink-0 sm:w-72">
                <ProductCard product={p} />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* ── FEATURED ──────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <SectionHeader title="Chef's Specials" linkTo="/menu" linkText="Full menu" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="mx-auto mt-12 max-w-7xl px-4 pb-4 sm:px-6">
          <SectionHeader title="What our customers say" linkTo="/menu" linkText="Order now" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map(t => (
              <div key={t.id} className="card p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < t.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-neutral-700 italic">"{t.review_text}"</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                    {t.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.author_name}</p>
                    {t.designation && <p className="text-xs text-neutral-400">{t.designation}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section className="mx-4 my-8 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-amber-600 sm:mx-6 lg:mx-auto lg:max-w-7xl">
        <div className="flex flex-col items-center gap-6 p-8 text-white sm:flex-row sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Experience Zaika Lounge</h2>
            <p className="mt-1 text-white/80">334, Delhi Haridwar Road, Muzaffarnagar · 11am–11pm</p>
          </div>
          <Link to="/menu" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-600 shadow-lg transition hover:bg-neutral-50">
            Order Now <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function SectionHeader({ title, linkTo, linkText }: { title: string; linkTo: string; linkText: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{title}</h2>
      <Link to={linkTo} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
        {linkText} <ChevronRight size={16} />
      </Link>
    </div>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'l' | 'r') =>
    ref.current?.scrollBy({ left: dir === 'l' ? -300 : 300, behavior: 'smooth' });

  return (
    <div className="relative mt-4">
      <button onClick={() => scroll('l')}
        className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-2 shadow-md transition hover:shadow-lg sm:block">
        <ChevronLeft size={18} />
      </button>
      <div ref={ref} className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {children}
      </div>
      <button onClick={() => scroll('r')}
        className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-2 shadow-md transition hover:shadow-lg sm:block">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function FlashDealCard({ deal }: { deal: FlashDeal }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(deal.end_time).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [deal.end_time]);

  const savings = Number(deal.original_price) - Number(deal.deal_price);
  const savePct = deal.original_price ? Math.round((savings / Number(deal.original_price)) * 100) : 0;
  const soldPct = deal.max_quantity > 0 ? Math.min(100, Math.round((deal.sold_count / deal.max_quantity) * 100)) : 0;

  return (
    <Link to={`/product/${deal.product_id}`} className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm hover:bg-white/25 transition-colors">
      {deal.product_image && (
        <img src={deal.product_image} alt={deal.product_name} className="h-14 w-14 rounded-xl object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-white">{deal.product_name ?? `Deal #${deal.id}`}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-lg font-extrabold text-white">{money(deal.deal_price)}</span>
          <span className="text-xs line-through text-white/60">{money(deal.original_price)}</span>
          {savePct > 0 && <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{savePct}% off</span>}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/20">
            {soldPct > 0 && <div className="h-1.5 rounded-full bg-white" style={{ width: `${soldPct}%` }} />}
          </div>
          <span className="text-[10px] font-semibold text-white/80 whitespace-nowrap">{timeLeft}</span>
        </div>
      </div>
    </Link>
  );
}

function PromoPill({ promo }: { promo: Coupon }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(promo.code); setCopied(true); } catch {}
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex w-auto max-w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold transition ${
        copied ? 'border-emerald-300 bg-emerald-500/15 text-emerald-700' : 'border-white/20 bg-white/15 text-white hover:bg-white/20'
      }`}
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-white/90" />}
      <span>{promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}</span>
      <span className="opacity-80">•</span>
      <span>{copied ? 'Copied!' : promo.code}</span>
    </button>
  );
}

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);
  if (!banners.length) return null;
  const b = banners[idx];
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="relative aspect-[21/8] sm:aspect-[21/7]">
        <img key={b.id} src={b.image_url} alt={b.title} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 text-white">
          <h3 className="max-w-md text-xl font-extrabold drop-shadow-lg sm:text-3xl">{b.title}</h3>
          {b.subtitle && <p className="mt-2 max-w-sm text-xs text-white/80 sm:text-sm">{b.subtitle}</p>}
          {b.link_url && (
            <Link to={b.link_url} className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-600">
              {b.cta_text || 'Order Now'} <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

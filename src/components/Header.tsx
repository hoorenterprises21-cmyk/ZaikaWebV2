import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Heart, Search, X, Menu, ChevronDown, MapPin, Bell } from 'lucide-react';
import { useCart } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { useEffect, useRef, useState } from 'react';
import { fetchSettings } from '../lib/settings';
import { api } from '../lib/api';
import { Notification } from '../types';

export default function Header() {
  const { count } = useCart();
  const { customer, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [restaurantName, setRestaurantName] = useState('Zaika Lounge');
  const [restaurantLogo, setRestaurantLogo] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    fetchSettings().then((s) => {
      setRestaurantName(s.restaurant_name || 'Zaika Lounge');
      setRestaurantLogo(s.logo_url || '');
    }).catch(() => undefined);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserOpen(false); setSearchOpen(false); setNotifOpen(false); }, [loc]);

  // Load notifications when customer is present
  useEffect(() => {
    if (!customer) { setNotifications([]); setUnreadCount(0); return; }
    const load = () => {
      api.get('/notifications.php?per_page=20').then(({ data }) => {
        setNotifications(data.data ?? []);
        setUnreadCount(data.unread_count ?? 0);
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [customer]);

  const markRead = async (id: number) => {
    await api.patch('/notifications.php', { id }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications.php', { mark_all_read: true }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/menu?search=${encodeURIComponent(searchQ.trim())}`); setSearchOpen(false); }
  };

  const notifTypeColor: Record<string, string> = {
    order: 'bg-brand-50 text-brand-600',
    promo: 'bg-amber-50 text-amber-600',
    wallet: 'bg-green-50 text-green-600',
    loyalty: 'bg-orange-50 text-orange-600',
    system: 'bg-neutral-100 text-neutral-600',
  };

  return (
    <>
      <header className={`sticky top-0 z-50 w-full transition-shadow duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white shadow-sm'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-500 text-white shadow-sm">
              {restaurantLogo ? <img src={restaurantLogo} alt={restaurantName} className="h-full w-full object-cover" /> : <span className="text-base font-black">{restaurantName.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="hidden leading-none sm:block">
              <div className="text-base font-black tracking-tight text-neutral-900">{restaurantName}</div>
              <div className="flex items-center gap-0.5 text-[10px] font-medium text-neutral-400">
                <MapPin size={9} className="text-brand-400" />
                Muzaffarnagar, UP
              </div>
            </div>
          </Link>

          {/* Search bar — desktop */}
          <div className="mx-4 hidden flex-1 md:block">
            <form onSubmit={handleSearch} className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search for biryani, kebabs, curries..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:shadow-sm"
              />
            </form>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button onClick={() => setSearchOpen(v => !v)} className="grid h-9 w-9 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-100 md:hidden">
              <Search size={18} />
            </button>

            <Link to="/wishlist" className="relative grid h-9 w-9 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-100" title="Wishlist">
              <Heart size={18} />
            </Link>

            {/* Notification bell */}
            {customer && (
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative grid h-9 w-9 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-100"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none p-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl z-50">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                      <p className="font-semibold text-neutral-900">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-brand-500 hover:text-brand-700">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-neutral-400">No notifications</div>
                      ) : notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && markRead(n.id)}
                          className={`cursor-pointer border-b border-neutral-50 px-4 py-3 transition-colors last:border-0 ${!n.is_read ? 'bg-brand-50/60' : 'hover:bg-neutral-50'}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${notifTypeColor[n.type] ?? 'bg-neutral-100 text-neutral-500'}`}>{n.type}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.is_read ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>{n.title}</p>
                              {n.message && <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{n.message}</p>}
                              <p className="mt-1 text-[10px] text-neutral-400">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link to="/cart" className="relative flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-brand-400 hover:text-brand-600">
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            {customer ? (
              <div className="relative">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-brand-400 hover:text-brand-600"
                >
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden max-w-20 truncate sm:inline">{customer.name.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-neutral-100 bg-white py-1 shadow-xl z-50">
                    <div className="border-b border-neutral-100 px-4 py-3">
                      <p className="text-sm font-semibold text-neutral-900">{customer.name}</p>
                      <p className="text-xs text-neutral-500">{customer.email}</p>
                    </div>
                    {[
                      { to: '/account', label: 'My Account' },
                      { to: '/orders', label: 'My Orders' },
                      { to: '/addresses', label: 'Saved Addresses' },
                      { to: '/wishlist', label: 'Wishlist' },
                      { to: '/wallet', label: 'Wallet' },
                      { to: '/loyalty', label: 'Loyalty Points' },
                      { to: '/spin-win', label: 'Spin & Win' },
                    ].map(({ to, label }) => (
                      <Link key={to} to={to} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">{label}</Link>
                    ))}
                    <div className="border-t border-neutral-100">
                      <button onClick={logout} className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50">Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600">
                <User size={15} /> Sign in
              </Link>
            )}

            <button onClick={() => setMobileOpen(v => !v)} className="grid h-9 w-9 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-100 md:hidden">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-neutral-100 px-4 py-3 md:hidden">
            <form onSubmit={handleSearch} className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search for dishes..." className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-400" />
            </form>
          </div>
        )}

        {mobileOpen && (
          <nav className="border-t border-neutral-100 bg-white px-4 py-3 md:hidden">
            <div className="grid gap-1">
              {[
                { to: '/', label: 'Home' },
                { to: '/menu', label: 'Menu' },
                { to: '/orders', label: 'My Orders' },
                { to: '/addresses', label: 'Addresses' },
                { to: '/wishlist', label: 'Wishlist' },
                { to: '/wallet', label: 'Wallet' },
                { to: '/loyalty', label: 'Loyalty Points' },
                { to: '/spin-win', label: 'Spin & Win' },
                { to: '/account', label: 'Account' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${loc.pathname === to ? 'bg-brand-50 text-brand-600' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                  {label}
                </Link>
              ))}
              {!customer && (
                <Link to="/login" className="mt-1 rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white">
                  Sign in / Register
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {(userOpen || notifOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setUserOpen(false); setNotifOpen(false); }} />
      )}
    </>
  );
}

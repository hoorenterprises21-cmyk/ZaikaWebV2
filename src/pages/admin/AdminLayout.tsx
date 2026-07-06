import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { LayoutDashboard, Package, Tags, ShoppingCart, Star, Users, Image, Settings, LogOut, Store, MapPin, Ticket, Users as Users2, Archive, BarChart2, BarChart, Zap, Clock, Gift, CalendarDays, Truck } from 'lucide-react';

const NAV = [
  { to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/admin/orders', label: 'Orders', Icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/categories', label: 'Categories', Icon: Tags },
  { to: '/admin/banners', label: 'Banners', Icon: Image },
  { to: '/admin/reviews', label: 'Reviews', Icon: Star },
  { to: '/admin/customers', label: 'Customers', Icon: Users },
  { to: '/admin/delivery-areas', label: 'Delivery Areas', Icon: MapPin },
  { to: '/admin/coupons', label: 'Coupons', Icon: Ticket },
  { to: '/admin/flash-deals', label: 'Flash Deals', Icon: Zap },
  { to: '/admin/happy-hour', label: 'Happy Hour', Icon: Clock },
  { to: '/admin/spin-win', label: 'Spin & Win', Icon: Gift },
  { to: '/admin/employees', label: 'Employees', Icon: Users2 },
  { to: '/admin/inventory', label: 'Inventory', Icon: Archive },
  { to: '/admin/suppliers', label: 'Suppliers', Icon: Truck },
  { to: '/admin/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/admin/analytics', label: 'Analytics', Icon: BarChart },
  { to: '/admin/reports', label: 'Reports', Icon: BarChart2 },
  { to: '/admin/settings', label: 'Settings', Icon: Settings },
];

export default function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const { admin, logout } = useAdminAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + '/');

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white font-bold text-sm">Z</div>
            <span className="font-bold text-neutral-900">ZaikaLounge Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden btn-ghost btn-sm sm:inline-flex"><Store size={14} /> Storefront</Link>
            <span className="hidden text-sm text-neutral-600 sm:block">{admin?.name}</span>
            <button
              onClick={() => { logout(); nav('/admin/login'); }}
              className="btn-ghost btn-sm text-red-500"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-0.5 pr-1">
            {NAV.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(to, exact)
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                <Icon size={15} /> {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile nav — horizontal scroll */}
        <div className="md:hidden -mx-1 mb-3 w-full overflow-x-auto">
          <div className="no-scrollbar flex gap-1 px-1 pb-1">
            {NAV.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                  isActive(to, exact) ? 'bg-brand-500 text-white' : 'bg-white text-neutral-700 border border-neutral-200'
                }`}
              >
                <Icon size={13} /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <h1 className="mb-4 text-2xl font-extrabold text-neutral-900">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

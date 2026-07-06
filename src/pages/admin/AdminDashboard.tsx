import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { DashboardData } from '../../types';
import { money } from '../../lib/settings';
import {
  ShoppingCart, IndianRupee, Users, Package, Star, Clock, TrendingUp,
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/dashboard.php')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <AdminLayout title="Dashboard"><div className="card skeleton h-96" /></AdminLayout>;
  }

  const { stats, revenue_chart, top_products, order_status_counts, alerts = [], coupon_insights = [] } = data;
  const maxRev = Math.max(...revenue_chart.map((r) => Number(r.total)), 1);

  return (
    <AdminLayout title="Dashboard">
      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard Icon={IndianRupee} label="Total Sales" value={money(stats.total_revenue)} sub={`${stats.total_orders} orders`} tone="green" />
        <StatCard Icon={ShoppingCart} label="Collected Amount" value={money(stats.collected_amount ?? 0)} sub="Paid & delivered" tone="brand" />
        <StatCard Icon={Clock} label="Pending Amount" value={money(stats.pending_amount ?? 0)} sub="Open orders" tone="amber" />
        <StatCard Icon={Users} label="Customers" value={String(stats.total_customers)} tone="blue" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard Icon={Package} label="Active Products" value={String(stats.active_products)} tone="amber" small />
        <StatCard Icon={ShoppingCart} label="Delivered" value={String(stats.delivered_orders)} tone="green" small />
        <StatCard Icon={Star} label="Pending Reviews" value={String(stats.pending_reviews)} tone="red" small />
        <StatCard Icon={TrendingUp} label="Today's Orders" value={String(stats.today_orders)} tone="brand" small />
      </div>

      {/* V3 row */}
      {(stats.total_employees > 0 || stats.low_inventory > 0 || stats.pending_leaves > 0 || stats.wallet_liability > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.total_employees > 0 && <StatCard Icon={Users} label="Staff" value={String(stats.total_employees)} tone="blue" small />}
          {stats.low_inventory > 0 && <StatCard Icon={Package} label="Low Inventory" value={String(stats.low_inventory)} tone="red" small />}
          {stats.pending_leaves > 0 && <StatCard Icon={Clock} label="Leave Requests" value={String(stats.pending_leaves)} tone="amber" small />}
          {stats.wallet_liability > 0 && <StatCard Icon={IndianRupee} label="Wallet Liability" value={money(stats.wallet_liability)} tone="green" small />}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-neutral-900">Revenue (last 7 days)</h2>
          <div className="mt-4 flex items-end justify-between gap-2" style={{ height: 200 }}>
            {revenue_chart.map((r) => (
              <div key={r.d} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-brand-500 to-amber-400 transition-all hover:opacity-90"
                  style={{ height: `${(Number(r.total) / maxRev) * 140 + 8}px` }}
                  title={money(r.total)}
                />
                <span className="text-[10px] text-neutral-400">
                  {new Date(r.d).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-neutral-900">Order status</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(order_status_counts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="capitalize text-neutral-600">{status.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-neutral-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="text-base font-bold text-neutral-900">Coupon performance</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {coupon_insights.length === 0 ? (
            <p className="text-sm text-neutral-500">No coupon campaigns yet.</p>
          ) : coupon_insights.map((coupon) => (
            <div key={coupon.code} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-neutral-900">{coupon.code}</div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'}`}>{coupon.is_active ? 'Active' : 'Paused'}</span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">{coupon.description || 'Special offer'}</p>
              <div className="mt-2 text-sm text-neutral-700">
                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`} off · used {coupon.used_count}/{coupon.usage_limit || '∞'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="text-base font-bold text-neutral-900">Restaurant checks</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-neutral-500">Everything looks healthy. No urgent checks right now.</p>
          ) : alerts.map((alert) => (
            <div key={`${alert.title}-${alert.count}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-sm font-semibold text-neutral-900">{alert.title}</div>
              <p className="mt-1 text-sm text-neutral-600">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div className="card mt-6 p-5">
        <h2 className="text-base font-bold text-neutral-900">Top selling products</h2>
        <div className="mt-3 space-y-2">
          {top_products.length === 0 ? (
            <p className="text-sm text-neutral-500">No sales data yet.</p>
          ) : top_products.map((p, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
              {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              <span className="flex-1 font-medium text-neutral-900">{p.name}</span>
              <span className="text-sm text-neutral-500">{p.units_sold} sold</span>
              <span className="text-sm font-semibold text-neutral-900">{money(p.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  Icon, label, value, sub, tone, small,
}: { Icon: any; label: string; value: string; sub?: string; tone: 'brand' | 'green' | 'blue' | 'amber' | 'red'; small?: boolean }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`grid ${small ? 'h-9 w-9' : 'h-11 w-11'} place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={small ? 16 : 20} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-400">{label}</div>
        <div className={`${small ? 'text-lg' : 'text-2xl'} font-extrabold text-neutral-900`}>{value}</div>
        {sub && <div className="text-xs text-neutral-500">{sub}</div>}
      </div>
    </div>
  );
}

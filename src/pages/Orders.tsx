import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiError, toNum } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { money } from '../lib/settings';
import Loader, { EmptyState } from '../components/Loader';
import { useToast } from '../components/Toast';
import {
  ShoppingBag, ChevronRight, Clock, CheckCircle2, Truck, ChefHat, PackageCheck, XCircle, Wallet, Star,
} from 'lucide-react';

const STATUS_META: Record<OrderStatus, { label: string; color: string; Icon: any }> = {
  pending:          { label: 'Pending',      color: 'bg-amber-100 text-amber-700',   Icon: Clock },
  confirmed:        { label: 'Confirmed',    color: 'bg-blue-100 text-blue-700',     Icon: CheckCircle2 },
  preparing:        { label: 'Preparing',    color: 'bg-orange-100 text-orange-700', Icon: ChefHat },
  out_for_delivery: { label: 'On the way',   color: 'bg-sky-100 text-sky-700',       Icon: Truck },
  delivered:        { label: 'Delivered',    color: 'bg-green-100 text-green-700',   Icon: PackageCheck },
  cancelled:        { label: 'Cancelled',    color: 'bg-red-100 text-red-700',       Icon: XCircle },
};

export default function Orders() {
  const { id: rawId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [list, setList] = useState<Order[]>([]);
  const [single, setSingle] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const id = rawId ? Number(rawId) : null;

  const loadOrder = () => {
    setLoading(true);
    if (id) {
      api.get(`/orders.php?id=${id}`)
        .then(({ data }) => setSingle(data.order))
        .catch(() => nav('/orders'))
        .finally(() => setLoading(false));
    } else {
      api.get('/orders.php')
        .then(({ data }) => setList(data.data ?? []))
        .finally(() => setLoading(false));
    }
  };

  useEffect(loadOrder, [id]);

  const cancelOrder = async (orderId: number) => {
    if (!confirm('Cancel this order? If you paid via wallet, the amount will be refunded immediately.')) return;
    setCancelling(true);
    try {
      const { data } = await api.patch('/orders.php', { id: orderId });
      toast(
        data.refund_amount > 0
          ? `Order cancelled. ${money(data.refund_amount)} refunded to your wallet.`
          : 'Order cancelled.',
        'success',
      );
      loadOrder();
    } catch (e) {
      toast(apiError(e, 'Could not cancel order'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loader />;

  if (id) {
    if (!single) return null;
    const meta = STATUS_META[single.order_status];
    const canCancel = ['pending', 'confirmed'].includes(single.order_status);
    const walletDiscount   = toNum(single.wallet_discount);
    const loyaltyDiscount  = toNum(single.loyalty_points_redeemed) > 0
      ? toNum(single.loyalty_points_redeemed) /* display pts, not ₹ */ : 0;
    const happyHourDiscount = toNum(single.happy_hour_discount);
    const flashDiscount     = toNum(single.flash_deal_discount);

    return (
      <div className="fade-in mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link to="/orders" className="btn-ghost btn-sm mb-4">← All orders</Link>
        <div className="card overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-4 ${single.order_status === 'cancelled' ? 'bg-red-50' : single.order_status === 'delivered' ? 'bg-green-50' : 'bg-neutral-50'} border-b border-neutral-100`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Order</p>
                <h1 className="text-xl font-extrabold text-neutral-900">{single.order_number}</h1>
                <p className="text-sm text-neutral-500">{new Date(single.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`chip text-sm ${meta.color}`}><meta.Icon size={14} /> {meta.label}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status timeline */}
            {single.order_status !== 'cancelled' && (
              <div className="flex items-center justify-between gap-1">
                {(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'] as OrderStatus[]).map((s, i, arr) => {
                  const reached = arr.indexOf(single.order_status) >= i;
                  const Icon = STATUS_META[s].Icon;
                  return (
                    <div key={s} className="flex flex-1 flex-col items-center text-center gap-1">
                      <div className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${reached ? 'bg-brand-500 text-white shadow-sm' : 'bg-neutral-100 text-neutral-400'}`}>
                        <Icon size={15} />
                      </div>
                      <span className={`text-[10px] font-medium ${reached ? 'text-neutral-700' : 'text-neutral-400'}`}>
                        {STATUS_META[s].label}
                      </span>
                      {i < arr.length - 1 && (
                        <div className={`absolute hidden`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delivery + Payment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-neutral-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Delivery to</h3>
                <p className="font-semibold text-neutral-900">{single.delivery_name}</p>
                <p className="text-sm text-neutral-600">{single.delivery_phone}</p>
                <p className="text-sm text-neutral-600">{single.delivery_address}</p>
                {single.delivery_landmark && <p className="text-xs text-neutral-400">{single.delivery_landmark}</p>}
                <p className="text-sm text-neutral-600">{single.delivery_pincode}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Payment</h3>
                <p className="font-semibold capitalize text-neutral-900">{single.payment_method.replace(/_/g, ' ')}</p>
                <p className="text-sm capitalize text-neutral-600">Status: {single.payment_status}</p>
                {single.transaction_id && <p className="text-xs text-neutral-400 mt-1">TXN: {single.transaction_id}</p>}
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Items</h3>
              <div className="space-y-2">
                {(single.items ?? []).map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2">
                    {it.product_image && <img src={it.product_image} alt={it.product_name} className="h-11 w-11 rounded-lg object-cover shrink-0" />}
                    <span className="flex-1 text-sm font-medium text-neutral-700">{it.quantity}× {it.product_name}</span>
                    <span className="text-sm font-semibold text-neutral-900">{money(it.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing breakdown */}
            <div className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm">
              <Row label="Subtotal" value={money(single.subtotal)} />
              <Row label="Delivery" value={toNum(single.delivery_charge) === 0 ? 'FREE' : money(single.delivery_charge)} valueClass={toNum(single.delivery_charge) === 0 ? 'text-green-600 font-semibold' : undefined} />
              <Row label="Tax (GST)" value={money(single.tax_amount)} />
              {toNum(single.discount_amount) > 0 && <Row label="Coupon discount" value={`− ${money(single.discount_amount)}`} valueClass="text-green-600" />}
              {happyHourDiscount > 0 && (
                <Row label={<><Clock size={12} className="inline mr-1" />Happy Hour</>} value={`− ${money(happyHourDiscount)}`} valueClass="text-amber-600" />
              )}
              {flashDiscount > 0 && (
                <Row label={<><Zap size={12} className="inline mr-1" />Flash Deal</>} value={`− ${money(flashDiscount)}`} valueClass="text-rose-500" />
              )}
              {walletDiscount > 0 && (
                <Row label={<><Wallet size={12} className="inline mr-1" />Wallet</>} value={`− ${money(walletDiscount)}`} valueClass="text-brand-600" />
              )}
              {toNum(single.loyalty_points_redeemed) > 0 && (
                <Row label={<><Star size={12} className="inline mr-1" />Points redeemed</>} value={`${toNum(single.loyalty_points_redeemed)} pts`} valueClass="text-amber-600" />
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold text-neutral-900">
                <span>Total Paid</span>
                <span className="text-lg">{money(single.total_amount)}</span>
              </div>
              {toNum(single.loyalty_points_earned) > 0 && (
                <p className="mt-1 text-xs text-amber-600">+{single.loyalty_points_earned} loyalty points earned on this order</p>
              )}
            </div>

            {/* Cancel button */}
            {canCancel && (
              <div className="pt-2">
                <button
                  onClick={() => cancelOrder(single.id)}
                  disabled={cancelling}
                  className="btn-danger w-full sm:w-auto"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Order'}
                </button>
                <p className="mt-2 text-xs text-neutral-400">Orders can be cancelled while pending or confirmed. Wallet payments are automatically refunded.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-extrabold text-neutral-900">My orders</h1>
      <p className="text-sm text-neutral-500">Track and re-order your favourite dishes.</p>

      {list.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={40} />}
          title="No orders yet"
          subtitle="Your placed orders will appear here."
          action={<Link to="/menu" className="btn-primary">Browse menu</Link>}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {list.map((o) => {
            const meta = STATUS_META[o.order_status] ?? STATUS_META.pending;
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className="card flex items-center gap-4 p-4 transition-all hover:shadow-md">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${meta.color}`}>
                  <meta.Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-900">{o.order_number}</span>
                    <span className={`chip text-[10px] ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                    {o.payment_method.toUpperCase()} ·{' '}
                    <span className="font-semibold text-neutral-700">{money(o.total_amount)}</span>
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-neutral-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, valueClass }: { label: React.ReactNode; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className={valueClass ?? 'text-neutral-700'}>{value}</span>
    </div>
  );
}

// Import Zap inline for flash deal row
function Zap({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

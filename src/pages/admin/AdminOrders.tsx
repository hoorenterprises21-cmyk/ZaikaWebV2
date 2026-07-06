import { useEffect, useState } from 'react';
import { adminApi, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { useToast } from '../../components/Toast';
import { money, effectivePrice } from '../../lib/settings';
import Loader, { EmptyState } from '../../components/Loader';
import { X, Printer, ShoppingCart, Filter } from 'lucide-react';

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const toast = useToast();
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [active, setActive] = useState<Order | null>(null);

  const load = () => {
    setLoading(true);
    const url = `/orders.php${filter ? `?status=${filter}` : '?per_page=100'}`;
    adminApi.get(url).then(({ data }) => setList(data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const updateStatus = async (order: Order, status: OrderStatus, payStatus?: PaymentStatus, txnId?: string) => {
    try {
      const payload: Record<string, unknown> = {
        id: order.id,
        order_status: status,
        transaction_id: txnId ?? order.transaction_id,
      };
      if (payStatus !== undefined) payload.payment_status = payStatus;
      if (status === 'delivered' && order.payment_method === 'cod' && payStatus === undefined) {
        payload.payment_status = 'paid';
      }
      await adminApi.put('/orders.php', payload);
      const nextOrder = { ...order, order_status: status, payment_status: String(payload.payment_status ?? order.payment_status) as PaymentStatus };
      toast(`Order #${order.order_number} updated`, 'success');
      load();
      if (active && active.id === order.id) {
        setActive(nextOrder);
      }
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const active_ = active;
  if (active_) active_.items = active_.items ?? [];

  return (
    <AdminLayout title="Orders">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={16} className="text-neutral-400" />
        <button onClick={() => setFilter('')} className={`chip border ${filter === '' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-neutral-200'}`}>All</button>
        {STATUS_FLOW.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip border capitalize ${filter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-neutral-200'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState icon={<ShoppingCart size={36} />} title="No orders" subtitle="Orders will appear here when customers place them." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3"><button onClick={() => setActive(o)} className="font-semibold text-brand-600 hover:underline">{o.order_number}</button></td>
                    <td className="px-4 py-3"><div className="text-neutral-900">{o.delivery_name}</div><div className="text-xs text-neutral-400">{o.delivery_phone}</div></td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{money(o.total_amount)}</td>
                    <td className="px-4 py-3"><span className={`chip ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.payment_status}</span></td>
                    <td className="px-4 py-3">
                      <select
                        value={o.order_status}
                        onChange={(e) => updateStatus(o, e.target.value as OrderStatus)}
                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs"
                      >
                        {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setActive(o)} className="btn-secondary btn-sm">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail / Invoice modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setActive(null)}>
          <div className="fade-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between print:hidden">
              <h2 className="text-lg font-bold text-neutral-900">Order {active.order_number}</h2>
              <div className="flex gap-1">
                <button onClick={() => window.print()} className="btn-secondary btn-sm"><Printer size={14} /> Print</button>
                <button onClick={() => setActive(null)} className="btn-ghost btn-sm"><X size={16} /></button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div><div className="text-xs uppercase text-neutral-400">Customer</div><div className="font-medium text-neutral-900">{active.delivery_name}</div><div className="text-neutral-600">{active.delivery_phone}</div></div>
              <div><div className="text-xs uppercase text-neutral-400">Payment</div><div className="font-medium text-neutral-900 capitalize">{active.payment_method}</div><div className="text-neutral-600">{active.payment_status}</div></div>
              <div className="sm:col-span-2"><div className="text-xs uppercase text-neutral-400">Delivery address</div><div className="text-neutral-700">{active.delivery_address}, {active.delivery_pincode}</div>{active.delivery_landmark && <div className="text-xs text-neutral-500">Landmark: {active.delivery_landmark}</div>}</div>
            </div>
            {(active.items ?? []).length > 0 && (
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-neutral-400"><tr><th className="py-2">Item</th><th className="py-2 text-center">Qty</th><th className="py-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {active.items!.map((it) => (
                      <tr key={it.id} className="border-t border-neutral-100">
                        <td className="py-2">{it.product_name}</td>
                        <td className="py-2 text-center">{it.quantity}</td>
                        <td className="py-2 text-right">{money(effectivePrice({ price: it.total_price, discount_price: null, }) * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 space-y-1 border-t border-dashed border-neutral-200 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="text-neutral-700">{money(active.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Delivery</span><span className="text-neutral-700">{money(active.delivery_charge)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span className="text-neutral-700">{money(active.tax_amount)}</span></div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold"><span>Total</span><span>{money(active.total_amount)}</span></div>
            </div>

            <div className="mt-4 space-y-3 print:hidden">
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Payment status</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={active.payment_status}
                    onChange={(e) => updateStatus(active, active.order_status, e.target.value as PaymentStatus)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  {active.payment_method === 'cod' && active.payment_status !== 'paid' && (
                    <button onClick={() => updateStatus(active, active.order_status, 'paid')} className="btn-primary btn-sm">Mark paid</button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((s) => (
                  <button key={s} onClick={() => updateStatus(active, s)} className={`btn-secondary btn-sm ${active.order_status === s ? 'border-brand-500 text-brand-600' : ''}`}>
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

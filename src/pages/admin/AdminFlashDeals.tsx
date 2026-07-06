import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { FlashDeal, Product } from '../../types';
import { Plus, CreditCard as Edit2, Trash2, Zap } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { money } from '../../lib/settings';

const blank = (): Partial<FlashDeal> => ({
  product_id: 0, deal_price: 0, start_time: '', end_time: '', max_quantity: 0, is_active: 1,
});

export default function AdminFlashDeals() {
  const toast = useToast();
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Partial<FlashDeal>>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.get('/flash-deals.php?per_page=50'),
      adminApi.get('/products.php?per_page=200&is_active=1'),
    ]).then(([d, p]) => {
      setDeals(d.data.data ?? d.data.deals ?? []);
      setProducts(p.data.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    if (!form.product_id || !form.deal_price || !form.start_time || !form.end_time) {
      toast('Fill all required fields', 'error'); return;
    }
    try {
      if (editing) await adminApi.patch('/flash-deals.php', { ...form, id: editing });
      else await adminApi.post('/flash-deals.php', form);
      toast(editing ? 'Deal updated' : 'Deal created', 'success');
      setShowForm(false); setEditing(null); setForm(blank()); load();
    } catch { toast('Failed to save', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('Delete this flash deal?')) return;
    await adminApi.delete('/flash-deals.php', { data: { id } });
    toast('Deleted', 'success'); load();
  };

  const toggle = async (deal: FlashDeal) => {
    await adminApi.patch('/flash-deals.php', { id: deal.id, is_active: deal.is_active ? 0 : 1 });
    load();
  };

  const fmtDateTime = (s: string) => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const isActive = (d: FlashDeal) => d.is_active && new Date(d.start_time) <= new Date() && new Date(d.end_time) >= new Date();

  return (
    <AdminLayout title="Flash Deals">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{deals.length} deal{deals.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary btn-sm" onClick={() => { setForm(blank()); setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> New Deal
        </button>
      </div>

      {showForm && (
        <div className="card mb-5 p-5">
          <h3 className="mb-4 font-bold text-neutral-900">{editing ? 'Edit' : 'New'} Flash Deal</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Product *</label>
              <select className="input" value={form.product_id ?? 0} onChange={e => setForm(f => ({ ...f, product_id: Number(e.target.value) }))}>
                <option value={0}>Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deal Price (₹) *</label>
              <input className="input" type="number" min={0} step={0.01} value={form.deal_price ?? ''} onChange={e => setForm(f => ({ ...f, deal_price: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Max Quantity (0=unlimited)</label>
              <input className="input" type="number" min={0} value={form.max_quantity ?? 0} onChange={e => setForm(f => ({ ...f, max_quantity: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Start Time *</label>
              <input className="input" type="datetime-local" value={form.start_time ?? ''} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input className="input" type="datetime-local" value={form.end_time ?? ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="card skeleton h-48" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Product</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Deal Price</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Starts</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Ends</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {deals.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-neutral-400">No flash deals yet</td></tr>}
              {deals.map(deal => {
                const active = isActive(deal);
                return (
                  <tr key={deal.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {active && <Zap size={14} className="text-amber-500 shrink-0" />}
                        <span className="font-medium text-neutral-900">{deal.product_name ?? `#${deal.product_id}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-brand-600">{money(deal.deal_price)}</div>
                      <div className="text-xs text-neutral-400 line-through">{money(deal.original_price)}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell">{fmtDateTime(deal.start_time)}</td>
                    <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell">{fmtDateTime(deal.end_time)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle(deal)} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : deal.is_active ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {active ? 'Live' : deal.is_active ? 'Scheduled' : 'Off'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => { setForm(deal); setEditing(deal.id); setShowForm(true); }}><Edit2 size={13} /></button>
                        <button className="btn-ghost btn-sm text-red-500" onClick={() => del(deal.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

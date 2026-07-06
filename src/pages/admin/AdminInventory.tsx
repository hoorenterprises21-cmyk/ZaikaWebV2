import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { InventoryItem } from '../../types';
import { Plus, CreditCard as Edit2, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import { useToast } from '../../components/Toast';

const blank = (): Partial<InventoryItem> => ({ name: '', category: '', unit: 'kg', current_stock: 0, min_stock_level: 0, cost_per_unit: 0, is_active: 1 });

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<InventoryItem>>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [txnItemId, setTxnItemId] = useState<number | null>(null);
  const [txnType, setTxnType] = useState<'in' | 'out' | 'adjustment' | 'waste'>('in');
  const [txnQty, setTxnQty] = useState('');
  const [txnNotes, setTxnNotes] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    adminApi.get(`/inventory.php?per_page=100${lowOnly ? '&low_stock=1' : ''}`).then(({ data }) => {
      setItems(data.data ?? []);
      setTotal(data.total ?? 0);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [lowOnly]);

  const save = async () => {
    try {
      if (editing) {
        await adminApi.patch('/inventory.php', { ...form, id: editing });
        toast('Item updated', 'success');
      } else {
        await adminApi.post('/inventory.php', form);
        toast('Item added', 'success');
      }
      setShowForm(false); setEditing(null); setForm(blank()); load();
    } catch { toast('Failed to save', 'error'); }
  };

  const submitTxn = async () => {
    if (!txnItemId || !txnQty) return;
    try {
      await adminApi.post('/inventory.php', { resource: 'transaction', item_id: txnItemId, type: txnType, quantity: parseFloat(txnQty), notes: txnNotes });
      toast('Stock updated', 'success');
      setTxnItemId(null); setTxnQty(''); setTxnNotes(''); load();
    } catch { toast('Failed', 'error'); }
  };

  const isLow = (item: InventoryItem) => Number(item.current_stock) <= Number(item.min_stock_level) && Number(item.min_stock_level) > 0;

  return (
    <AdminLayout title="Inventory">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          <span>Low stock only</span>
        </label>
        <span className="flex-1" />
        <button className="btn-primary btn-sm" onClick={() => { setForm(blank()); setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Item
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 p-5">
          <h3 className="mb-4 font-bold text-neutral-900">{editing ? 'Edit' : 'New'} Item</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Name *</label>
              <input className="input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={form.unit ?? 'kg'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <label className="label">Current Stock</label>
              <input className="input" type="number" min="0" step="0.01" value={form.current_stock ?? 0} onChange={e => setForm(f => ({ ...f, current_stock: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Min Stock Level</label>
              <input className="input" type="number" min="0" step="0.01" value={form.min_stock_level ?? 0} onChange={e => setForm(f => ({ ...f, min_stock_level: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Cost/Unit (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.cost_per_unit ?? 0} onChange={e => setForm(f => ({ ...f, cost_per_unit: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {txnItemId !== null && (
        <div className="card mb-4 p-5">
          <h3 className="mb-3 font-bold text-neutral-900">Record Transaction</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={txnType} onChange={e => setTxnType(e.target.value as typeof txnType)}>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="adjustment">Adjustment</option>
                <option value="waste">Waste</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="0.01" step="0.01" value={txnQty} onChange={e => setTxnQty(e.target.value)} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={txnNotes} onChange={e => setTxnNotes(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={submitTxn}>Submit</button>
            <button className="btn-ghost" onClick={() => setTxnItemId(null)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card skeleton h-48" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Item</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Stock</th>
                <th className="hidden px-4 py-3 text-right font-semibold text-neutral-600 md:table-cell">Min Level</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-neutral-400">No inventory items</td></tr>
              )}
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-neutral-50 ${isLow(item) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLow(item) && <AlertTriangle size={14} className="text-red-500" />}
                      <span className="font-medium text-neutral-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell">{item.category ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                    {Number(item.current_stock).toFixed(2)} {item.unit}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-neutral-500 md:table-cell">
                    {Number(item.min_stock_level).toFixed(2)} {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost btn-sm text-green-600" title="Stock In" onClick={() => { setTxnItemId(item.id); setTxnType('in'); }}><ArrowDown size={13} /></button>
                      <button className="btn-ghost btn-sm text-red-500" title="Stock Out" onClick={() => { setTxnItemId(item.id); setTxnType('out'); }}><ArrowUp size={13} /></button>
                      <button className="btn-ghost btn-sm" onClick={() => { setForm(item); setEditing(item.id); setShowForm(true); }}><Edit2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

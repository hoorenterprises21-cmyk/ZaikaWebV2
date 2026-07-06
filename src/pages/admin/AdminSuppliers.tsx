import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Supplier } from '../../types';
import { Plus, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';

const blank = (): Partial<Supplier> => ({ name: '', contact_person: '', phone: '', email: '', address: '', is_active: 1 });

export default function AdminSuppliers() {
  const toast = useToast();
  const [items, setItems] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Partial<Supplier>>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.get('/suppliers.php?per_page=100').then(({ data }) => setItems(data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name?.trim()) { toast('Name required', 'error'); return; }
    try {
      if (editing) await adminApi.patch('/suppliers.php', { ...form, id: editing });
      else await adminApi.post('/suppliers.php', form);
      toast(editing ? 'Updated' : 'Added', 'success');
      setShowForm(false); setEditing(null); setForm(blank()); load();
    } catch { toast('Failed to save', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('Delete this supplier?')) return;
    await adminApi.delete('/suppliers.php', { data: { id } });
    load();
  };

  return (
    <AdminLayout title="Suppliers">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} supplier{items.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary btn-sm" onClick={() => { setForm(blank()); setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="card mb-5 p-5">
          <h3 className="mb-4 font-bold text-neutral-900">{editing ? 'Edit' : 'New'} Supplier</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input className="input" value={form.contact_person ?? ''} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea rows={2} className="input resize-none" value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
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
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Name</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Contact</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 md:table-cell">Phone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-neutral-400">No suppliers yet</td></tr>}
              {items.map(s => (
                <tr key={s.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{s.name}</td>
                  <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell">{s.contact_person || '—'}</td>
                  <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => { setForm(s); setEditing(s.id); setShowForm(true); }}><Edit2 size={13} /></button>
                      <button className="btn-ghost btn-sm text-red-500" onClick={() => del(s.id)}><Trash2 size={13} /></button>
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

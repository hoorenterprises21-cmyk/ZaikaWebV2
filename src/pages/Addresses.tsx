import { FormEvent, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Address } from '../types';
import { MapPin, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { EmptyState } from '../components/Loader';

export default function Addresses() {
  const { customer } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank = {
    full_name: customer?.name || '',
    phone: customer?.phone || '',
    address_line: '', landmark: '', city: '', state: '', pincode: '',
    label: 'Home', is_default: 0,
  };
  const [form, setForm] = useState<typeof blank>(blank);

  const load = () => {
    setLoading(true);
    api.get('/customers.php?addresses=1')
      .then(({ data }) => setList(data.addresses ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put('/customers.php', { id: editing.id, ...form });
        toast('Address updated', 'success');
      } else {
        await api.post('/customers.php', form);
        toast('Address added', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setForm(blank);
      load();
    } catch (err) {
      toast(apiError(err, 'Could not save address'), 'error');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    try {
      await api.delete('/customers.php', { data: { address_id: id } });
      toast('Removed', 'info');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const setDefault = async (a: Address) => {
    try {
      await api.put('/customers.php', { id: a.id, is_default: true });
      load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const startEdit = (a: Address) => {
    setEditing(a);
    setForm({
      full_name: a.full_name, phone: a.phone, address_line: a.address_line,
      landmark: a.landmark || '', city: a.city, state: a.state || '', pincode: a.pincode,
      label: a.label || 'Home', is_default: a.is_default,
    });
    setShowForm(true);
  };

  if (!customer) return null;

  return (
    <div className="fade-in mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Delivery addresses</h1>
          <p className="text-sm text-neutral-500">Save addresses for faster checkout.</p>
        </div>
        {!showForm && (
          <button onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }} className="btn-primary btn-sm">
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mt-4 space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Label</label>
              <select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input">
                <option>Home</option><option>Work</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Full name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="input" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address line</label>
              <input value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Landmark</label>
              <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" checked={form.is_default === 1} onChange={(e) => setForm({ ...form, is_default: e.target.checked ? 1 : 0 })} className="accent-brand-500" />
              Set as default
            </label>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary">{editing ? 'Save' : 'Add address'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2 mt-4">
          {[1,2,3].map((i) => <div key={i} className="card skeleton h-24" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<MapPin size={36} />} title="No saved addresses" subtitle="Add one to speed up your checkout." />
      ) : (
        <div className="mt-4 space-y-2">
          {list.map((a) => (
            <div key={a.id} className="card flex items-start gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900">{a.full_name}</span>
                  {a.label && <span className="chip bg-neutral-100 text-neutral-600">{a.label}</span>}
                  {a.is_default === 1 && <span className="chip bg-green-100 text-green-700">Default</span>}
                </div>
                <p className="text-sm text-neutral-600">{a.address_line}, {a.city} - {a.pincode}</p>
                <p className="text-xs text-neutral-500">{a.phone}</p>
              </div>
              <div className="flex gap-1">
                {a.is_default === 0 && (
                  <button onClick={() => setDefault(a)} className="btn-ghost btn-sm" title="Set as default">
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => startEdit(a)} className="btn-ghost btn-sm" title="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(a.id)} className="btn-ghost btn-sm text-red-500" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

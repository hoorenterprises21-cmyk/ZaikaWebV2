import { FormEvent, useEffect, useState } from 'react';
import { adminApi, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { DeliveryZone } from '../../types';
import { useToast } from '../../components/Toast';
import Loader, { EmptyState } from '../../components/Loader';
import { Plus, Pencil, Trash2, X, MapPin } from 'lucide-react';

type ZoneForm = {
  id: number;
  name: string;
  pincode: string;
  delivery_charge: string;
  min_order_value: string;
  estimated_minutes: string;
  is_active: number;
};

const emptyForm: ZoneForm = {
  id: 0,
  name: '',
  pincode: '',
  delivery_charge: '40',
  min_order_value: '99',
  estimated_minutes: '30',
  is_active: 1,
};

export default function AdminDeliveryAreas() {
  const toast = useToast();
  const [list, setList] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ZoneForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/delivery.php', { params: { resource: 'zones' } });
      setList(data.zones ?? []);
    } catch (err) {
      toast(apiError(err, 'Could not load delivery areas'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startAdd = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (zone: DeliveryZone) => {
    setForm({
      id: zone.id,
      name: zone.name,
      pincode: zone.pincode,
      delivery_charge: String(zone.delivery_charge ?? 0),
      min_order_value: String(zone.min_order_value ?? 0),
      estimated_minutes: String(zone.estimated_minutes ?? 30),
      is_active: zone.is_active,
    });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.pincode) {
      toast('Area name and pincode are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        delivery_charge: Number(form.delivery_charge || 0),
        min_order_value: Number(form.min_order_value || 0),
        estimated_minutes: Number(form.estimated_minutes || 30),
        is_active: Number(form.is_active),
      };

      if (form.id) {
        await adminApi.put('/delivery.php?resource=zones', { ...payload, id: form.id });
        toast('Delivery area updated', 'success');
      } else {
        await adminApi.post('/delivery.php?resource=zones', payload);
        toast('Delivery area created', 'success');
      }

      setShowForm(false);
      load();
    } catch (err) {
      toast(apiError(err, 'Could not save delivery area'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this delivery area?')) return;
    try {
      await adminApi.delete('/delivery.php', { params: { resource: 'zones' }, data: { id } });
      toast('Deleted', 'info');
      load();
    } catch (err) {
      toast(apiError(err, 'Could not delete delivery area'), 'error');
    }
  };

  return (
    <AdminLayout title="Delivery Areas">
      <div className="mb-4 flex justify-end">
        <button onClick={startAdd} className="btn-primary btn-sm"><Plus size={16} /> Add area</button>
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState
          icon={<MapPin size={36} />}
          title="No delivery areas"
          subtitle="Create service areas for checkout and delivery rules."
          action={<button onClick={startAdd} className="btn-primary">Add first area</button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((zone) => (
            <div key={zone.id} className="card p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-neutral-900">{zone.name}</div>
                  <div className="mt-1 text-sm text-neutral-500">Pincode {zone.pincode}</div>
                </div>
                <span className={`chip ${zone.is_active ? 'bg-green-500 text-white' : 'bg-neutral-700 text-white'}`}>
                  {zone.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-neutral-600 sm:grid-cols-2">
                <div><span className="font-medium text-neutral-800">Delivery charge:</span> ₹{Number(zone.delivery_charge || 0)}</div>
                <div><span className="font-medium text-neutral-800">Min order:</span> ₹{Number(zone.min_order_value || 0)}</div>
                <div><span className="font-medium text-neutral-800">Est. time:</span> {zone.estimated_minutes || 30} mins</div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => startEdit(zone)} className="btn-ghost btn-sm"><Pencil size={14} /> Edit</button>
                <button onClick={() => remove(zone.id)} className="btn-ghost btn-sm text-red-500"><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="fade-in w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{form.id ? 'Edit area' : 'Add area'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Area name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Pincode *</label>
                  <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Delivery charge</label>
                  <input type="number" min="0" value={form.delivery_charge} onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Minimum order value</label>
                  <input type="number" min="0" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Estimated minutes</label>
                  <input type="number" min="1" value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} className="input" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={form.is_active === 1} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="accent-brand-500" />
                Active for checkout
              </label>
              <div className="flex gap-2 pt-2">
                <button className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

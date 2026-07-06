import { FormEvent, useEffect, useMemo, useState } from 'react';
import { adminApi, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Coupon } from '../../types';
import { useToast } from '../../components/Toast';
import Loader, { EmptyState } from '../../components/Loader';
import { Plus, Pencil, Trash2, X, Ticket } from 'lucide-react';

type CouponForm = {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: string;
  min_order_value: string;
  max_discount: string;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  is_active: number;
  is_public: number;
  customer_id: string;
  customer_email: string;
  customer_phone: string;
};

const emptyForm: CouponForm = {
  id: 0,
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '10',
  min_order_value: '99',
  max_discount: '',
  usage_limit: '0',
  starts_at: '',
  expires_at: '',
  is_active: 1,
  is_public: 1,
  customer_id: '',
  customer_email: '',
  customer_phone: '',
};

export default function AdminCoupons() {
  const toast = useToast();
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/delivery.php?resource=coupons');
      setList(data.coupons ?? []);
    } catch (err) {
      toast(apiError(err, 'Could not load coupons'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => { setForm(emptyForm); setShowForm(true); };
  const startEdit = (coupon: Coupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? '',
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value ?? 0),
      min_order_value: String(coupon.min_order_value ?? 0),
      max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
      usage_limit: String(coupon.usage_limit ?? 0),
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      is_active: coupon.is_active,
      is_public: coupon.is_public ?? 1,
      customer_id: coupon.customer_id ? String(coupon.customer_id) : '',
      customer_email: coupon.customer_email ?? '',
      customer_phone: coupon.customer_phone ?? '',
    });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.code) { toast('Coupon code is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value || 0),
        min_order_value: Number(form.min_order_value || 0),
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: Number(form.usage_limit || 0),
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        is_active: Number(form.is_active),
        is_public: Number(form.is_public),
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        customer_email: form.customer_email || null,
        customer_phone: form.customer_phone || null,
      };
      if (form.id) {
        await adminApi.put('/delivery.php?resource=coupons', { ...payload, id: form.id });
        toast('Coupon updated', 'success');
      } else {
        await adminApi.post('/delivery.php?resource=coupons', payload);
        toast('Coupon created', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast(apiError(err, 'Could not save coupon'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await adminApi.delete('/delivery.php', { params: { resource: 'coupons' }, data: { id } });
      toast('Deleted', 'info');
      load();
    } catch (err) {
      toast(apiError(err, 'Could not delete coupon'), 'error');
    }
  };

  const summary = useMemo(() => list.filter((c) => c.is_active === 1).length, [list]);

  return (
    <AdminLayout title="Coupons">
      <div className="mb-4 flex justify-end">
        <button onClick={startAdd} className="btn-primary btn-sm"><Plus size={16} /> Add coupon</button>
      </div>

      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        Active coupons: <span className="font-semibold text-neutral-900">{summary}</span>
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState icon={<Ticket size={36} />} title="No coupons" subtitle="Create promotional discounts for all customers or specific users." action={<button onClick={startAdd} className="btn-primary">Create coupon</button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((coupon) => (
            <div key={coupon.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-neutral-900">{coupon.code}</div>
                  <div className="mt-1 text-sm text-neutral-500">{coupon.description || 'No description'}</div>
                </div>
                <span className={`chip ${coupon.is_active ? 'bg-green-500 text-white' : 'bg-neutral-700 text-white'}`}>{coupon.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                <div><span className="font-medium text-neutral-800">Type:</span> {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}</div>
                <div><span className="font-medium text-neutral-800">Min order:</span> ₹{coupon.min_order_value}</div>
                <div><span className="font-medium text-neutral-800">Usage:</span> {coupon.used_count}/{coupon.usage_limit || '∞'}</div>
                <div><span className="font-medium text-neutral-800">Audience:</span> {coupon.is_public ? 'Public' : 'Specific customer'}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => startEdit(coupon)} className="btn-ghost btn-sm"><Pencil size={14} /> Edit</button>
                <button onClick={() => remove(coupon.id)} className="btn-ghost btn-sm text-red-500"><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="fade-in w-full max-w-2xl rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{form.id ? 'Edit coupon' : 'Add coupon'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Code *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input" required />
                </div>
                <div>
                  <label className="label">Discount type</label>
                  <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'flat' })} className="input">
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat rupees</option>
                  </select>
                </div>
                <div>
                  <label className="label">Discount value *</label>
                  <input type="number" min="0" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Min order value</label>
                  <input type="number" min="0" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Max discount</label>
                  <input type="number" min="0" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Usage limit</label>
                  <input type="number" min="0" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Starts on</label>
                  <input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Expires on</label>
                  <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Audience</label>
                  <select value={form.is_public} onChange={(e) => setForm({ ...form, is_public: Number(e.target.value) })} className="input">
                    <option value={1}>Public promotion</option>
                    <option value={0}>Specific customer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Customer ID</label>
                  <input value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Customer email</label>
                  <input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Customer phone</label>
                  <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="input" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={form.is_active === 1} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="accent-brand-500" />
                Active
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

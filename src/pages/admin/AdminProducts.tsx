import { FormEvent, useEffect, useState } from 'react';
import { adminApi, api, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Category, Product } from '../../types';
import { useToast } from '../../components/Toast';
import { money, effectivePrice } from '../../lib/settings';
import Loader, { EmptyState } from '../../components/Loader';
import { Plus, Pencil, Trash2, Search, X, Package } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

const empty = {
  id: 0, category_id: 0, name: '', slug: '', description: '', ingredients: '',
  price: '', discount_price: '', image_url: '',
  is_veg: 1, is_featured: 0, is_best_seller: 0, preparation_time: 20,
  rating: 4.0, sort_order: 0, stock_status: 'in_stock', is_active: 1,
};

export default function AdminProducts() {
  const toast = useToast();
  const [list, setList] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.get('/products.php?show_all=1&per_page=100')
      .then(({ data }) => setList(data.data ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get('/categories.php').then(({ data }) => setCats(data.categories ?? []));
  }, []);

  const startAdd = () => {
    setForm({ ...empty, category_id: cats[0]?.id ?? 0 });
    setShowForm(true);
  };
  const startEdit = (p: Product) => {
    setForm({
      id: p.id, category_id: p.category_id, name: p.name, slug: p.slug,
      description: p.description ?? '', ingredients: p.ingredients ?? '',
      price: String(p.price), discount_price: p.discount_price ? String(p.discount_price) : '',
      image_url: p.image_url ?? '', is_veg: p.is_veg, is_featured: p.is_featured,
      is_best_seller: p.is_best_seller, preparation_time: p.preparation_time,
      rating: Number(p.rating), sort_order: p.sort_order, stock_status: p.stock_status,
      is_active: p.is_active,
    });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category_id || !form.price) {
      toast('Name, category and price are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        id: form.id || undefined,
        price: Number(form.price),
        discount_price: form.discount_price === '' ? null : Number(form.discount_price),
        is_veg: Number(form.is_veg),
        is_featured: Number(form.is_featured),
        is_best_seller: Number(form.is_best_seller),
        is_active: Number(form.is_active),
      };
      if (form.id) {
        await adminApi.put('/products.php', payload);
        toast('Product updated', 'success');
      } else {
        const { id } = payload; void id;
        await adminApi.post('/products.php', payload);
        toast('Product created', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast(apiError(err, 'Could not save product'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try {
      await adminApi.delete('/products.php', { data: { id } });
      toast('Deleted', 'info');
      load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const updateAvailability = async (product: Product, stock_status: string) => {
    try {
      await adminApi.put('/products.php', { ...product, stock_status, id: product.id, price: Number(product.price), discount_price: product.discount_price ? Number(product.discount_price) : null, is_veg: Number(product.is_veg), is_featured: Number(product.is_featured), is_best_seller: Number(product.is_best_seller), is_active: Number(product.is_active) });
      toast('Availability updated', 'success');
      load();
    } catch (err) {
      toast(apiError(err, 'Could not update availability'), 'error');
    }
  };

  const filtered = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Products">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="input pl-9" />
        </div>
        <button onClick={startAdd} className="btn-primary btn-sm"><Plus size={16} /> Add product</button>
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? (
        <EmptyState icon={<Package size={36} />} title="No products" subtitle="Add your first product." action={<button onClick={startAdd} className="btn-primary">Add product</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url || ''} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        <div>
                          <div className="font-medium text-neutral-900">{p.name}</div>
                          <div className="text-xs text-neutral-400">{p.is_veg ? 'Veg' : 'Non-veg'} {p.is_best_seller === 1 && '· Bestseller'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{p.category_name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{money(effectivePrice(p))}</div>
                      {p.discount_price && Number(p.discount_price) > 0 && (
                        <div className="text-xs text-neutral-400 line-through">{money(p.price)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.stock_status || 'in_stock'}
                        onChange={(e) => updateAvailability(p, e.target.value)}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 outline-none"
                      >
                        <option value="in_stock">Available</option>
                        <option value="out_of_stock">Out of stock</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {p.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(p)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                        <button onClick={() => remove(p.id)} className="btn-ghost btn-sm text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="fade-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{form.id ? 'Edit product' : 'Add product'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Category *</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })} className="input" required>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} label="Product Image" />
              </div>
              <div>
                <label className="label">Price (₹) *</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Discount price</label>
                <input type="number" step="0.01" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Ingredients</label>
                <textarea rows={2} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Preparation time (min)</label>
                <input type="number" value={form.preparation_time} onChange={(e) => setForm({ ...form, preparation_time: Number(e.target.value) })} className="input" />
              </div>
              <div>
                <label className="label">Sort order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="input" />
              </div>
              <div>
                <label className="label">Stock status</label>
                <select value={form.stock_status} onChange={(e) => setForm({ ...form, stock_status: e.target.value as any })} className="input">
                  <option value="in_stock">In stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" checked={form.is_veg === 1} onChange={(e) => setForm({ ...form, is_veg: e.target.checked ? 1 : 0 })} className="accent-brand-500" /> Vegetarian
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" checked={form.is_featured === 1} onChange={(e) => setForm({ ...form, is_featured: e.target.checked ? 1 : 0 })} className="accent-brand-500" /> Featured
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" checked={form.is_best_seller === 1} onChange={(e) => setForm({ ...form, is_best_seller: e.target.checked ? 1 : 0 })} className="accent-brand-500" /> Bestseller
                </label>
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <button className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : (form.id ? 'Save changes' : 'Create product')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

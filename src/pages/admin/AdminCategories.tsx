import { FormEvent, useEffect, useState } from 'react';
import { adminApi, api, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Category } from '../../types';
import { useToast } from '../../components/Toast';
import Loader, { EmptyState } from '../../components/Loader';
import { Plus, Pencil, Trash2, X, Tags } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

const empty = { id: 0, name: '', slug: '', description: '', image_url: '', sort_order: 0, is_active: 1 };

export default function AdminCategories() {
  const toast = useToast();
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.get('/categories.php?all=1').then(({ data }) => setList(data.categories ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startAdd = () => { setForm({ ...empty }); setShowForm(true); };
  const startEdit = (c: Category) => {
    setForm({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '', image_url: c.image_url ?? '', sort_order: c.sort_order, is_active: c.is_active });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast('Name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, is_active: Number(form.is_active) };
      if (form.id) {
        await adminApi.put('/categories.php', payload);
        toast('Category updated', 'success');
      } else {
        await adminApi.post('/categories.php', payload);
        toast('Category created', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) { toast(apiError(err), 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this category? Products in this category must be reassigned first.')) return;
    try {
      await adminApi.delete('/categories.php', { data: { id } });
      toast('Deleted', 'info');
      load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  return (
    <AdminLayout title="Categories">
      <div className="mb-4 flex justify-end">
        <button onClick={startAdd} className="btn-primary btn-sm"><Plus size={16} /> Add category</button>
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState icon={<Tags size={36} />} title="No categories" subtitle="Organize your menu." action={<button onClick={startAdd} className="btn-primary">Add category</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c.id} className="card flex items-center gap-3 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50">
                {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-brand-500">{c.name.charAt(0)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900">{c.name}</span>
                  {!c.is_active && <span className="chip bg-neutral-100 text-neutral-500">Hidden</span>}
                </div>
                <p className="text-xs text-neutral-500">{c.product_count ?? 0} products</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(c)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                <button onClick={() => remove(c.id)} className="btn-ghost btn-sm text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="fade-in w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{form.id ? 'Edit category' : 'Add category'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div><label className="label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required /></div>
              <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} label="Category Image" />
              <div><label className="label">Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></div>
              <div><label className="label">Sort order</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="input" /></div>
              <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_active === 1} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="accent-brand-500" /> Active</label>
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

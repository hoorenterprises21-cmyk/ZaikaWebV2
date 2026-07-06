import { FormEvent, useEffect, useState } from 'react';
import { adminApi, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Banner } from '../../types';
import { useToast } from '../../components/Toast';
import Loader, { EmptyState } from '../../components/Loader';
import { Plus, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

const empty = {
  id: 0, title: '', subtitle: '', image_url: '', link_url: '', cta_text: 'Order now',
  sort_order: 0, is_active: 1, starts_at: '', ends_at: '',
};

export default function AdminBanners() {
  const toast = useToast();
  const [list, setList] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.get('/banners.php?show_all=1').then(({ data }) => setList(data.banners ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startAdd = () => { setForm({ ...empty }); setShowForm(true); };
  const startEdit = (b: Banner) => {
    setForm({
      id: b.id, title: b.title, subtitle: b.subtitle ?? '', image_url: b.image_url,
      link_url: b.link_url ?? '', cta_text: b.cta_text ?? '',
      sort_order: b.sort_order, is_active: b.is_active,
      starts_at: b.starts_at ?? '', ends_at: b.ends_at ?? '',
    });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.image_url) { toast('Title and image URL are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form, is_active: Number(form.is_active),
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      };
      if (form.id) {
        await adminApi.put('/banners.php', payload);
        toast('Banner updated', 'success');
      } else {
        await adminApi.post('/banners.php', payload);
        toast('Banner created', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) { toast(apiError(err), 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await adminApi.delete('/banners.php', { data: { id } });
      toast('Deleted', 'info');
      load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  return (
    <AdminLayout title="Banners">
      <div className="mb-4 flex justify-end">
        <button onClick={startAdd} className="btn-primary btn-sm"><Plus size={16} /> Add banner</button>
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState icon={<ImageIcon size={36} />} title="No banners" subtitle="Promote offers on your homepage." action={<button onClick={startAdd} className="btn-primary">Add banner</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((b) => (
            <div key={b.id} className="card overflow-hidden">
              <div className="relative aspect-[16/6]">
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3 text-white">
                  <div className="text-sm font-bold">{b.title}</div>
                  {b.subtitle && <div className="text-xs text-white/80">{b.subtitle}</div>}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={() => startEdit(b)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-neutral-700"><Pencil size={14} /></button>
                  <button onClick={() => remove(b.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-red-500"><Trash2 size={14} /></button>
                </div>
                <span className={`absolute left-2 top-2 chip ${b.is_active ? 'bg-green-500 text-white' : 'bg-neutral-700 text-white'}`}>{b.is_active ? 'Active' : 'Hidden'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="fade-in w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">{form.id ? 'Edit banner' : 'Add banner'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div><label className="label">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required /></div>
              <div><label className="label">Subtitle</label><input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" /></div>
              <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} label="Banner Image" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Link URL</label><input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className="input" /></div>
                <div><label className="label">CTA text</label><input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="input" /></div>
                <div><label className="label">Sort order</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="input" /></div>
                <div><label className="label">Starts at (optional)</label><input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="input" /></div>
                <div><label className="label">Ends at (optional)</label><input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="input" /></div>
              </div>
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

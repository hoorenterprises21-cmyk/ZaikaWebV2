import { useEffect, useState } from 'react';
import { adminApi, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Review } from '../../types';
import { useToast } from '../../components/Toast';
import Loader, { EmptyState } from '../../components/Loader';
import { Star, Check, X, Trash2 } from 'lucide-react';

export default function AdminReviews() {
  const toast = useToast();
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | ''>('pending');

  const load = () => {
    setLoading(true);
    const url = `/reviews.php${filter ? `?filter=${filter}` : ''}&per_page=100`;
    adminApi.get(url).then(({ data }) => setList(data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const decide = async (r: Review, decision: 'approve' | 'reject') => {
    try {
      await adminApi.put('/reviews.php', { id: r.id, decision });
      toast(`Review ${decision}d`, 'success');
      load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this review?')) return;
    try {
      await adminApi.delete('/reviews.php', { data: { id } });
      toast('Deleted', 'info');
      load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  return (
    <AdminLayout title="Reviews">
      <div className="mb-4 flex gap-2">
        {[
          { k: 'pending', l: 'Pending' },
          { k: 'approved', l: 'Approved' },
          { k: '', l: 'All' },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k as any)} className={`chip border ${filter === k ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-neutral-200'}`}>{l}</button>
        ))}
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState icon={<Star size={36} />} title="No reviews" subtitle="Customer reviews will appear here." />
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{r.customer_name ?? 'Anonymous'}</span>
                    {r.product_name && <span className="text-xs text-neutral-400">on {r.product_name}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < r.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-300'} />
                    ))}
                    <span className="ml-2 text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!r.is_approved && (
                    <button onClick={() => decide(r, 'approve')} className="btn-secondary btn-sm text-green-600"><Check size={14} /> Approve</button>
                  )}
                  {r.is_approved && (
                    <button onClick={() => decide(r, 'reject')} className="btn-secondary btn-sm text-amber-600"><X size={14} /> Hide</button>
                  )}
                  <button onClick={() => remove(r.id)} className="btn-ghost btn-sm text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-neutral-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

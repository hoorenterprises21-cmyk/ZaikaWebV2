import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { HappyHour } from '../../types';
import { Plus, CreditCard as Edit2, Trash2, Clock } from 'lucide-react';
import { useToast } from '../../components/Toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const blank = (): Partial<HappyHour> => ({ day_of_week: 1, start_time: '14:00', end_time: '17:00', discount_percent: 15, discount_flat: 0, is_active: 1 });

export default function AdminHappyHour() {
  const toast = useToast();
  const [items, setItems] = useState<HappyHour[]>([]);
  const [form, setForm] = useState<Partial<HappyHour>>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.get('/happy-hour.php').then(({ data }) => setItems(data.happy_hours ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (form.day_of_week === undefined || !form.start_time || !form.end_time) {
      toast('Day, start time and end time are required', 'error'); return;
    }
    try {
      if (editing) await adminApi.patch('/happy-hour.php', { ...form, id: editing });
      else await adminApi.post('/happy-hour.php', form);
      toast(editing ? 'Updated' : 'Created', 'success');
      setShowForm(false); setEditing(null); setForm(blank()); load();
    } catch { toast('Failed to save', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('Delete this schedule?')) return;
    await adminApi.delete('/happy-hour.php', { data: { id } });
    load();
  };

  const toggle = async (item: HappyHour) => {
    await adminApi.patch('/happy-hour.php', { id: item.id, is_active: item.is_active ? 0 : 1 });
    load();
  };

  return (
    <AdminLayout title="Happy Hours">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} schedule{items.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary btn-sm" onClick={() => { setForm(blank()); setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Schedule
        </button>
      </div>

      {showForm && (
        <div className="card mb-5 p-5">
          <h3 className="mb-4 font-bold text-neutral-900">{editing ? 'Edit' : 'New'} Happy Hour</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Day of Week</label>
              <select className="input" value={form.day_of_week ?? 1} onChange={e => setForm(f => ({ ...f, day_of_week: Number(e.target.value) }))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Time</label>
              <input className="input" type="time" value={form.start_time ?? ''} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input className="input" type="time" value={form.end_time ?? ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Discount % (0 for flat)</label>
              <input className="input" type="number" min={0} max={100} step={1} value={form.discount_percent ?? 0} onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Flat Discount ₹ (0 for %)</label>
              <input className="input" type="number" min={0} step={1} value={form.discount_flat ?? 0} onChange={e => setForm(f => ({ ...f, discount_flat: parseFloat(e.target.value) }))} />
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
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Day</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Time Window</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Discount</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-neutral-400">No schedules yet</td></tr>}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{DAYS[item.day_of_week]}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    <div className="flex items-center gap-1"><Clock size={13} className="text-neutral-400" /> {item.start_time} – {item.end_time}</div>
                  </td>
                  <td className="px-4 py-3">
                    {Number(item.discount_percent) > 0
                      ? <span className="font-semibold text-green-700">{item.discount_percent}% off</span>
                      : <span className="font-semibold text-green-700">₹{item.discount_flat} flat</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(item)} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {item.is_active ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => { setForm(item); setEditing(item.id); setShowForm(true); }}><Edit2 size={13} /></button>
                      <button className="btn-ghost btn-sm text-red-500" onClick={() => del(item.id)}><Trash2 size={13} /></button>
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

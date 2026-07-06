import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { CalendarEvent } from '../../types';
import { Plus, CreditCard as Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../components/Toast';

const TYPES = ['holiday', 'event', 'promotion', 'maintenance', 'other'] as const;
type EType = typeof TYPES[number];

const TYPE_COLORS: Record<EType, string> = {
  holiday: 'bg-red-100 text-red-700',
  event: 'bg-brand-100 text-brand-700',
  promotion: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-neutral-200 text-neutral-700',
  other: 'bg-blue-100 text-blue-700',
};

const blank = (): Partial<CalendarEvent> => ({
  title: '', description: '', event_type: 'event', is_active: 1, event_date: new Date().toISOString().slice(0, 10),
});

export default function AdminCalendar() {
  const toast = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState<Partial<CalendarEvent>>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.get(`/calendar.php?month=${month}`).then(({ data }) => setEvents(data.events ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, [month]);

  const navMonth = (dir: number) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + dir);
    setMonth(d.toISOString().slice(0, 7));
  };

  const save = async () => {
    if (!form.title?.trim() || !form.event_date) { toast('Title and date required', 'error'); return; }
    try {
      if (editing) await adminApi.patch('/calendar.php', { ...form, id: editing });
      else await adminApi.post('/calendar.php', form);
      toast('Saved', 'success');
      setShowForm(false); setEditing(null); setForm(blank()); load();
    } catch { toast('Failed to save', 'error'); }
  };

  const del = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    await adminApi.delete('/calendar.php', { data: { id } });
    load();
  };

  // Build calendar grid
  const [year, mo] = month.split('-').map(Number);
  const firstDay = new Date(year, mo - 1, 1).getDay();
  const daysInMonth = new Date(year, mo, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach(e => {
    const d = e.event_date.slice(0, 10);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  });

  return (
    <AdminLayout title="Calendar">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={() => navMonth(-1)}><ChevronLeft size={16} /></button>
          <span className="font-bold text-neutral-900">{new Date(year, mo - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button className="btn-ghost btn-sm" onClick={() => navMonth(1)}><ChevronRight size={16} /></button>
        </div>
        <button className="btn-primary btn-sm" onClick={() => { setForm({ ...blank(), event_date: today }); setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Event
        </button>
      </div>

      {showForm && (
        <div className="card mb-5 p-5">
          <h3 className="mb-4 font-bold text-neutral-900">{editing ? 'Edit' : 'New'} Event</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.event_date ?? ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.event_type ?? 'event'} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EType }))}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea rows={2} className="input resize-none" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save}>Save</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      {loading ? <div className="card skeleton h-72" /> : (
        <div className="card overflow-hidden p-4">
          <div className="grid grid-cols-7 gap-px">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-neutral-500">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateStr] ?? [];
              const isToday = dateStr === today;
              return (
                <div
                  key={day}
                  className={`min-h-[60px] cursor-pointer rounded-xl p-1.5 transition-colors hover:bg-neutral-50 ${isToday ? 'ring-2 ring-brand-400' : ''}`}
                  onClick={() => { setForm({ ...blank(), event_date: dateStr }); setEditing(null); setShowForm(true); }}
                >
                  <p className={`mb-1 text-right text-xs font-semibold ${isToday ? 'text-brand-600' : 'text-neutral-600'}`}>{day}</p>
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); setForm(ev); setEditing(ev.id); setShowForm(true); }}
                      className={`mb-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium ${TYPE_COLORS[ev.event_type as EType] ?? 'bg-neutral-100 text-neutral-700'}`}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event list for the month */}
      {events.length > 0 && (
        <div className="mt-4 card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Title</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">{new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{ev.title}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[ev.event_type as EType] ?? ''}`}>{ev.event_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => { setForm(ev); setEditing(ev.id); setShowForm(true); }}><Edit2 size={13} /></button>
                      <button className="btn-ghost btn-sm text-red-500" onClick={() => del(ev.id)}><Trash2 size={13} /></button>
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

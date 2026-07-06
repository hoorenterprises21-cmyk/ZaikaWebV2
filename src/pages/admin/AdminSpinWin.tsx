import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { SpinWinReward } from '../../types';
import { CreditCard as Edit2, ToggleLeft, ToggleRight, Info, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';

const TYPES = ['none', 'points', 'wallet', 'coupon', 'free_delivery'] as const;
const blank = (): Partial<SpinWinReward> => ({ label: 'New Reward', reward_type: 'none', reward_value: '', probability_weight: 10, is_active: 1 });

export default function AdminSpinWin() {
  const toast = useToast();
  const [rewards, setRewards] = useState<SpinWinReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<SpinWinReward>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<Partial<SpinWinReward>>(blank());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.get('/spin-win.php?admin=1').then(({ data }) => setRewards(data.rewards ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startEdit = (r: SpinWinReward) => { setEditing(r.id); setForm({ label: r.label, reward_type: r.reward_type, reward_value: r.reward_value ?? '', probability_weight: r.probability_weight, is_active: r.is_active }); };

  const saveEdit = async (id: number) => {
    try { await adminApi.patch('/spin-win.php', { id, ...form }); toast('Saved', 'success'); setEditing(null); load(); }
    catch { toast('Failed', 'error'); }
  };

  const addNew = async () => {
    if (!newForm.label?.trim()) { toast('Label required', 'error'); return; }
    setSaving(true);
    try {
      await adminApi.post('/spin-win.php', newForm);
      toast('Segment added', 'success');
      setAdding(false); setNewForm(blank()); load();
    } catch (e: any) { toast(e?.response?.data?.message || 'Failed to add', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm('Delete this reward segment?')) return;
    await adminApi.delete('/spin-win.php', { data: { id } });
    load();
  };

  const toggle = async (r: SpinWinReward) => {
    await adminApi.patch('/spin-win.php', { id: r.id, is_active: r.is_active ? 0 : 1 });
    load();
  };

  const totalWeight = rewards.filter(r => r.is_active).reduce((s, r) => s + Number(r.probability_weight), 0);

  return (
    <AdminLayout title="Spin & Win Rewards">
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">Adjust probability weights to control win odds. Higher weight = more likely. Customers can spin once per day.</p>
      </div>

      <div className="mb-3 flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => { setAdding(true); setNewForm(blank()); }}>
          <Plus size={14} /> Add Segment
        </button>
      </div>

      {adding && (
        <div className="card mb-4 p-5">
          <h3 className="mb-3 font-bold text-neutral-900">New Reward Segment</h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            <div className="sm:col-span-2"><label className="label">Label</label><input className="input" value={newForm.label ?? ''} onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))} /></div>
            <div><label className="label">Type</label><select className="input" value={newForm.reward_type ?? 'none'} onChange={e => setNewForm(f => ({ ...f, reward_type: e.target.value as SpinWinReward['reward_type'] }))}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="label">Value</label><input className="input" value={newForm.reward_value ?? ''} onChange={e => setNewForm(f => ({ ...f, reward_value: e.target.value }))} placeholder="e.g. 25" /></div>
            <div><label className="label">Weight</label><input className="input" type="number" min={1} value={newForm.probability_weight ?? 10} onChange={e => setNewForm(f => ({ ...f, probability_weight: parseInt(e.target.value) }))} /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={addNew} disabled={saving}>{saving ? 'Adding…' : 'Add'}</button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="card skeleton h-64" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Label</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Value</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Weight</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Chance</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rewards.map(r => (
                <tr key={r.id} className={`hover:bg-neutral-50 ${!r.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {editing === r.id ? <input className="input py-1 text-sm" value={form.label ?? ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /> : r.label}
                  </td>
                  <td className="px-4 py-3 capitalize text-neutral-600">
                    {editing === r.id ? <select className="input py-1 text-sm" value={form.reward_type ?? 'none'} onChange={e => setForm(f => ({ ...f, reward_type: e.target.value as SpinWinReward['reward_type'] }))}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select> : r.reward_type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {editing === r.id ? <input className="input w-24 py-1 text-sm" value={form.reward_value ?? ''} onChange={e => setForm(f => ({ ...f, reward_value: e.target.value }))} placeholder="e.g. 25" /> : r.reward_value ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editing === r.id ? <input className="input w-16 py-1 text-center text-sm" type="number" min={1} value={form.probability_weight ?? 1} onChange={e => setForm(f => ({ ...f, probability_weight: parseInt(e.target.value) }))} /> : <span className="font-semibold text-neutral-900">{r.probability_weight}</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-500">
                    {r.is_active && totalWeight > 0 ? `${((Number(r.probability_weight) / totalWeight) * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(r)} className="text-neutral-400 hover:text-brand-500">
                      {r.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {editing === r.id ? (
                      <div className="flex justify-end gap-1">
                        <button className="btn-primary btn-sm" onClick={() => saveEdit(r.id)}>Save</button>
                        <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => startEdit(r)}><Edit2 size={13} /></button>
                        <button className="btn-ghost btn-sm text-red-500" onClick={() => del(r.id)}><Trash2 size={13} /></button>
                      </div>
                    )}
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

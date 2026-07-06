import { useEffect, useState } from 'react';
import { adminApi, apiError, toNum } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Customer } from '../../types';
import { useToast } from '../../components/Toast';
import { money } from '../../lib/settings';
import { EmptyState } from '../../components/Loader';
import { Search, Users, Trash2, Wallet, Star, X } from 'lucide-react';

interface CustomerDetail extends Customer {
  wallet_balance?: number | string;
  loyalty_points_total?: number;
  referral_code?: string;
  referral_count?: number;
}

export default function AdminCustomers() {
  const toast = useToast();
  const [list, setList] = useState<CustomerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Wallet/Loyalty drawer
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [adjType, setAdjType] = useState<'wallet' | 'loyalty'>('wallet');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDir, setAdjDir] = useState<'credit' | 'debit' | 'earn' | 'redeem'>('credit');
  const [adjNote, setAdjNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.get(`/customers.php?search=${encodeURIComponent(search)}`).then(({ data }) => setList(data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, [search]);

  const toggleActive = async (c: CustomerDetail) => {
    try {
      await adminApi.put('/customers.php', { id: c.id, is_active: c.is_active ? 0 : 1 });
      toast('Status updated', 'success'); load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this customer and all their data?')) return;
    try {
      await adminApi.delete('/customers.php', { data: { id } });
      toast('Customer removed', 'info'); load();
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const applyAdjustment = async () => {
    if (!selected || !adjAmount) return;
    setSaving(true);
    try {
      if (adjType === 'wallet') {
        await adminApi.post('/wallet.php', {
          customer_id: selected.id, type: adjDir, amount: parseFloat(adjAmount),
          source: 'manual', description: adjNote || undefined,
        });
      } else {
        await adminApi.post('/loyalty.php', {
          customer_id: selected.id, type: adjDir, points: parseInt(adjAmount),
          source: 'manual', description: adjNote || undefined,
        });
      }
      toast('Adjustment applied', 'success');
      setSelected(null); setAdjAmount(''); setAdjNote('');
      load();
    } catch (e: any) { toast(e?.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout title="Customers">
      <div className="mb-4 relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="card skeleton h-48" />
      ) : list.length === 0 ? (
        <EmptyState icon={<Users size={36} />} title="No customers" subtitle="Customer accounts will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Spent</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Wallet</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{c.name}</div>
                      <div className="text-xs text-neutral-400">Joined {new Date(c.created_at || '').toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-700">{c.email}</div>
                      <div className="text-xs text-neutral-400">{c.phone}</div>
                    </td>
                    <td className="px-4 py-3">{c.orders_count ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{c.total_spent ? money(c.total_spent) : '—'}</td>
                    <td className="hidden px-4 py-3 text-green-700 font-semibold sm:table-cell">
                      {c.wallet_balance !== undefined ? money(c.wallet_balance) : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-amber-600 font-semibold sm:table-cell">
                      {c.loyalty_points_total !== undefined ? c.loyalty_points_total : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? 'Active' : 'Blocked'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button title="Wallet/Loyalty" onClick={() => { setSelected(c); setAdjType('wallet'); setAdjDir('credit'); setAdjAmount(''); setAdjNote(''); }} className="btn-ghost btn-sm text-brand-500">
                          <Wallet size={13} />
                        </button>
                        <button onClick={() => toggleActive(c)} className="btn-secondary btn-sm">{c.is_active ? 'Block' : 'Unblock'}</button>
                        <button onClick={() => remove(c.id)} className="btn-ghost btn-sm text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet/Loyalty Adjustment Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-neutral-900">Adjust Balance — {selected.name}</h2>
              <button onClick={() => setSelected(null)} className="btn-ghost btn-sm"><X size={16} /></button>
            </div>

            {/* Current balances */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-50 px-4 py-3 text-center">
                <p className="text-xs text-green-600 font-semibold uppercase">Wallet</p>
                <p className="text-xl font-extrabold text-green-700">{money(selected.wallet_balance ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                <p className="text-xs text-amber-600 font-semibold uppercase">Points</p>
                <p className="text-xl font-extrabold text-amber-700">{toNum(selected.loyalty_points_total)}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex rounded-xl border border-neutral-200 overflow-hidden">
              <button onClick={() => { setAdjType('wallet'); setAdjDir('credit'); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${adjType === 'wallet' ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                <Wallet size={14} /> Wallet
              </button>
              <button onClick={() => { setAdjType('loyalty'); setAdjDir('earn'); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${adjType === 'loyalty' ? 'bg-amber-500 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                <Star size={14} /> Points
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="label">Direction</label>
                {adjType === 'wallet' ? (
                  <select className="input" value={adjDir} onChange={e => setAdjDir(e.target.value as any)}>
                    <option value="credit">Credit (+)</option>
                    <option value="debit">Debit (−)</option>
                  </select>
                ) : (
                  <select className="input" value={adjDir} onChange={e => setAdjDir(e.target.value as any)}>
                    <option value="earn">Award (+)</option>
                    <option value="redeem">Deduct (−)</option>
                  </select>
                )}
              </div>
              <div>
                <label className="label">{adjType === 'wallet' ? 'Amount (₹)' : 'Points'}</label>
                <input className="input" type="number" min={1} value={adjAmount} onChange={e => setAdjAmount(e.target.value)} placeholder={adjType === 'wallet' ? 'e.g. 100' : 'e.g. 50'} />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Admin note" />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={applyAdjustment} disabled={saving || !adjAmount} className="btn-primary flex-1">{saving ? 'Applying…' : 'Apply Adjustment'}</button>
              <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { api, toNum } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/settings';
import { LoyaltyEntry } from '../types';
import { Star, Gift, TrendingUp, ArrowDownLeft } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function LoyaltyPage() {
  const { customer } = useAuth();
  const toast = useToast();
  const [points, setPoints] = useState(0);
  const [pointValue, setPointValue] = useState(1);
  const [minRedeem, setMinRedeem] = useState(100);
  const [history, setHistory] = useState<LoyaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemAmt, setRedeemAmt] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = () => {
    if (!customer) return;
    api.get('/loyalty.php').then(({ data }) => {
      setPoints(toNum(data.points));
      setPointValue(toNum(data.point_value) || 1);
      setMinRedeem(toNum(data.min_redeem_points) || 100);
      setHistory(data.history ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [customer]);

  const handleRedeem = async () => {
    const pts = parseInt(redeemAmt, 10);
    if (!pts || pts < minRedeem) { toast(`Minimum ${minRedeem} points to redeem`, 'error'); return; }
    if (pts > points) { toast('Insufficient points', 'error'); return; }
    setRedeeming(true);
    try {
      const { data } = await api.post('/loyalty.php', { points: pts });
      toast(`Redeemed ${pts} pts → ${money(data.wallet_credit)} wallet credit!`, 'success');
      setRedeemAmt('');
      load();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Redemption failed', 'error');
    } finally { setRedeeming(false); }
  };

  if (!customer) return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <p className="text-neutral-500">Please sign in to view your loyalty points.</p>
    </div>
  );

  const walletValue = (points * pointValue).toFixed(2);

  return (
    <div className="fade-in mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Points card */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
            <Star size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Loyalty Points</p>
            <p className="text-4xl font-extrabold tracking-tight">{points.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <p className="mt-2 text-lg font-semibold text-white/90">= {money(walletValue)} wallet value</p>
        <p className="mt-1 text-xs text-white/70">1 point = ₹{pointValue} · Earn 1 pt per ₹100 spent</p>
      </div>

      {/* Redeem card */}
      <div className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-bold text-neutral-900"><Gift size={18} className="text-amber-500" /> Redeem Points</h2>
        <p className="mt-1 text-sm text-neutral-500">Min {minRedeem} points · Credited instantly to your wallet</p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min={minRedeem}
            max={points}
            step={10}
            value={redeemAmt}
            onChange={e => setRedeemAmt(e.target.value)}
            placeholder={`Min ${minRedeem} pts`}
            className="input flex-1"
          />
          <button onClick={handleRedeem} disabled={redeeming || !redeemAmt} className="btn-primary shrink-0">
            {redeeming ? 'Redeeming…' : 'Redeem'}
          </button>
        </div>
        {redeemAmt && parseInt(redeemAmt, 10) >= minRedeem && (
          <p className="mt-2 text-sm text-green-600 font-medium">You'll get {money(parseInt(redeemAmt, 10) * pointValue)} wallet credit</p>
        )}
      </div>

      {/* How to earn */}
      <div className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 font-bold text-neutral-900"><TrendingUp size={18} className="text-brand-500" /> How to Earn</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600">
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />1 point for every ₹100 spent on orders</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Refer a friend and earn bonus points</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Spin the wheel daily for bonus points</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />Special birthday bonus every year</li>
        </ul>
      </div>

      {/* History */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Points History</h2>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-2xl" />)}</div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
            <Star size={32} className="mx-auto mb-2 text-neutral-300" />
            <p className="text-sm text-neutral-400">No points history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <div key={entry.id} className="card flex items-center gap-4 p-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${entry.type === 'earn' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-500'}`}>
                  {entry.type === 'earn' ? <TrendingUp size={16} /> : <ArrowDownLeft size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{entry.description || entry.source}</p>
                  <p className="text-xs text-neutral-400">{new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <p className={`font-bold ${entry.type === 'earn' ? 'text-amber-600' : 'text-neutral-500'}`}>
                  {entry.type === 'earn' ? '+' : '−'}{entry.points} pts
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

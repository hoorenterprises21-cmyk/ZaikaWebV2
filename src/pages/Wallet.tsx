import { useEffect, useRef, useState } from 'react';
import { api, toNum } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/settings';
import { WalletTransaction } from '../types';
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';

export default function WalletPage() {
  const { customer } = useAuth();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    api.get('/wallet.php').then(({ data }) => {
      setBalance(toNum(data.balance));
      setTxns(data.transactions ?? []);
    }).finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <p className="text-neutral-500">Please sign in to view your wallet.</p>
    </div>
  );

  return (
    <div className="fade-in mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Balance card */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-amber-500 p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Wallet Balance</p>
            <p className="text-4xl font-extrabold tracking-tight">{money(balance)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/70">Use your wallet balance at checkout for instant discounts.</p>
      </div>

      {/* Transaction history */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Transaction History</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : txns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
            <Clock size={32} className="mx-auto mb-2 text-neutral-300" />
            <p className="text-sm text-neutral-400">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map(txn => (
              <div key={txn.id} className="card flex items-center gap-4 p-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${txn.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {txn.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{txn.description || txn.source}</p>
                  <p className="text-xs text-neutral-400">{new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.type === 'credit' ? '+' : '−'}{money(txn.amount)}
                  </p>
                  <p className="text-xs text-neutral-400">Bal: {money(txn.balance_after)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

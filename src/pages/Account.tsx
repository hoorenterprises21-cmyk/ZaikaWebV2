import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { money } from '../lib/settings';
import { useToast } from '../components/Toast';
import { LogOut, User as UserIcon, ShoppingBag, MapPin, Heart, Wallet, Star, Gift, Share2, Copy, Check } from 'lucide-react';
import { useEffect } from 'react';

export default function Account() {
  const { customer, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [referralInput, setReferralInput] = useState('');
  const [applyingRef, setApplyingRef] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!customer) return;
    api.get('/wallet.php').then(({ data }) => setWalletBalance(Number(data.balance) || 0)).catch(() => {});
    api.get('/loyalty.php').then(({ data }) => setLoyaltyPoints(Number(data.points) || 0)).catch(() => {});
    api.get('/referral.php').then(({ data }) => {
      setReferralCode(data.my_code || '');
      setReferralCount(data.successful_referrals || 0);
    }).catch(() => {});
  }, [customer]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-neutral-600">Please sign in.</p>
        <Link to="/login" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }

  const handleLogout = () => { setBusy(true); logout(); nav('/'); };

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const applyReferral = async () => {
    if (!referralInput.trim()) return;
    setApplyingRef(true);
    try {
      const { data } = await api.post('/referral.php', { code: referralInput.trim() });
      toast(data.message || 'Referral applied!', 'success');
      setReferralInput('');
      api.get('/wallet.php').then(({ data }) => setWalletBalance(Number(data.balance) || 0)).catch(() => {});
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Invalid referral code', 'error');
    } finally { setApplyingRef(false); }
  };

  const initials = customer.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="fade-in mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-amber-500 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-xl font-bold backdrop-blur">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">{customer.name}</h1>
              <p className="text-sm text-white/90">{customer.email}</p>
              {customer.phone && <p className="text-sm text-white/90">{customer.phone}</p>}
            </div>
          </div>

          {/* Quick balances */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link to="/wallet" className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 hover:bg-white/25 transition-colors">
              <Wallet size={18} />
              <div>
                <p className="text-xs text-white/75">Wallet</p>
                <p className="font-bold">{money(walletBalance)}</p>
              </div>
            </Link>
            <Link to="/loyalty" className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 hover:bg-white/25 transition-colors">
              <Star size={18} />
              <div>
                <p className="text-xs text-white/75">Points</p>
                <p className="font-bold">{loyaltyPoints.toLocaleString('en-IN')} pts</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid gap-3 p-6 sm:grid-cols-3">
          {[
            { to: '/orders', Icon: ShoppingBag, label: 'My Orders', sub: 'Track / reorder' },
            { to: '/addresses', Icon: MapPin, label: 'Addresses', sub: 'Manage delivery' },
            { to: '/wishlist', Icon: Heart, label: 'Wishlist', sub: 'Saved dishes' },
            { to: '/wallet', Icon: Wallet, label: 'Wallet', sub: money(walletBalance) },
            { to: '/loyalty', Icon: Star, label: 'Loyalty', sub: `${loyaltyPoints} pts` },
            { to: '/spin-win', Icon: Gift, label: 'Spin & Win', sub: 'Daily rewards' },
          ].map(({ to, Icon, label, sub }) => (
            <Link key={to} to={to} className="card flex items-center gap-3 p-4 transition-colors hover:bg-brand-50">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={18} />
              </div>
              <div>
                <div className="font-semibold text-neutral-900">{label}</div>
                <div className="text-xs text-neutral-500">{sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Referral section */}
        <div className="mx-6 mb-6 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 p-5 border border-amber-100">
          <h2 className="flex items-center gap-2 font-bold text-neutral-900">
            <Share2 size={18} className="text-brand-500" /> Refer & Earn
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Share your code and earn wallet cash when friends order!</p>
          {referralCode ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-white border border-neutral-200 px-4 py-2.5 font-mono text-base font-bold tracking-widest text-brand-600 text-center select-all">
                {referralCode}
              </div>
              <button onClick={copyCode} className="btn-secondary btn-sm shrink-0 gap-1">
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          ) : (
            <div className="skeleton mt-3 h-10 rounded-xl" />
          )}
          {referralCount > 0 && (
            <p className="mt-2 text-xs text-neutral-500">{referralCount} successful referral{referralCount !== 1 ? 's' : ''}</p>
          )}

          {/* Apply code */}
          <div className="mt-4 border-t border-amber-100 pt-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">Have a friend's code? Use it here:</p>
            <div className="flex gap-2">
              <input
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                placeholder="Enter referral code"
                className="input flex-1 font-mono uppercase"
                maxLength={12}
              />
              <button onClick={applyReferral} disabled={applyingRef || !referralInput} className="btn-primary btn-sm shrink-0">
                {applyingRef ? '…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 p-6">
          <button onClick={handleLogout} disabled={busy} className="btn-secondary">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

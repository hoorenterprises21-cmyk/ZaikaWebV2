import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../components/Toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

type Stage = 'request' | 'reset' | 'done';

export default function ForgotPassword() {
  const toast = useToast();
  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth.php?action=forgot_password', { action: 'forgot_password', email: email.trim() });
      if (data.debug_token) {
        setToken(data.debug_token);
        setStage('reset');
        toast('Dev mode: token pre-filled below', 'info');
      } else {
        toast('Reset link sent — check your email', 'success');
        setStage('reset');
      }
    } catch (err) {
      toast(apiError(err, 'Failed to send reset email'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !password || password !== confirm) {
      toast('Passwords must match and be at least 6 characters', 'error'); return;
    }
    if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/auth.php?action=reset_password', { action: 'reset_password', token: token.trim(), password });
      setStage('done');
    } catch (err) {
      toast(apiError(err, 'Invalid or expired token'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in mx-auto max-w-md px-4 py-12 sm:px-6">
      <Link to="/login" className="btn-ghost btn-sm mb-6 inline-flex"><ArrowLeft size={14} /> Back to sign in</Link>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-amber-500 px-6 py-8 text-white text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/20">
            {stage === 'done' ? <CheckCircle size={28} /> : <Mail size={28} />}
          </div>
          <h1 className="text-2xl font-extrabold">
            {stage === 'done' ? 'Password Reset!' : stage === 'reset' ? 'New Password' : 'Forgot Password?'}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {stage === 'done' ? 'You can now sign in with your new password.' : stage === 'reset' ? 'Enter the reset token and your new password.' : 'Enter your email and we\'ll send a reset link.'}
          </p>
        </div>

        <div className="p-6">
          {stage === 'done' ? (
            <div className="text-center">
              <Link to="/login" className="btn-primary w-full">Sign in now</Link>
            </div>
          ) : stage === 'request' ? (
            <form onSubmit={sendReset} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" autoFocus />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center text-xs text-neutral-400">
                Remember it? <Link to="/login" className="link-brand">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={doReset} className="space-y-4">
              <div>
                <label className="label">Reset Token</label>
                <input value={token} onChange={e => setToken(e.target.value)} className="input font-mono text-sm" placeholder="Paste token from email" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="input" placeholder="Repeat password" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

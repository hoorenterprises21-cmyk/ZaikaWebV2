import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../lib/adminAuth';
import { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast('Welcome, admin', 'success');
      nav('/admin');
    } catch (err) {
      toast(apiError(err, 'Invalid credentials'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white">
            <ShieldCheck size={26} />
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-neutral-900">Admin login</h1>
          <p className="text-sm text-neutral-500">Access the ZaikaLounge dashboard.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="admin@zaikalounge.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
          <Link to="/" className="hover:text-neutral-600 inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Back to store
          </Link>
          <span>Default: admin@zaikalounge.com / set in DB</span>
        </div>
      </div>
    </div>
  );
}

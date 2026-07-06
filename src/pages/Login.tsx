import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiError } from '../lib/api';
import { useToast } from '../components/Toast';
import { UtensilsCrossed } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (password.length < 6) {
          toast('Password must be at least 6 characters', 'error');
          setLoading(false);
          return;
        }
        await register(name, email, phone, password);
      }
      toast(mode === 'login' ? 'Welcome back!' : 'Account created!', 'success');
      nav(params.get('redirect') || '/');
    } catch (err) {
      toast(apiError(err, 'Could not sign in'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const register = useAuth().register;

  return (
    <div className="fade-in mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white">
            <UtensilsCrossed size={26} />
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-neutral-900">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-neutral-500">
            {mode === 'login' ? 'Sign in to continue ordering.' : 'Join us for delicious food.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="label">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Your name" />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="you@example.com" />
          </div>
          {mode === 'register' && (
            <div>
              <label className="label">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="10-digit mobile" />
            </div>
          )}
          <div>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="link-brand"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        {mode === 'login' && (
          <p className="mt-2 text-center text-sm text-neutral-400">
            <Link to="/forgot-password" className="link-brand">Forgot password?</Link>
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        Are you an admin? <Link to="/admin/login" className="link-brand">Admin login</Link>
      </p>
    </div>
  );
}

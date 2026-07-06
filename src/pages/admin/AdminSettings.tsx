import { FormEvent, useEffect, useState } from 'react';
import { adminApi, apiError } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { useToast } from '../../components/Toast';
import Loader from '../../components/Loader';
import { Save, Store, Phone, Truck, CreditCard, MessageCircle } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

type Group = 'general' | 'contact' | 'delivery' | 'payment' | 'social';

const DEFAULTS: Record<Group, Record<string, string>> = {
  general: {
    restaurant_name: '', restaurant_tagline: '', logo_url: '', opening_hours: '', footer_text: '', restaurant_is_closed: '0', restaurant_closed_message: '',
  },
  contact: {
    contact_email: '', contact_phone: '', whatsapp_number: '', address: '',
  },
  delivery: {
    default_delivery_charge: '40', free_delivery_threshold: '499', tax_percent: '5',
    currency_code: 'INR', currency_symbol: '₹', min_order_value: '99',
  },
  payment: {
    enable_cod: '1', enable_upi: '1', enable_razorpay: '0', enable_stripe: '0',
    enable_whatsapp_order: '1', upi_id: '', upi_payee_name: '',
    razorpay_key_id: '', razorpay_key_secret: '',
    stripe_publishable_key: '', stripe_secret_key: '',
  },
  social: { facebook_url: '', instagram_url: '', twitter_url: '' },
};

const SECTIONS: { key: Group; title: string; Icon: any }[] = [
  { key: 'general', title: 'General', Icon: Store },
  { key: 'contact', title: 'Contact & WhatsApp', Icon: Phone },
  { key: 'delivery', title: 'Delivery & Tax', Icon: Truck },
  { key: 'payment', title: 'Payment Methods', Icon: CreditCard },
  { key: 'social', title: 'Social Links', Icon: MessageCircle },
];

export default function AdminSettings() {
  const toast = useToast();
  const [values, setValues] = useState<Record<Group, Record<string, string>>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.get('/settings.php?all=1')
      .then(({ data }) => {
        const incoming = data.settings ?? {};
        const merged = { ...DEFAULTS };
        (Object.keys(DEFAULTS) as Group[]).forEach((g) => {
          merged[g] = { ...DEFAULTS[g], ...(incoming[g] ?? {}) };
        });
        setValues(merged);
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (g: Group, k: string, v: string) =>
    setValues((prev) => ({ ...prev, [g]: { ...prev[g], [k]: v } }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await adminApi.put('/settings.php', values);
      if (data?.success === false) throw new Error(data?.message || 'Save failed');
      toast('Settings saved successfully', 'success');
    } catch (err) {
      toast(apiError(err, 'Could not save settings — check your connection'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout title="Settings"><Loader /></AdminLayout>;

  const inputFor = (g: Group, k: string, opts?: { type?: string; placeholder?: string }) => (
    <div key={k}>
      <label className="label capitalize">{k.replace(/_/g, ' ')}</label>
      <input
        type={opts?.type ?? 'text'}
        value={values[g][k] ?? ''}
        placeholder={opts?.placeholder}
        onChange={(e) => set(g, k, e.target.value)}
        className="input"
      />
    </div>
  );

  return (
    <AdminLayout title="Settings">
      <form onSubmit={submit} className="space-y-6">
        {SECTIONS.map(({ key, title, Icon }) => (
          <section key={key} className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon size={16} /></div>
              <h2 className="text-base font-bold text-neutral-900">{title}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.keys(values[key]).map((k) => {
                if (k.startsWith('enable_')) {
                  return (
                    <label key={k} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5">
                      <span className="text-sm capitalize text-neutral-700">{k.replace('enable_', '').replace(/_/g, ' ')}</span>
                      <input type="checkbox" checked={values[key][k] === '1'} onChange={(e) => set(key, k, e.target.checked ? '1' : '0')} className="accent-brand-500 h-5 w-5" />
                    </label>
                  );
                }
                if (k === 'restaurant_is_closed') {
                  return (
                    <label key={k} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5">
                      <span className="text-sm capitalize text-neutral-700">restaurant closed</span>
                      <input type="checkbox" checked={values[key][k] === '1'} onChange={(e) => set(key, k, e.target.checked ? '1' : '0')} className="accent-brand-500 h-5 w-5" />
                    </label>
                  );
                }
                if (k === 'logo_url') {
                  return (
                    <div key={k} className="sm:col-span-2">
                      <ImageUpload value={values[key][k] ?? ''} onChange={(url) => set(key, k, url)} label="Restaurant logo" />
                    </div>
                  );
                }
                if (k === 'footer_text' || k === 'restaurant_closed_message' || k === 'address') {
                  return (
                    <div key={k} className="sm:col-span-2">
                      <label className="label capitalize">{k.replace(/_/g, ' ')}</label>
                      <textarea rows={2} value={values[key][k] ?? ''} onChange={(e) => set(key, k, e.target.value)} className="input" />
                    </div>
                  );
                }
                if (k.includes('secret')) return inputFor(key, k, { type: 'password' });
                return inputFor(key, k);
              })}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 flex justify-end">
          <button className="btn-primary shadow-lg" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save settings'}</button>
        </div>
      </form>
    </AdminLayout>
  );
}

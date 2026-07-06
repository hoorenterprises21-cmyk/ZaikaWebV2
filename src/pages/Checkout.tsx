import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { api, apiError, toNum } from '../lib/api';
import { money, effectivePrice, fetchSettings, fetchPaymentMethods, getRestaurantStatus } from '../lib/settings';
import { useToast } from '../components/Toast';
import { Address, DeliveryZone, Order, PaymentMethodOption, Settings } from '../types';
import { MapPin, Tag, Wallet, Star } from 'lucide-react';

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { customer } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const restaurantStatus = useMemo(() => getRestaurantStatus(settings), [settings]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [payment, setPayment] = useState<string>('cod');
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);

  // V3 wallet / loyalty
  const [useWallet, setUseWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(1);

  const [form, setForm] = useState({
    delivery_name: customer?.name || '',
    delivery_phone: customer?.phone || '',
    delivery_address: '',
    delivery_landmark: '',
    delivery_pincode: '',
    delivery_city: 'Muzaffarnagar',
    notes: '',
  });

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => undefined);
    fetchPaymentMethods().then((m) => {
      setMethods(m);
      const enabled = m.filter((x) => x.enabled);
      if (enabled.length) setPayment(enabled[0].key);
    });
    api.get('/delivery.php?resource=zones').then(({ data }) => {
      const zones = (data.zones ?? []).filter((z: DeliveryZone) => z.is_active === 1 || z.is_active === '1');
      setDeliveryZones(zones);
      if (zones.length) {
        const firstZone = zones[0];
        setSelectedZoneId(firstZone.id);
        setForm((prev) => ({
          ...prev,
          delivery_pincode: String(firstZone.pincode),
          delivery_city: 'Muzaffarnagar',
        }));
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!customer) return;
    api.get('/customers.php?addresses=1').then(({ data }) => {
      const addressList = (data.addresses ?? []) as Address[];
      setAddresses(addressList);
      const def = addressList.find((a) => a.is_default);
      if (def) {
        setSelectedAddressId(def.id);
        setForm((prev) => ({
          ...prev,
          delivery_name: def.full_name || prev.delivery_name,
          delivery_phone: def.phone || prev.delivery_phone,
          delivery_address: def.address_line || prev.delivery_address,
          delivery_landmark: def.landmark || prev.delivery_landmark,
          delivery_pincode: def.pincode || prev.delivery_pincode,
          delivery_city: def.city || prev.delivery_city || 'Muzaffarnagar',
        }));
      }
    }).catch(() => undefined);

    // Load wallet & loyalty balance
    api.get('/wallet.php').then(({ data }) => setWalletBalance(toNum(data.balance))).catch(() => undefined);
    api.get('/loyalty.php').then(({ data }) => {
      setLoyaltyPoints(toNum(data.points));
      setLoyaltyPointValue(toNum(data.point_value) || 1);
    }).catch(() => undefined);
  }, [customer]);

  const deliveryCharge = useMemo(() => {
    const threshold = parseFloat(settings.free_delivery_threshold || '499');
    const base = parseFloat(settings.default_delivery_charge || '40');
    return subtotal >= threshold ? 0 : base;
  }, [settings, subtotal]);

  const tax = useMemo(() => +(subtotal * (parseFloat(settings.tax_percent || '5')) / 100).toFixed(2), [subtotal, settings]);

  const walletDiscount = useWallet ? Math.min(walletBalance, Math.max(0, subtotal + deliveryCharge + tax - discount)) : 0;
  const loyaltyDiscount = redeemPoints > 0 ? +(redeemPoints * loyaltyPointValue).toFixed(2) : 0;
  const total = Math.max(0, subtotal + deliveryCharge + tax - discount - walletDiscount - loyaltyDiscount);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-neutral-600">Your cart is empty.</p>
        <Link to="/menu" className="btn-primary mt-4 inline-flex">Browse menu</Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-neutral-600">Please sign in to place an order.</p>
        <Link to="/login?redirect=/checkout" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }

  if (!restaurantStatus.isOpen) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-left shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Temporarily closed</p>
          <h1 className="mt-2 text-2xl font-extrabold text-neutral-900">We are closed for the day</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{restaurantStatus.message}</p>
          <Link to="/menu" className="btn-secondary mt-5 inline-flex">Browse menu for later</Link>
        </div>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.get(`/delivery.php?resource=coupons&code=${encodeURIComponent(couponCode.trim())}`);
      const c = data.coupon;
      const value = c.discount_type === 'percentage'
        ? (subtotal * parseFloat(c.discount_value)) / 100
        : parseFloat(c.discount_value);
      const capped = c.max_discount ? Math.min(value, parseFloat(c.max_discount)) : value;
      setDiscount(+capped.toFixed(2));
      setCouponMsg(`Coupon applied: you saved ${money(capped)}`);
      toast('Coupon applied', 'success');
    } catch (e) {
      setDiscount(0);
      setCouponMsg(apiError(e, 'Invalid or expired coupon'));
    }
  };

  const placeOrder = async (method: string) => {
    setPlacing(true);
    try {
      const selected = addresses.find((a) => a.id === selectedAddressId);
      const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId);
      const pincodeValue = (selected?.pincode || form.delivery_pincode || '').trim();
      const payload = {
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        payment_method: method,
        address_id: selected?.id ?? null,
        delivery_name: selected?.full_name || form.delivery_name,
        delivery_phone: selected?.phone || form.delivery_phone,
        delivery_address: selected?.address_line || form.delivery_address,
        delivery_landmark: selected?.landmark || form.delivery_landmark,
        delivery_pincode: pincodeValue,
        delivery_city: 'Muzaffarnagar',
        coupon_code: couponCode || null,
        notes: form.notes,
        use_wallet: useWallet,
        redeem_points: redeemPoints > 0 ? redeemPoints : 0,
      };
      if (!restaurantStatus.isOpen) {
        toast(restaurantStatus.message, 'error');
        setPlacing(false);
        return;
      }
      if (!payload.delivery_phone || !payload.delivery_address || !payload.delivery_pincode || !payload.delivery_city) {
        toast('Fill delivery name, phone, address, city and pincode', 'error');
        setPlacing(false);
        return;
      }
      if (deliveryZones.length === 0 || !selectedZone) {
        toast('We are not delivering in this area yet. We will be available soon.', 'error');
        setPlacing(false);
        return;
      }
      if (selectedZone && pincodeValue && selectedZone.pincode !== pincodeValue) {
        toast('We are not delivering in this area yet. We will be available soon.', 'error');
        setPlacing(false);
        return;
      }
      const { data } = await api.post('/orders.php', payload);
      const order = data.order as Order;
      clear();
      if (method === 'whatsapp') {
        const waText = buildWhatsAppOrderText(order, settings);
        window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(waText)}`, '_blank');
      } else if (method === 'cod') {
        toast('Order placed successfully', 'success');
      } else {
        toast('Order received. Complete payment to confirm.', 'info');
      }
      nav(`/orders/${order.id}`);
    } catch (e) {
      toast(apiError(e, 'Could not place order'), 'error');
    } finally {
      setPlacing(false);
    }
  };

  const enabledMethods = methods.filter((m) => m.enabled);

  return (
    <div className="fade-in mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-extrabold text-neutral-900">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Addresses */}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900">
              <MapPin size={18} className="text-brand-500" /> Delivery address
            </h2>
            {addresses.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setForm((prev) => ({
                        ...prev,
                        delivery_name: addr.full_name || prev.delivery_name,
                        delivery_phone: addr.phone || prev.delivery_phone,
                        delivery_address: addr.address_line || prev.delivery_address,
                        delivery_landmark: addr.landmark || prev.delivery_landmark,
                        delivery_pincode: addr.pincode || prev.delivery_pincode,
                        delivery_city: addr.city || prev.delivery_city || 'Muzaffarnagar',
                      }));
                    }}
                    className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-neutral-200 hover:border-brand-300'
                    }`}
                  >
                    <p className="font-semibold text-neutral-900">{addr.full_name}</p>
                    <p className="mt-0.5 text-neutral-600">{addr.address_line}</p>
                    <p className="text-neutral-500">{addr.city} – {addr.pincode}</p>
                    {addr.phone && <p className="text-neutral-500">{addr.phone}</p>}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedAddressId(null)}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                    selectedAddressId === null
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-dashed border-neutral-300 hover:border-brand-300'
                  }`}
                >
                  + New address
                </button>
              </div>
            )}
            {selectedAddressId === null && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Full Name" value={form.delivery_name} onChange={(v) => setForm((p) => ({ ...p, delivery_name: v }))} />
                <Field label="Phone *" value={form.delivery_phone} onChange={(v) => setForm((p) => ({ ...p, delivery_phone: v }))} />
                <div className="sm:col-span-2">
                  <Field label="Address *" value={form.delivery_address} onChange={(v) => setForm((p) => ({ ...p, delivery_address: v }))} />
                </div>
                <Field label="Landmark" value={form.delivery_landmark} onChange={(v) => setForm((p) => ({ ...p, delivery_landmark: v }))} />
                <div>
                  <label className="label">Area / Pincode *</label>
                  <select
                    className="input"
                    value={selectedZoneId ?? ''}
                    onChange={(e) => {
                      const zid = Number(e.target.value);
                      setSelectedZoneId(zid);
                      const z = deliveryZones.find((x) => x.id === zid);
                      if (z) setForm((p) => ({ ...p, delivery_pincode: String(z.pincode), delivery_city: 'Muzaffarnagar' }));
                    }}
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>{z.area_name} – {z.pincode}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Delivery Notes</label>
                  <textarea rows={2} className="input resize-none" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            )}
          </section>

          {/* Payment method */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-neutral-900">Payment method</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {enabledMethods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPayment(m.key)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                    payment === m.key ? 'border-brand-400 bg-brand-50' : 'border-neutral-200 hover:border-brand-300'
                  }`}
                >
                  <span className="font-semibold text-neutral-900">{m.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Order summary */}
        <div className="card h-fit p-5 sticky top-20">
          <h2 className="text-base font-bold text-neutral-900">Order summary</h2>

          {/* Items */}
          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between gap-2">
                <span className="truncate text-neutral-700">{quantity}× {product.name}</span>
                <span className="text-neutral-600">{money(effectivePrice(product) * quantity)}</span>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="mt-3 border-t border-dashed border-neutral-200 pt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="input pl-9 text-sm"
                />
              </div>
              <button onClick={applyCoupon} className="btn-secondary btn-sm">Apply</button>
            </div>
            {couponMsg && <p className="mt-1 text-xs text-neutral-500">{couponMsg}</p>}
          </div>

          {/* Wallet */}
          {walletBalance > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Wallet size={14} className="text-brand-500" />
                <span className="font-medium text-neutral-800">Wallet</span>
                <span className="text-neutral-500">{money(walletBalance)}</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
                Use
              </label>
            </div>
          )}

          {/* Loyalty points */}
          {loyaltyPoints > 0 && (
            <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Star size={14} className="text-amber-500" />
                <span className="font-medium text-neutral-800">{loyaltyPoints} pts</span>
                <span className="text-neutral-500">= {money(loyaltyPoints * loyaltyPointValue)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={0}
                  max={loyaltyPoints}
                  step={10}
                  value={redeemPoints}
                  onChange={e => setRedeemPoints(Math.min(loyaltyPoints, Math.max(0, Number(e.target.value))))}
                  className="input w-24 py-1 text-sm"
                  placeholder="Redeem pts"
                />
                <span className="text-neutral-400">pts</span>
                {redeemPoints > 0 && <span className="text-green-600">− {money(loyaltyDiscount)}</span>}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="mt-3 space-y-2 border-t border-dashed border-neutral-200 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="text-neutral-700">{money(subtotal)}</span></div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Delivery</span>
              <span className={deliveryCharge === 0 ? 'text-green-600 font-semibold' : 'text-neutral-700'}>{deliveryCharge === 0 ? 'FREE' : money(deliveryCharge)}</span>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">Taxes</span><span className="text-neutral-700">{money(tax)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between"><span className="text-neutral-500">Coupon</span><span className="text-green-600">− {money(discount)}</span></div>
            )}
            {walletDiscount > 0 && (
              <div className="flex justify-between"><span className="text-neutral-500">Wallet</span><span className="text-green-600">− {money(walletDiscount)}</span></div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between"><span className="text-neutral-500">Points</span><span className="text-green-600">− {money(loyaltyDiscount)}</span></div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-2">
              <span className="font-semibold text-neutral-900">Total</span>
              <span className="font-extrabold text-neutral-900">{money(total)}</span>
            </div>
          </div>

          <button
            onClick={() => placeOrder(payment)}
            disabled={placing}
            className="btn-primary mt-4 w-full"
          >
            {placing ? 'Placing order...' : `Place order · ${money(total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400">Payments are processed securely. COD available.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`input ${readOnly ? 'bg-neutral-50' : ''}`} readOnly={readOnly} />
    </div>
  );
}

function buildWhatsAppOrderText(order: Order, settings: Settings): string {
  const lines = [
    `*New Order ${order.order_number}*`,
    `Customer: ${order.delivery_name}`,
    `Phone: ${order.delivery_phone}`,
    `Address: ${order.delivery_address}, ${order.delivery_pincode}`,
    '',
    'Items:',
    ...(order.items ?? []).map((i) => `• ${i.quantity}× ${i.product_name} - ${settings.currency_symbol ?? '₹'}${i.total_price}`),
    '',
    `Subtotal: ${settings.currency_symbol ?? '₹'}${order.subtotal}`,
    `Delivery: ${settings.currency_symbol ?? '₹'}${order.delivery_charge}`,
    `Tax: ${settings.currency_symbol ?? '₹'}${order.tax_amount}`,
    `*Total: ${settings.currency_symbol ?? '₹'}${order.total_amount}*`,
    `Payment: ${order.payment_method.toUpperCase()}`,
  ];
  return lines.join('\n');
}

import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { money, effectivePrice } from '../lib/settings';
import { useToast } from '../components/Toast';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { EmptyState } from '../components/Loader';

export default function Cart() {
  const { items, subtotal, remove, setQty } = useCart();
  const toast = useToast();
  const nav = useNavigate();

  const deliveryCharge = subtotal >= 499 ? 0 : 40;
  const tax = +(subtotal * 0.05).toFixed(2);
  const total = subtotal + deliveryCharge + tax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          icon={<ShoppingBag size={48} />}
          title="Your cart is empty"
          subtitle="Looks like you haven't added anything yet."
          action={<Link to="/menu" className="btn-primary">Browse menu</Link>}
        />
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button onClick={() => nav(-1)} className="btn-ghost btn-sm mb-4">
        <ArrowLeft size={16} /> Continue shopping
      </button>
      <h1 className="text-2xl font-extrabold text-neutral-900">Your cart</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {items.map(({ product, quantity }) => {
            const price = effectivePrice(product);
            return (
              <div key={product.id} className="card flex items-center gap-4 p-3">
                <img
                  src={product.image_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=300'}
                  alt={product.name}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${product.id}`} className="font-semibold text-neutral-900 hover:text-brand-600 line-clamp-1">
                    {product.name}
                  </Link>
                  <p className="text-sm text-neutral-500">{money(price)} each</p>
                  <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-0.5 w-fit">
                    <button onClick={() => setQty(product.id, quantity - 1)} className="grid h-7 w-7 place-items-center rounded hover:bg-neutral-100">
                      <Minus size={14} />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold">{quantity}</span>
                    <button onClick={() => setQty(product.id, quantity + 1)} className="grid h-7 w-7 place-items-center rounded hover:bg-neutral-100">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-bold text-neutral-900">{money(price * quantity)}</div>
                  <button
                    onClick={() => { remove(product.id); toast('Removed from cart', 'info'); }}
                    className="text-neutral-400 hover:text-red-500"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-20 p-5">
            <h2 className="text-base font-bold text-neutral-900">Order summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Delivery" value={deliveryCharge === 0 ? 'FREE' : money(deliveryCharge)} highlight={deliveryCharge === 0} />
              <Row label="Taxes (5%)" value={money(tax)} />
              <div className="border-t border-dashed border-neutral-200 pt-2">
                <Row label="Total" value={money(total)} bold />
              </div>
            </div>

            {subtotal < 499 && (
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                Add {money(499 - subtotal)} more to get FREE delivery.
              </p>
            )}

            <button
              onClick={() => nav('/checkout')}
              className="btn-primary mt-4 w-full"
            >
              Proceed to checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-semibold text-neutral-900' : 'text-neutral-500'}>{label}</span>
      <span className={`${bold ? 'font-bold text-neutral-900' : 'text-neutral-700'} ${highlight ? 'text-green-600 font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

import { Product } from '../types';
import { effectivePrice, money } from '../lib/settings';
import { useCart } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { useToast } from './Toast';
import { useState } from 'react';
import { Plus, Minus, Star, Clock, Heart, Leaf, Flame } from 'lucide-react';

export default function ProductCard({ product }: { product: Product }) {
  const { add, getQty, setQty } = useCart();
  const { customer } = useAuth();
  const toast = useToast();
  const qty = getQty(product.id);
  const price = effectivePrice(product);
  const originalPrice = parseFloat(String(product.price));
  const hasDiscount = price < originalPrice;
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const out = product.stock_status === 'out_of_stock';
  const [wishlisted, setWishlisted] = useState(false);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!customer) { toast('Sign in to save favourites', 'info'); return; }
    if (wishlisted) {
      await api.delete('/wishlist.php', { data: { product_id: product.id } }).catch(() => {});
    } else {
      await api.post('/wishlist.php', { product_id: product.id }).catch(() => {});
    }
    setWishlisted(v => !v);
  };

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${out ? 'opacity-70' : ''}`}>
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative block flex-shrink-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
          <img
            src={product.image_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=600'}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {out && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700">Sold out</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="rounded-lg bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              {discountPct}% OFF
            </span>
          )}
          {product.is_best_seller === 1 && (
            <span className="rounded-lg bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              Bestseller
            </span>
          )}
        </div>

        {/* Veg / Non-veg indicator */}
        <div className="absolute right-2 top-2">
          <div className={`grid h-5 w-5 place-items-center rounded-sm border-2 bg-white ${product.is_veg ? 'border-green-600' : 'border-red-600'}`}>
            <div className={`h-2.5 w-2.5 rounded-full ${product.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
          </div>
        </div>

        {/* Wishlist */}
        <button
          onClick={toggleWishlist}
          className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow transition hover:bg-white"
          aria-label="Wishlist"
        >
          <Heart size={14} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-500'} />
        </button>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        {/* Category */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{product.category_name}</p>

        {/* Name */}
        <Link to={`/product/${product.id}`} className="mt-0.5 line-clamp-1 text-sm font-bold text-neutral-900 hover:text-brand-600">
          {product.name}
        </Link>

        {/* Description */}
        <p className="mt-0.5 line-clamp-2 flex-1 text-xs leading-relaxed text-neutral-500">{product.description}</p>

        {/* Rating + time */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-md bg-green-600 px-1.5 py-0.5 font-semibold text-white">
            <Star size={10} className="fill-white" />
            {product.avg_rating ?? product.rating}
          </span>
          <span className="text-neutral-400">({product.review_count ?? 0})</span>
          <span className="ml-auto flex items-center gap-1 text-neutral-400">
            <Clock size={11} /> {product.preparation_time}m
          </span>
        </div>

        {/* Price + Add */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-neutral-900">{money(price)}</span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">{money(originalPrice)}</span>
            )}
          </div>

          {out ? (
            <span className="text-xs text-neutral-400">Unavailable</span>
          ) : qty === 0 ? (
            <button
              onClick={() => { add(product); toast(`${product.name} added!`, 'success'); }}
              className="flex items-center gap-1.5 rounded-xl border-2 border-brand-500 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white"
            >
              <Plus size={14} /> ADD
            </button>
          ) : (
            <div className="flex items-center gap-0 overflow-hidden rounded-xl border-2 border-brand-500">
              <button
                onClick={() => setQty(product.id, qty - 1)}
                className="grid h-8 w-7 place-items-center bg-brand-500 text-white transition hover:bg-brand-600"
              >
                <Minus size={12} />
              </button>
              <span className="min-w-7 bg-white text-center text-xs font-bold text-brand-600">{qty}</span>
              <button
                onClick={() => setQty(product.id, qty + 1)}
                className="grid h-8 w-7 place-items-center bg-brand-500 text-white transition hover:bg-brand-600"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

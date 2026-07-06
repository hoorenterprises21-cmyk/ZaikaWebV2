import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import type { Product, Review } from '../types';
import { money, effectivePrice } from '../lib/settings';
import { useCart } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { STATIC_PRODUCTS } from '../lib/staticData';
import { ChevronLeft, Star, Clock, Plus, Minus, ShoppingBag, Heart, Share2, Send } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { add, getQty, setQty } = useCart();
  const { customer } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = () => {
    api.get(`/reviews.php?product_id=${id}`)
      .then(({ data }) => setReviews(data.reviews ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setProduct(null);

    // Try API first, then static data
    api.get(`/products.php?id=${id}`)
      .then(({ data }) => setProduct(data.product))
      .catch(() => {
        const staticP = STATIC_PRODUCTS.find(p => p.id === Number(id));
        if (staticP) setProduct(staticP);
      })
      .finally(() => setLoading(false));

    loadReviews();
  }, [id]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      toast('Sign in to leave a review', 'info');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post('/reviews.php', {
        product_id: Number(id),
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      toast('Review submitted successfully', 'success');
      setReviewForm({ rating: 5, comment: '' });
      loadReviews();
    } catch (err) {
      toast(apiError(err, 'Could not submit review'), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="skeleton aspect-square w-full rounded-3xl" />
          <div className="space-y-4">
            <div className="skeleton h-6 w-1/4" />
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-neutral-500">Product not found.</p>
        <Link to="/menu" className="btn-primary mt-4 inline-flex">Back to menu</Link>
      </div>
    );
  }

  const price = effectivePrice(product);
  const originalPrice = parseFloat(String(product.price));
  const hasDiscount = price < originalPrice;
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const qty = getQty(product.id);
  const out = product.stock_status === 'out_of_stock';
  const avg = product.avg_rating ?? product.rating;
  const reviewCount = product.review_count ?? 0;

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-100 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-neutral-500">
          <button onClick={() => nav(-1)} className="flex items-center gap-1 font-medium text-neutral-700 hover:text-brand-600">
            <ChevronLeft size={16} /> Back
          </button>
          <span>/</span>
          <Link to="/menu" className="hover:text-brand-600">Menu</Link>
          {product.category_name && <><span>/</span><span>{product.category_name}</span></>}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">

          {/* ── IMAGE ─────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl bg-neutral-100">
            <img
              src={product.image_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=800'}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
            <div className="absolute left-3 top-3">
              <div className={`grid h-6 w-6 place-items-center rounded-sm border-2 bg-white ${product.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                <div className={`h-3 w-3 rounded-full ${product.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
              </div>
            </div>
            {hasDiscount && (
              <div className="absolute right-3 top-3 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                {discountPct}% OFF
              </div>
            )}
            {product.is_best_seller === 1 && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
                <Star size={11} className="fill-white" /> Bestseller
              </div>
            )}
          </div>

          {/* ── DETAILS ───────────────────────────────────────────── */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">{product.category_name}</span>
            <h1 className="mt-1.5 text-2xl font-extrabold text-neutral-900 sm:text-3xl">{product.name}</h1>

            {/* Ratings row */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1 text-sm font-bold text-white">
                <Star size={14} className="fill-white" /> {avg}
              </span>
              <span className="text-sm text-neutral-500">{reviewCount} ratings</span>
              <span className="flex items-center gap-1 text-sm text-neutral-500">
                <Clock size={14} className="text-brand-500" /> {product.preparation_time} min
              </span>
              <span className={`chip ${product.is_veg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {product.is_veg ? 'Pure Veg' : 'Non-Veg'}
              </span>
            </div>

            {/* Price */}
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-neutral-900">{money(price)}</span>
              {hasDiscount && (
                <span className="text-lg text-neutral-400 line-through">{money(originalPrice)}</span>
              )}
              {hasDiscount && (
                <span className="text-sm font-semibold text-green-600">You save {money(originalPrice - price)}</span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <p className="text-sm leading-relaxed text-neutral-600">{product.description}</p>
              </div>
            )}

            {product.ingredients && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Key ingredients</p>
                <p className="mt-1 text-sm text-neutral-600">{product.ingredients}</p>
              </div>
            )}

            {/* Action */}
            <div className="mt-6 flex items-center gap-3">
              {out ? (
                <div className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 py-3 text-center text-sm font-semibold text-neutral-400">
                  Currently unavailable
                </div>
              ) : qty === 0 ? (
                <button
                  onClick={() => { add(product); toast(`${product.name} added to cart!`, 'success'); }}
                  className="flex-1 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-600"
                >
                  <Plus size={16} className="mr-1.5 inline" />
                  Add to Cart · {money(price)}
                </button>
              ) : (
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex flex-1 items-center justify-between overflow-hidden rounded-xl border-2 border-brand-500">
                    <button onClick={() => setQty(product.id, qty - 1)} className="grid h-11 w-11 place-items-center bg-brand-500 text-white hover:bg-brand-600">
                      <Minus size={16} />
                    </button>
                    <span className="flex-1 text-center text-base font-bold text-brand-600">{qty}</span>
                    <button onClick={() => setQty(product.id, qty + 1)} className="grid h-11 w-11 place-items-center bg-brand-500 text-white hover:bg-brand-600">
                      <Plus size={16} />
                    </button>
                  </div>
                  <button onClick={() => nav('/cart')} className="flex-1 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-600">
                    <ShoppingBag size={16} className="mr-1.5 inline" />
                    Go to Cart · {money(price * qty)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── REVIEWS ───────────────────────────────────────────────── */}
        <section className="mt-10 border-t border-neutral-100 pt-8">
          <h2 className="text-lg font-bold text-neutral-900">Customer Ratings & Reviews</h2>

          {customer ? (
            <form onSubmit={submitReview} className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Write a review</p>
                  <p className="text-xs text-neutral-500">Share your experience after a delivered order.</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="text-xl text-amber-400"
                    >
                      {star <= reviewForm.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="input mt-3"
                placeholder="Tell others about the taste, packaging, or delivery experience..."
              />
              <div className="mt-3 flex justify-end">
                <button type="submit" disabled={submittingReview} className="btn-primary btn-sm">
                  <Send size={14} /> {submittingReview ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">Sign in to leave a review for this dish.</p>
          )}

          {reviews.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center">
              <Star size={28} className="mx-auto mb-2 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-500">No reviews yet.</p>
              <p className="text-xs text-neutral-400">Be the first to share your experience after ordering.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {reviews.map(r => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                        {(r.customer_name ?? 'A').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-neutral-900">{r.customer_name ?? 'Anonymous'}</span>
                    </div>
                    <span className="flex items-center gap-1 rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                      <Star size={10} className="fill-white" /> {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2.5 text-sm leading-relaxed text-neutral-600">{r.comment}</p>}
                  <p className="mt-2 text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

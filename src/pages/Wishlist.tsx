import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Heart } from 'lucide-react';
import { EmptyState, GridSkeleton } from '../components/Loader';

export default function Wishlist() {
  const { customer } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) { setLoading(false); return; }
    api.get('/wishlist.php')
      .then(({ data }) => setItems(data.wishlist ?? []))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-neutral-600">Please sign in to view your wishlist.</p>
        <Link to="/login" className="btn-primary mt-4 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Heart size={22} className="text-brand-500" />
        <h1 className="text-2xl font-extrabold text-neutral-900">Your wishlist</h1>
      </div>

      {loading ? (
        <GridSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart size={40} />}
          title="No saved dishes yet"
          subtitle="Tap the heart icon on any dish to save it here."
          action={<Link to="/menu" className="btn-primary">Browse menu</Link>}
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

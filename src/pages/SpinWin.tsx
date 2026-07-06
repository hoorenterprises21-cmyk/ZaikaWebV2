import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SpinWinReward } from '../types';
import { useToast } from '../components/Toast';
import { RefreshCw, Star, Wallet, Gift, Truck, Trophy } from 'lucide-react';

const COLORS = [
  '#F59E0B', '#EF4444', '#10B981', '#3B82F6',
  '#8B5CF6', '#F97316', '#EC4899', '#06B6D4',
];

const REWARD_ICONS: Record<string, React.FC<{ size: number }>> = {
  points: Star,
  wallet: Wallet,
  coupon: Gift,
  free_delivery: Truck,
  none: Trophy,
};

export default function SpinWinPage() {
  const { customer } = useAuth();
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rewards, setRewards] = useState<SpinWinReward[]>([]);
  const [canSpin, setCanSpin] = useState(false);
  const [nextSpin, setNextSpin] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<SpinWinReward | null>(null);
  const [wonExtra, setWonExtra] = useState<string>('');
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/spin-win.php').then(({ data }) => {
      setRewards(data.rewards ?? []);
      setCanSpin(data.can_spin ?? false);
      setNextSpin(data.next_spin_at ?? null);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [customer]);

  // Draw wheel on canvas whenever rewards change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rewards.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWheel(ctx, rewards, rotation);
  }, [rewards, rotation]);

  const drawWheel = (ctx: CanvasRenderingContext2D, segs: SpinWinReward[], rot: number) => {
    const canvas = ctx.canvas;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const arc = (2 * Math.PI) / segs.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segs.forEach((seg, i) => {
      const start = rot + i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(seg.label.length > 14 ? seg.label.slice(0, 13) + '…' : seg.label, r - 12, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const spin = async () => {
    if (!customer) { toast('Sign in to spin!', 'error'); return; }
    if (!canSpin) { toast('Already spun today. Come back tomorrow!', 'info'); return; }
    if (spinning) return;
    setSpinning(true);
    setWon(null);
    setWonExtra('');

    try {
      const { data } = await api.post('/spin-win.php', {});

      // Animate wheel for ~3 seconds
      const totalSpins = 5 + Math.random() * 3;
      const totalRot = totalSpins * 2 * Math.PI;
      const start = performance.now();
      const duration = 3200;
      const startRot = rotation;

      const frame = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        const newRot = startRot + totalRot * ease;
        setRotation(newRot);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) drawWheel(ctx, rewards, newRot);
        }
        if (t < 1) requestAnimationFrame(frame);
        else {
          setSpinning(false);
          setCanSpin(false);
          setWon(data.reward);
          if (data.points_earned) setWonExtra(`+${data.points_earned} points added to your account!`);
          else if (data.wallet_credit) setWonExtra(`+₹${data.wallet_credit} added to your wallet!`);
          else if (data.coupon_code) setWonExtra(`Coupon ${data.coupon_code} added to your account!`);
          else if (data.free_delivery) setWonExtra('Free delivery coupon added!');
          else setWonExtra('Better luck next time!');
        }
      };
      requestAnimationFrame(frame);
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Spin failed', 'error');
      setSpinning(false);
    }
  };

  const hoursUntil = () => {
    if (!nextSpin) return '';
    const diff = new Date(nextSpin).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="fade-in mx-auto max-w-lg px-4 py-6 sm:px-6 text-center">
      <h1 className="text-3xl font-extrabold text-neutral-900">Spin & Win</h1>
      <p className="mt-2 text-sm text-neutral-500">Spin once daily for a chance to win points, wallet cash, coupons and more!</p>

      {loading ? (
        <div className="skeleton mx-auto mt-10 h-64 w-64 rounded-full" />
      ) : (
        <>
          {/* Wheel */}
          <div className="relative mx-auto mt-8 w-64 h-64">
            {/* Pointer */}
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <div className="h-8 w-4 bg-brand-500" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
            </div>
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              className="rounded-full shadow-xl"
            />
          </div>

          {/* Win result */}
          {won && (
            <div className="slide-up mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
              <p className="text-xl font-extrabold text-amber-700">{won.label}</p>
              <p className="mt-1 text-sm text-amber-600">{wonExtra}</p>
            </div>
          )}

          {/* Spin button */}
          <div className="mt-6">
            {customer ? (
              canSpin ? (
                <button
                  onClick={spin}
                  disabled={spinning}
                  className="btn-primary gap-2 px-8 py-3 text-base"
                >
                  <RefreshCw size={18} className={spinning ? 'animate-spin' : ''} />
                  {spinning ? 'Spinning…' : 'Spin Now!'}
                </button>
              ) : (
                <div className="rounded-2xl bg-neutral-100 px-6 py-4">
                  <p className="font-semibold text-neutral-700">Already spun today</p>
                  {nextSpin && <p className="mt-1 text-sm text-neutral-500">Next spin in {hoursUntil()}</p>}
                </div>
              )
            ) : (
              <a href="/login?redirect=/spin-win" className="btn-primary px-8 py-3 text-base">Sign in to Spin</a>
            )}
          </div>

          {/* Rewards legend */}
          <div className="mt-8 grid grid-cols-2 gap-2 text-left">
            {rewards.map((r, i) => {
              const Icon = REWARD_ICONS[r.reward_type] ?? Trophy;
              return (
                <div key={r.id} className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-3 py-2 shadow-sm">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: COLORS[i % COLORS.length] }}>
                    <Icon size={14} />
                  </div>
                  <span className="truncate text-xs font-medium text-neutral-700">{r.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

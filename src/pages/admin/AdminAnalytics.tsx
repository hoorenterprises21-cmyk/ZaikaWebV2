import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { money } from '../../lib/settings';
import { TrendingUp, ShoppingCart, Users, Package, IndianRupee } from 'lucide-react';

type ChartType = 'revenue' | 'orders' | 'customers' | 'products' | 'profit';
type Range = '7d' | '30d' | '90d' | '1y' | 'custom';

interface AnalyticsData { labels: string[]; data: number[]; chart: ChartType; range: Range; start_date: string; end_date: string; }

const CHARTS: { value: ChartType; label: string; Icon: React.FC<{size:number}> }[] = [
  { value: 'revenue', label: 'Revenue', Icon: IndianRupee },
  { value: 'profit', label: 'Profit', Icon: TrendingUp },
  { value: 'orders', label: 'Orders', Icon: ShoppingCart },
  { value: 'customers', label: 'Customers', Icon: Users },
  { value: 'products', label: 'Top Products', Icon: Package },
];

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'custom', label: 'Custom' },
];

export default function AdminAnalytics() {
  const [chart, setChart] = useState<ChartType>('revenue');
  const [range, setRange] = useState<Range>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { chart, range };
    if (range === 'custom' && start && end) { params.start_date = start; params.end_date = end; }
    adminApi.get('/analytics.php', { params }).then(({ data }) => setResult(data)).finally(() => setLoading(false));
  };

  useEffect(load, [chart, range]);

  const maxVal = result ? Math.max(...result.data, 1) : 1;
  const total = result?.data.reduce((a, b) => a + b, 0) ?? 0;
  const avg = result && result.data.length > 0 ? total / result.data.length : 0;
  const isMonetary = chart === 'revenue' || chart === 'profit';
  const isBar = chart !== 'products';

  const formatLabel = (s: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    return s;
  };

  return (
    <AdminLayout title="Analytics">
      {/* Chart selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CHARTS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setChart(value)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${chart === value ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Range selector */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1">
          {RANGES.map(({ value, label }) => (
            <button key={value} onClick={() => setRange(value)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${range === value ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <>
            <div><label className="label">From</label><input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><label className="label">To</label><input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
            <button className="btn-primary btn-sm" onClick={load}>Apply</button>
          </>
        )}
      </div>

      {/* Summary cards */}
      {result && !loading && chart !== 'products' && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="card p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Total</p>
            <p className="mt-1 text-2xl font-extrabold text-neutral-900">{isMonetary ? money(total) : total.toLocaleString('en-IN')}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Daily Avg</p>
            <p className="mt-1 text-2xl font-extrabold text-neutral-900">{isMonetary ? money(avg) : avg.toFixed(1)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Data Points</p>
            <p className="mt-1 text-2xl font-extrabold text-neutral-900">{result.data.length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card skeleton h-72" />
      ) : !result || result.data.length === 0 ? (
        <div className="card p-12 text-center text-neutral-400">No data for selected range</div>
      ) : isBar ? (
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-neutral-900 capitalize">{chart} — {result.start_date} to {result.end_date}</h2>
          {/* Bar chart */}
          <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ height: 220 }}>
            {result.labels.map((label, i) => {
              const val = result.data[i] ?? 0;
              const pct = (val / maxVal) * 170 + 4;
              return (
                <div key={i} className="flex min-w-[20px] max-w-[48px] flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-amber-400 transition-all duration-500 hover:opacity-80"
                    style={{ height: `${pct}px` }}
                    title={isMonetary ? money(val) : String(val)}
                  />
                  <span className="w-full truncate text-center text-[9px] text-neutral-400">{formatLabel(label)}</span>
                </div>
              );
            })}
          </div>
          {/* Data table (last 10) */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-100">
                <tr>
                  <th className="pb-2 text-left text-xs font-semibold text-neutral-500">Period</th>
                  <th className="pb-2 text-right text-xs font-semibold text-neutral-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {result.labels.slice(-15).map((label, i) => {
                  const realIdx = result.labels.length - Math.min(15, result.labels.length) + i;
                  return (
                    <tr key={i} className="border-b border-neutral-50 last:border-0">
                      <td className="py-1.5 text-neutral-700">{formatLabel(label)}</td>
                      <td className="py-1.5 text-right font-semibold text-neutral-900">
                        {isMonetary ? money(result.data[realIdx] ?? 0) : (result.data[realIdx] ?? 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Products — horizontal bars */
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-neutral-900">Top Products</h2>
          <div className="space-y-3">
            {result.labels.map((label, i) => {
              const val = result.data[i] ?? 0;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-800 truncate max-w-[180px]">{label}</span>
                    <span className="font-semibold text-neutral-900">{val} sold</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-amber-400 transition-all duration-500" style={{ width: `${(val / maxVal) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

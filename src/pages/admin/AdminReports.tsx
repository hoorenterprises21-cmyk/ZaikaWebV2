import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { money } from '../../lib/settings';
import { TrendingUp, ShoppingCart, Package, IndianRupee, Download } from 'lucide-react';

type ReportType = 'revenue' | 'orders' | 'products' | 'profit';
type GroupBy = 'day' | 'week' | 'month';

interface ReportRow { period?: string; total?: number; order_count?: number; revenue?: number; name?: string; units_sold?: number; delivered?: number; cancelled?: number; count?: number; [k: string]: unknown }

export default function AdminReports() {
  const [type, setType] = useState<ReportType>('revenue');
  const [group, setGroup] = useState<GroupBy>('day');
  const [start, setStart] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState({ total_revenue: 0, total_orders: 0 });
  const [loading, setLoading] = useState(false);

  const apiBase = '/reports.php';

  const load = () => {
    setLoading(true);
    adminApi.get(apiBase, { params: { type, group_by: group, start_date: start, end_date: end } })
      .then(({ data: d }) => { setData(d.data ?? []); setSummary(d.summary ?? {}); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [type, group, start, end]);

  const exportCsv = () => {
    const url = `/api/v1${apiBase}?type=${type}&group_by=${group}&start_date=${start}&end_date=${end}&csv=1`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${type}_${start}_${end}.csv`;
    const t = adminApi.defaults.headers?.Authorization as string ?? '';
    // Open with auth header is tricky via <a>; use fetch+blob for correct auth
    adminApi.get(apiBase, { params: { type, group_by: group, start_date: start, end_date: end, csv: 1 }, responseType: 'blob' }).then(({ data: blob }) => {
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      a.href = blobUrl;
      a.click();
      URL.revokeObjectURL(blobUrl);
    }).catch(() => { toast && (window.location.href = url); });
  };

  const maxVal = Math.max(...data.map(r => Number(r.total ?? r.revenue ?? r.units_sold ?? 0)), 1);

  const TYPES: { value: ReportType; label: string; Icon: React.FC<{size: number}> }[] = [
    { value: 'revenue', label: 'Revenue', Icon: IndianRupee },
    { value: 'orders', label: 'Orders', Icon: ShoppingCart },
    { value: 'profit', label: 'Profit', Icon: TrendingUp },
    { value: 'products', label: 'Top Products', Icon: Package },
  ];

  const valFor = (row: ReportRow): number => {
    if (type === 'orders') return Number(row.total ?? 0);
    return Number(row.total ?? row.revenue ?? 0);
  };

  return (
    <AdminLayout title="Reports">
      {/* Controls */}
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Report Type</label>
          <div className="flex flex-wrap gap-1">
            {TYPES.map(({ value, label }) => (
              <button key={value} onClick={() => setType(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${type === value ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {type !== 'products' && (
          <div>
            <label className="label">Group By</label>
            <select className="input" value={group} onChange={e => setGroup(e.target.value as GroupBy)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        )}
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
        <button className="btn-primary" onClick={load}>Apply</button>
        <button className="btn-secondary" onClick={exportCsv} title="Export CSV"><Download size={14} /> Export CSV</button>
      </div>

      {/* Summary */}
      {type !== 'products' && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="card flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-green-50 text-green-600"><IndianRupee size={20} /></div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">Total {type === 'profit' ? 'Profit (est.)' : 'Revenue'}</div>
              <div className="text-2xl font-extrabold text-neutral-900">{money(summary.total_revenue)}</div>
            </div>
          </div>
          <div className="card flex items-center gap-4 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><ShoppingCart size={20} /></div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">Total Orders</div>
              <div className="text-2xl font-extrabold text-neutral-900">{summary.total_orders}</div>
            </div>
          </div>
        </div>
      )}

      {type === 'profit' && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Profit is estimated as <strong>revenue minus 40% food COGS</strong>. Link your inventory items to products for exact margin data.
        </div>
      )}

      {loading ? (
        <div className="card skeleton h-64" />
      ) : type === 'products' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Product</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Units Sold</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-neutral-400">No data</td></tr>}
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-semibold text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{String(row.name)}</td>
                  <td className="px-4 py-3 text-right text-neutral-700">{row.units_sold}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900">{money(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-5">
          <h2 className="mb-4 font-bold text-neutral-900 capitalize">{type === 'profit' ? 'Estimated Profit' : type} over time</h2>
          {data.length === 0 ? (
            <p className="py-10 text-center text-neutral-400">No data for selected range</p>
          ) : (
            <>
              <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ height: 180 }}>
                {data.map((row, i) => {
                  const val = valFor(row);
                  return (
                    <div key={i} className="flex flex-1 min-w-[20px] flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-gradient-to-t from-brand-500 to-amber-400 transition-all hover:opacity-80"
                        style={{ height: `${(val / maxVal) * 140 + 4}px` }}
                        title={type === 'orders' ? String(val) : money(val)} />
                      <span className="text-[9px] text-neutral-400 truncate w-full text-center">{String(row.period ?? '')}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-100">
                    <tr>
                      <th className="pb-2 text-left font-semibold text-neutral-500">Period</th>
                      <th className="pb-2 text-right font-semibold text-neutral-500">{type === 'profit' ? 'Est. Profit' : type === 'orders' ? 'Total' : 'Revenue'}</th>
                      {type === 'revenue' && <th className="pb-2 text-right font-semibold text-neutral-500">Orders</th>}
                      {type === 'orders' && <th className="pb-2 text-right font-semibold text-neutral-500">Delivered</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {data.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 text-neutral-700">{String(row.period ?? '')}</td>
                        <td className="py-2 text-right font-semibold text-neutral-900">
                          {type === 'orders' ? String(row.total ?? 0) : money(row.total ?? row.revenue ?? 0)}
                        </td>
                        {type === 'revenue' && <td className="py-2 text-right text-neutral-500">{row.order_count}</td>}
                        {type === 'orders' && <td className="py-2 text-right text-green-600">{row.delivered ?? 0}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

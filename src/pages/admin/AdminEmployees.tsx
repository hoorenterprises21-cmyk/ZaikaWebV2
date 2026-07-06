import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import AdminLayout from './AdminLayout';
import { Employee, AttendanceRecord, LeaveRequest } from '../../types';
import { Plus, CreditCard as Edit2, Trash2, UserCheck, UserX, Calendar, ClipboardList } from 'lucide-react';
import { useToast } from '../../components/Toast';

const ROLES = ['chef', 'delivery', 'manager', 'waiter', 'cashier', 'other'];
type Tab = 'employees' | 'attendance' | 'leave';
const blank = (): Partial<Employee> => ({ name: '', email: '', phone: '', role: 'other', salary: 0, joining_date: '', is_active: 1 });

export default function AdminEmployees() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('employees');

  // Employees
  const [items, setItems] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [form, setForm] = useState<Partial<Employee>>(blank());
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Attendance
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attForm, setAttForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0, 10), status: 'present', check_in: '', check_out: '' });
  const [attEditing, setAttEditing] = useState<number | null>(null);

  // Leave
  const [leaveList, setLeaveList] = useState<LeaveRequest[]>([]);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employee_id: '', start_date: '', end_date: '', reason: '' });

  const loadEmployees = () => {
    setLoadingEmp(true);
    adminApi.get('/employees.php?per_page=100').then(({ data }) => {
      setItems(data.data ?? []); setTotal(data.total ?? 0);
    }).finally(() => setLoadingEmp(false));
  };

  const loadAttendance = () => {
    setLoadingAtt(true);
    adminApi.get(`/attendance.php?month=${month}`).then(({ data }) => setAttRecords(data.records ?? [])).finally(() => setLoadingAtt(false));
  };

  const loadLeave = () => {
    setLoadingLeave(true);
    adminApi.get('/leave.php?per_page=50').then(({ data }) => setLeaveList(data.data ?? [])).finally(() => setLoadingLeave(false));
  };

  useEffect(loadEmployees, []);
  useEffect(() => { if (tab === 'attendance') loadAttendance(); }, [tab, month]);
  useEffect(() => { if (tab === 'leave') loadLeave(); }, [tab]);

  // Employee CRUD
  const saveEmployee = async () => {
    try {
      if (editing) await adminApi.patch('/employees.php', { ...form, id: editing });
      else await adminApi.post('/employees.php', form);
      toast(editing ? 'Updated' : 'Added', 'success');
      setShowForm(false); setEditing(null); setForm(blank()); loadEmployees();
    } catch { toast('Failed to save', 'error'); }
  };

  const delEmployee = async (id: number) => {
    if (!confirm('Delete this employee?')) return;
    await adminApi.delete('/employees.php', { data: { id } });
    loadEmployees();
  };

  const toggleActive = async (emp: Employee) => {
    await adminApi.patch('/employees.php', { id: emp.id, is_active: emp.is_active ? 0 : 1 });
    loadEmployees();
  };

  // Attendance CRUD
  const saveAttendance = async () => {
    if (!attForm.employee_id || !attForm.date) { toast('Employee and date required', 'error'); return; }
    try {
      if (attEditing) await adminApi.patch('/attendance.php', { id: attEditing, status: attForm.status, check_in: attForm.check_in, check_out: attForm.check_out });
      else await adminApi.post('/attendance.php', attForm);
      toast('Saved', 'success');
      setAttEditing(null);
      setAttForm({ employee_id: '', date: new Date().toISOString().slice(0, 10), status: 'present', check_in: '', check_out: '' });
      loadAttendance();
    } catch (e: any) { toast(e?.response?.data?.message || 'Failed', 'error'); }
  };

  // Leave
  const submitLeave = async () => {
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) { toast('Fill all fields', 'error'); return; }
    try {
      await adminApi.post('/leave.php', leaveForm);
      toast('Leave request created', 'success');
      setLeaveForm({ employee_id: '', start_date: '', end_date: '', reason: '' });
      loadLeave();
    } catch { toast('Failed', 'error'); }
  };

  const updateLeaveStatus = async (id: number, status: string) => {
    await adminApi.patch('/leave.php', { id, status });
    toast(`Leave ${status}`, 'success');
    loadLeave();
  };

  return (
    <AdminLayout title="Employees">
      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {(['employees', 'attendance', 'leave'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-brand-500 text-brand-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {t === 'employees' && <UserCheck size={14} />}
            {t === 'attendance' && <Calendar size={14} />}
            {t === 'leave' && <ClipboardList size={14} />}
            {t}
          </button>
        ))}
      </div>

      {/* ===== EMPLOYEES TAB ===== */}
      {tab === 'employees' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-neutral-500">{total} employee{total !== 1 ? 's' : ''}</span>
            <button className="btn-primary btn-sm" onClick={() => { setForm(blank()); setEditing(null); setShowForm(true); }}>
              <Plus size={14} /> Add Employee
            </button>
          </div>

          {showForm && (
            <div className="card mb-4 p-5">
              <h3 className="mb-4 font-bold text-neutral-900">{editing ? 'Edit' : 'New'} Employee</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Name *</label><input className="input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role ?? 'other'} onChange={e => setForm(f => ({ ...f, role: e.target.value as Employee['role'] }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="label">Email</label><input className="input" type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Salary (₹)</label><input className="input" type="number" min={0} value={form.salary ?? 0} onChange={e => setForm(f => ({ ...f, salary: parseFloat(e.target.value) }))} /></div>
                <div><label className="label">Joining Date</label><input className="input" type="date" value={form.joining_date ?? ''} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} /></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn-primary" onClick={saveEmployee}>Save</button>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {loadingEmp ? <div className="card skeleton h-48" /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Role</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Phone</th>
                    <th className="hidden px-4 py-3 text-right font-semibold text-neutral-600 md:table-cell">Salary</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-neutral-400">No employees yet</td></tr>}
                  {items.map(emp => (
                    <tr key={emp.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{emp.name}</td>
                      <td className="px-4 py-3 capitalize text-neutral-600">{emp.role}</td>
                      <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell">{emp.phone ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-right text-neutral-700 md:table-cell">₹{Number(emp.salary).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost btn-sm" onClick={() => { setForm(emp); setEditing(emp.id); setShowForm(true); }}><Edit2 size={13} /></button>
                          <button className="btn-ghost btn-sm" onClick={() => toggleActive(emp)}>
                            {emp.is_active ? <UserX size={13} className="text-amber-500" /> : <UserCheck size={13} className="text-green-500" />}
                          </button>
                          <button className="btn-ghost btn-sm text-red-500" onClick={() => delEmployee(emp.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===== ATTENDANCE TAB ===== */}
      {tab === 'attendance' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="label mb-0">Month:</label>
              <input className="input w-36 py-1.5" type="month" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
          </div>

          {/* Quick add attendance */}
          <div className="card mb-4 p-4">
            <h3 className="mb-3 font-semibold text-neutral-900">Record Attendance</h3>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
              <div>
                <label className="label">Employee</label>
                <select className="input" value={attForm.employee_id} onChange={e => setAttForm(f => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {items.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={attForm.date} onChange={e => setAttForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={attForm.status} onChange={e => setAttForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="leave">Leave</option>
                </select>
              </div>
              <div>
                <label className="label">Check In</label>
                <input className="input" type="time" value={attForm.check_in} onChange={e => setAttForm(f => ({ ...f, check_in: e.target.value }))} />
              </div>
              <div>
                <label className="label">Check Out</label>
                <input className="input" type="time" value={attForm.check_out} onChange={e => setAttForm(f => ({ ...f, check_out: e.target.value }))} />
              </div>
            </div>
            <button className="btn-primary btn-sm mt-3" onClick={saveAttendance}>{attEditing ? 'Update' : 'Add Record'}</button>
          </div>

          {loadingAtt ? <div className="card skeleton h-48" /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Date</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">In / Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {attRecords.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-neutral-400">No attendance records for {month}</td></tr>}
                  {attRecords.map(r => {
                    const cls = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', half_day: 'bg-amber-100 text-amber-700', leave: 'bg-blue-100 text-blue-700' }[r.status] ?? 'bg-neutral-100 text-neutral-600';
                    return (
                      <tr key={r.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">{r.employee_name}</td>
                        <td className="px-4 py-3 text-neutral-700">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>{r.status.replace('_', ' ')}</span></td>
                        <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell">{r.check_in || '—'} / {r.check_out || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===== LEAVE TAB ===== */}
      {tab === 'leave' && (
        <>
          <div className="card mb-4 p-4">
            <h3 className="mb-3 font-semibold text-neutral-900">Create Leave Request</h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="label">Employee</label>
                <select className="input" value={leaveForm.employee_id} onChange={e => setLeaveForm(f => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {items.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Start Date</label>
                <input className="input" type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input className="input" type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Reason</label>
                <input className="input" value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <button className="btn-primary btn-sm mt-3" onClick={submitLeave}>Submit</button>
          </div>

          {loadingLeave ? <div className="card skeleton h-48" /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Dates</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 sm:table-cell">Reason</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {leaveList.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-neutral-400">No leave requests</td></tr>}
                  {leaveList.map(l => {
                    const cls = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }[l.status] ?? '';
                    return (
                      <tr key={l.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-900">{l.employee_name}</td>
                        <td className="px-4 py-3 text-neutral-700">{l.start_date} → {l.end_date}</td>
                        <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell">{l.reason || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {l.status === 'pending' && (
                            <div className="flex justify-end gap-1">
                              <button className="btn-ghost btn-sm text-green-600" onClick={() => updateLeaveStatus(l.id, 'approved')}>Approve</button>
                              <button className="btn-ghost btn-sm text-red-500" onClick={() => updateLeaveStatus(l.id, 'rejected')}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

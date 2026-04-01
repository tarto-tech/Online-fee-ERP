import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { dashboardAPI, coursesAPI } from '../../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

export default function DashboardPage() {
  const [filters, setFilters] = useState({ academicYear: '', course: '', year: '' });
  const [showDefaulters, setShowDefaulters] = useState(false);
  const [studentDetailsModal, setStudentDetailsModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', filters],
    queryFn: () => dashboardAPI.getStats(filters),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll(),
    staleTime: 60000,
  });

  const stats = data?.data;
  const courses = coursesData?.data?.courses || [];
  const academicYears = stats?.academicYears || [];

  const barData = {
    labels: stats?.collectionByCourse?.map((c) => c.courseName) || [],
    datasets: [{
      label: 'Collection (₹)',
      data: stats?.collectionByCourse?.map((c) => c.totalCollection) || [],
      backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const doughnutData = {
    labels: ['Paid', 'Pending', 'Failed'],
    datasets: [{
      data: [
        stats?.paymentsByStatus?.paid?.count || 0,
        stats?.paymentsByStatus?.pending?.count || 0,
        stats?.paymentsByStatus?.failed?.count || 0,
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  const statCards = [
    { label: 'Total Students', value: isLoading ? '...' : stats?.totalStudents || 0, icon: '👥', color: 'blue', sub: 'Enrolled students' },
    { label: 'Total Collection', value: isLoading ? '...' : fmt(stats?.totalCollection), icon: '💰', color: 'green', sub: `Expected ${fmt(stats?.totalExpected)}` },
    { label: 'Pending Amount', value: isLoading ? '...' : fmt(stats?.pendingCollection), icon: '⏳', color: 'yellow', sub: `Waivers: ${fmt(stats?.totalWaivers)}` },
    { label: 'Students Paid', value: isLoading ? '...' : stats?.paymentsByStatus?.paid?.count || 0, icon: '✅', color: 'purple', sub: `${stats?.paymentsByStatus?.pending?.count || 0} yet to pay` },
  ];

  const defaulters = stats?.defaulters || [];
  const yearBreakdown = stats?.yearBreakdown || [];
  const yearDetailedBreakdown = stats?.yearDetailedBreakdown || {};
  const detailedYears = Object.keys(yearDetailedBreakdown).sort((a, b) => b.localeCompare(a));

  const showStudentDetails = (item) => {
    setStudentDetailsModal(item);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Fee collection overview — Kalpataru First Grade Science College</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <select className="form-control" value={filters.academicYear}
          onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}>
          <option value="">All Academic Years</option>
          {academicYears.map((ay) => <option key={ay} value={ay}>{ay}</option>)}
        </select>
        <select className="form-control" value={filters.course}
          onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}>
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="form-control" value={filters.year}
          onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}>
          <option value="">All Years</option>
          {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        {(filters.academicYear || filters.course || filters.year) && (
          <button className="btn btn-outline" onClick={() => setFilters({ academicYear: '', course: '', year: '' })}>✕ Clear</button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Academic Year Breakdown Table */}
      {yearBreakdown.length > 0 && (
        <div className="table-wrapper" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">📊 Fee Collection by Academic Year (All Years)</span>
            <span className="badge badge-primary">{yearBreakdown.length} year{yearBreakdown.length > 1 ? 's' : ''}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Students</th>
                  <th>Total Fee</th>
                  <th>Waiver</th>
                  <th>Collected</th>
                  <th>Pending</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {yearBreakdown.map((row) => {
                  const pct = row.totalFee > 0 ? Math.round((row.collected / row.totalFee) * 100) : 0;
                  return (
                    <tr key={row.academicYear}>
                      <td>
                        <span className="badge badge-primary">{row.academicYear}</span>
                        {row.isHistorical && <span style={{ marginLeft: 6, fontSize: 11, color: '#6b7280' }}>📚 Historical</span>}
                      </td>
                      <td>{row.students || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(row.totalFee)}</td>
                      <td style={{ color: '#16a34a' }}>{row.waiver > 0 ? fmt(row.waiver) : '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(row.collected)}</td>
                      <td style={{ fontWeight: 700, color: row.pending > 0 ? '#f59e0b' : 'var(--success)' }}>{fmt(row.pending)}</td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#4f46e5', height: '100%', borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#f9fafb', fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                  <td colSpan={2}>TOTAL (All Years)</td>
                  <td>{fmt(yearBreakdown.reduce((s, r) => s + r.totalFee, 0))}</td>
                  <td style={{ color: '#16a34a' }}>{fmt(yearBreakdown.reduce((s, r) => s + (r.waiver || 0), 0))}</td>
                  <td style={{ color: 'var(--success)' }}>{fmt(yearBreakdown.reduce((s, r) => s + r.collected, 0))}</td>
                  <td style={{ color: '#f59e0b' }}>{fmt(yearBreakdown.reduce((s, r) => s + r.pending, 0))}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Academic Year Detailed Breakdown */}
      {detailedYears.length > 0 && (
        <div className="table-wrapper" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">📚 Academic Year-wise Detailed Fee Collection</span>
            <span className="badge badge-success">{detailedYears.length} year{detailedYears.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ padding: '16px' }}>
            {detailedYears.map((ay) => {
              const yearData = yearDetailedBreakdown[ay];
              const yearTotal = yearData.reduce((sum, item) => sum + item.totalFee, 0);
              const yearCollected = yearData.reduce((sum, item) => sum + item.collected, 0);
              const yearPending = yearData.reduce((sum, item) => sum + item.pending, 0);
              const yearWaiver = yearData.reduce((sum, item) => sum + item.waiver, 0);
              const yearProgress = yearTotal > 0 ? Math.round((yearCollected / yearTotal) * 100) : 0;

              return (
                <div key={ay} style={{ marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Year Header */}
                  <div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <span className="badge badge-primary" style={{ fontSize: 14, padding: '6px 12px' }}>{ay}</span>
                        {yearData[0]?.isHistorical && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>📚 Historical Data</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Total: </span>
                          <span style={{ fontWeight: 700 }}>{fmt(yearTotal)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Collected: </span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{fmt(yearCollected)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Pending: </span>
                          <span style={{ fontWeight: 700, color: '#f59e0b' }}>{fmt(yearPending)}</span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Progress: </span>
                          <span style={{ fontWeight: 700, color: yearProgress === 100 ? '#10b981' : '#4f46e5' }}>{yearProgress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course/Year Breakdown */}
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th>Course</th>
                          <th>Year</th>
                          <th>Students</th>
                          <th>Total Fee</th>
                          <th>Waiver</th>
                          <th>Collected</th>
                          <th>Pending</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearData.map((item, idx) => {
                          const pct = item.totalFee > 0 ? Math.round((item.collected / item.totalFee) * 100) : 0;
                          return (
                            <tr key={idx}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{item.courseName}</div>
                                {item.courseCode && <div className="text-xs text-muted">{item.courseCode}</div>}
                              </td>
                              <td><span className="badge badge-primary">Year {item.year}</span></td>
                              <td>{item.students?.length || 0}</td>
                              <td style={{ fontWeight: 600 }}>{fmt(item.totalFee)}</td>
                              <td style={{ color: '#16a34a' }}>{item.waiver > 0 ? fmt(item.waiver) : '—'}</td>
                              <td style={{ fontWeight: 700, color: '#10b981' }}>{fmt(item.collected)}</td>
                              <td style={{ fontWeight: 700, color: item.pending > 0 ? '#f59e0b' : '#10b981' }}>{fmt(item.pending)}</td>
                              <td style={{ minWidth: 100 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#4f46e5', height: '100%', borderRadius: 4 }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 28 }}>{pct}%</span>
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => showStudentDetails(item)}
                                  style={{ padding: '4px 10px', fontSize: 12 }}
                                >
                                  👥 View Students
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-charts">
        <div className="chart-card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Collection by Course</div>
          {stats?.collectionByCourse?.length ? (
            <Bar data={barData} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
              },
            }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payment data yet</div>
          )}
        </div>
        <div className="chart-card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Payment Status (Students)</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
            <div style={{ maxWidth: 180 }}>
              <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '70%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Fully Paid', color: '#10b981', count: stats?.paymentsByStatus?.paid?.count || 0 },
                { label: 'Pending', color: '#f59e0b', count: stats?.paymentsByStatus?.pending?.count || 0 },
                { label: 'Failed Txns', color: '#ef4444', count: stats?.paymentsByStatus?.failed?.count || 0 },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, marginLeft: 4 }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Defaulters Section */}
      <div className="table-wrapper" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-title">🚨 Fee Defaulters</span>
            {defaulters.length > 0 && (
              <span className="badge badge-danger">{defaulters.length} students</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {defaulters.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowDefaulters(!showDefaulters)}>
                {showDefaulters ? 'Hide' : 'Show'} List
              </button>
            )}
            {defaulters.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => exportDefaultersCSV(defaulters)}>
                ⬇ Export CSV
              </button>
            )}
          </div>
        </div>
        {defaulters.length === 0 ? (
          <div className="table-empty">🎉 No defaulters — all students have paid!</div>
        ) : showDefaulters ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course / Year</th>
                  <th>Academic Year</th>
                  <th>Total Fee</th>
                  <th>Waiver</th>
                  <th>Paid</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div className="text-xs text-muted">{d.usn || d.studentId}</div>
                      <div className="text-xs text-muted">{d.mobile}</div>
                    </td>
                    <td>
                      <div>{d.courseName}</div>
                      <div className="text-xs text-muted">Year {d.currentYear}</div>
                    </td>
                    <td><span className="badge badge-warning">{d.academicYear}</span></td>
                    <td className="text-secondary">{fmt(d.totalFee)}</td>
                    <td style={{ color: '#16a34a' }}>{d.waiver > 0 ? `- ${fmt(d.waiver)}` : '—'}</td>
                    <td style={{ color: 'var(--success)' }}>{fmt(d.paid)}</td>
                    <td style={{ fontWeight: 700, color: '#dc2626' }}>{fmt(d.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
            {defaulters.length} student{defaulters.length > 1 ? 's have' : ' has'} pending fees totalling <strong>{fmt(defaulters.reduce((s, d) => s + d.pending, 0))}</strong>.
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={() => setShowDefaulters(true)}>View List</button>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="table-wrapper">
        <div className="card-header">
          <span className="card-title">Recent Payments</span>
          <span className="badge badge-primary">{stats?.recentPayments?.length || 0} records</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Student</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!stats?.recentPayments?.length ? (
                <tr><td colSpan={6} className="table-empty">No recent payments</td></tr>
              ) : stats.recentPayments.map((p) => (
                <tr key={p._id}>
                  <td className="text-mono">{p.receiptNumber}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.student?.name}</div>
                    <div className="text-xs text-muted">{p.student?.studentId}</div>
                  </td>
                  <td className="text-secondary">{p.feeSnapshot?.courseName}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amountInRupees)}</td>
                  <td className="text-secondary">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td><span className="badge badge-success">Paid</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Modal */}
      {studentDetailsModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setStudentDetailsModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">
                👥 Students - {studentDetailsModal.courseName} Year {studentDetailsModal.year} ({studentDetailsModal.academicYear})
              </span>
              <button className="modal-close" onClick={() => setStudentDetailsModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Students</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{studentDetailsModal.students?.length || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Fee</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(studentDetailsModal.totalFee)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Collected</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{fmt(studentDetailsModal.collected)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Pending</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{fmt(studentDetailsModal.pending)}</div>
                </div>
              </div>

              <div className="table-scroll" style={{ maxHeight: 400 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Total Fee</th>
                      <th>Waiver</th>
                      <th>Paid</th>
                      <th>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentDetailsModal.students?.length === 0 ? (
                      <tr><td colSpan={6} className="table-empty">No students found</td></tr>
                    ) : studentDetailsModal.students?.map((s, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div className="text-xs text-muted">{s.usn || s.studentId}</div>
                        </td>
                        <td>{fmt(s.totalFee)}</td>
                        <td style={{ color: '#16a34a' }}>{s.waiver > 0 ? fmt(s.waiver) : '—'}</td>
                        <td style={{ fontWeight: 600, color: '#10b981' }}>{fmt(s.paid)}</td>
                        <td style={{ fontWeight: 700, color: s.pending > 0 ? '#f59e0b' : '#10b981' }}>{fmt(s.pending)}</td>
                        <td>
                          {s.pending === 0 ? (
                            <span className="badge badge-success">✅ Paid</span>
                          ) : (
                            <span className="badge badge-warning">⏳ Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => exportStudentListCSV(studentDetailsModal)}>
                ⬇ Export CSV
              </button>
              <button className="btn btn-primary" onClick={() => setStudentDetailsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function exportDefaultersCSV(defaulters) {
  const headers = ['Name', 'Student ID', 'USN', 'Mobile', 'Course', 'Year', 'Academic Year', 'Total Fee', 'Waiver', 'Paid', 'Pending'];
  const rows = defaulters.map((d) => [
    d.name, d.studentId, d.usn || '', d.mobile, d.courseName,
    `Year ${d.currentYear}`, d.academicYear,
    d.totalFee, d.waiver, d.paid, d.pending,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `defaulters-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportStudentListCSV(data) {
  const headers = ['Name', 'Student ID', 'USN', 'Total Fee', 'Waiver', 'Paid', 'Pending', 'Status'];
  const rows = data.students.map((s) => [
    s.name,
    s.studentId,
    s.usn || '',
    s.totalFee,
    s.waiver,
    s.paid,
    s.pending,
    s.pending === 0 ? 'Paid' : 'Pending',
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students-${data.courseName}-Year${data.year}-${data.academicYear}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

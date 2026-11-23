import { useEffect, useState } from 'react';
import api from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, Building2, CalendarDays, Clock } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/room-utilization'),
    ]).then(([oRes, uRes]) => {
      setData(oRes.data);
      setUtilization(uRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!data) return null;

  const statusData = [
    { name: 'Approved', value: data.stats.approved, color: '#10b981' },
    { name: 'Pending',  value: data.stats.pending,  color: '#f59e0b' },
    { name: 'Rejected', value: data.stats.rejected,  color: '#ef4444' },
    { name: 'Cancelled',value: data.stats.cancelled, color: '#9ca3af' },
  ].filter(d => d.value > 0);

  const busiestDaysData = data.busiestDays.map(d => ({
    day: DAY_NAMES[parseInt(d.day_num)],
    bookings: d.count
  }));

  const monthlyData = data.monthlyTrend.map(m => ({
    month: m.month,
    bookings: m.count,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="text-sm text-gray-500">Usage patterns and booking statistics</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Active Rooms" value={data.totalRooms} color="bg-blue-100 text-blue-600" />
        <StatCard icon={CalendarDays} label="Total Bookings" value={data.totalBookings} color="bg-green-100 text-green-600" />
        <StatCard icon={Clock} label="Pending Approvals" value={data.pendingApprovals} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Booking status pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Booking Status Breakdown</h3>
          {statusData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No booking data yet</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Busiest days */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Bookings by Day of Week</h3>
          {busiestDaysData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={busiestDaysData} margin={{ left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Booking Trend</h3>
          {monthlyData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={monthlyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top rooms */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Most Booked Rooms</h3>
          <div className="space-y-3">
            {data.topRooms.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-800">{r.name}</span>
                    <span className="text-gray-500">{r.booking_count} bookings</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${data.topRooms[0].booking_count > 0 ? (r.booking_count / data.topRooms[0].booking_count) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room utilization table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Room Utilization Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Room', 'Type', 'Capacity', 'Total Bookings', 'Avg Duration'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {utilization.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{r.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500">{r.capacity}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${r.total_bookings === 0 ? 'text-gray-300' : 'text-blue-600'}`}>
                      {r.total_bookings}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.avg_duration_hours ? `${r.avg_duration_hours}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

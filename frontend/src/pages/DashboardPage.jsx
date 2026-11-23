import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import { Building2, CalendarDays, Clock, CheckSquare, Plus, ArrowRight, TrendingUp, Users } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
      {to && <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/bookings?my=1'),
      api.get('/rooms'),
      (['incharge','admin'].includes(user.role)) ? api.get('/bookings?status=pending') : Promise.resolve({ data: [] }),
    ]).then(([bRes, rRes, pRes]) => {
      setBookings(bRes.data.slice(0, 5));
      setRooms(rRes.data.slice(0, 6));
      setPendingCount(pRes.data.length || 0);
    }).finally(() => setLoading(false));
  }, [user.role]);

  const upcoming = bookings.filter(b => b.status === 'approved' && new Date(b.date) >= new Date());
  const myPending = bookings.filter(b => b.status === 'pending').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
        <p className="text-blue-100 mt-1">Manage your room bookings and check availability.</p>
        <button
          onClick={() => navigate('/bookings/new')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Book a Room
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Available Rooms" value={rooms.length}
          color="bg-blue-100 text-blue-600" to="/rooms" />
        <StatCard icon={CalendarDays} label="My Bookings" value={bookings.length}
          color="bg-green-100 text-green-600" to="/bookings" />
        <StatCard icon={Clock} label="Pending Mine" value={myPending}
          color="bg-yellow-100 text-yellow-600" to="/bookings" />
        {(['incharge','admin'].includes(user.role)) && (
          <StatCard icon={CheckSquare} label="Need Approval" value={pendingCount}
            color="bg-red-100 text-red-600" to="/approvals" />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">My Recent Bookings</h2>
            <Link to="/bookings" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bookings yet</p>
              <button onClick={() => navigate('/bookings/new')}
                className="mt-2 text-sm text-blue-600 hover:underline">Make your first booking</button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {bookings.map(b => (
                <li key={b.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{b.title}</div>
                    <div className="text-xs text-gray-500">{b.room_name} · {b.date} {b.start_time}–{b.end_time}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rooms grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Available Rooms</h2>
            <Link to="/rooms" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {rooms.map(r => (
              <Link key={r.id} to={`/rooms/${r.id}`}
                className="p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700 leading-tight">{r.name}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" /> {r.capacity}
                  {r.needs_approval ? <span className="ml-1 text-orange-500">· approval needed</span> : ''}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, X } from 'lucide-react';

export default function BookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = () => {
    setLoading(true);
    const params = statusFilter !== 'all' ? `?status=${statusFilter}&my=1` : '?my=1';
    api.get(`/bookings${params}`).then(r => setBookings(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const handleCancel = async id => {
    if (!confirm('Cancel this booking?')) return;
    setCancellingId(id);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const statuses = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500">{bookings.length} booking(s)</p>
        </div>
        <button onClick={() => navigate('/bookings/new')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
            ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No bookings found</p>
          <button onClick={() => navigate('/bookings/new')}
            className="mt-3 text-blue-600 text-sm hover:underline">Make a booking →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
              {/* Date pill */}
              <div className="text-center bg-blue-50 rounded-lg px-3 py-2 min-w-14">
                <div className="text-xs text-blue-500 font-medium uppercase">
                  {new Date(b.date).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="text-2xl font-bold text-blue-700 leading-none">
                  {new Date(b.date).getDate()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{b.title}</h3>
                    <p className="text-sm text-gray-500">{b.room_name} · {b.start_time}–{b.end_time}</p>
                    {b.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{b.description}</p>}
                    {b.reject_reason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {b.reject_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={b.status} />
                    {(b.status === 'pending' || b.status === 'approved') && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Cancel booking">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

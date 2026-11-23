import { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';

export default function ApprovalsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null); // bookingId
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);

  const fetchPending = () => {
    setLoading(true);
    api.get('/bookings?status=pending').then(r => setBookings(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async id => {
    setProcessing(id + '-approve');
    try {
      await api.patch(`/bookings/${id}/approve`);
      toast.success('Booking approved!');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    setProcessing(rejectModal + '-reject');
    try {
      await api.patch(`/bookings/${rejectModal}/reject`, { reason: rejectReason });
      toast.success('Booking rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-sm text-gray-500">Review and act on booking requests for your rooms</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-3" />
          <p className="text-gray-500 font-medium">All caught up! No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-amber-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending Approval</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{b.title}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> {b.room_name}
                    </span>
                    <span>📅 {new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span>🕐 {b.start_time} – {b.end_time}</span>
                    <span>👥 {b.attendees} attendees</span>
                  </div>
                  {b.description && (
                    <p className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{b.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Requested by <span className="font-medium text-gray-600">{b.requester_name}</span> ({b.requester_email})
                    · {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(b.id)}
                    disabled={!!processing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    {processing === b.id + '-approve' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setRejectModal(b.id); setRejectReason(''); }}
                    disabled={!!processing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors">
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 text-lg mb-3">Reject Booking</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason so the requester knows why their booking was rejected.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="e.g. Room already reserved for another event, please choose a different time…"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!!processing}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60">
                {processing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

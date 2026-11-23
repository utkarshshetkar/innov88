import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { ArrowLeft, Lightbulb, AlertTriangle } from 'lucide-react';

export default function NewBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clashError, setClashError] = useState('');
  const [suggestions, setSuggestions] = useState(null);

  const [form, setForm] = useState({
    room_id: searchParams.get('room') || '',
    title: '',
    description: '',
    date: searchParams.get('date') || '',
    start_time: '',
    end_time: '',
    attendees: 1,
  });

  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/rooms').then(r => {
      setRooms(r.data);
      if (form.room_id) {
        const rm = r.data.find(x => x.id === form.room_id);
        setSelectedRoom(rm || null);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleRoomChange = e => {
    const id = e.target.value;
    setForm(f => ({ ...f, room_id: id }));
    setSelectedRoom(rooms.find(r => r.id === id) || null);
    setClashError('');
    setSuggestions(null);
  };

  const fetchSuggestions = async () => {
    if (!form.room_id || !form.date || !form.start_time || !form.end_time) return;
    const startH = parseInt(form.start_time);
    const endH = parseInt(form.end_time);
    const duration = endH - startH || 1;
    try {
      const { data } = await api.get(`/analytics/suggest?room_id=${form.room_id}&date=${form.date}&duration=${duration}`);
      setSuggestions(data);
    } catch {}
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setClashError('');
    setSuggestions(null);
    setSubmitting(true);
    try {
      const { data } = await api.post('/bookings', form);
      toast.success(
        data.status === 'approved'
          ? `Booking confirmed for ${data.room_name}! ✅`
          : `Request submitted — awaiting approval by in-charge.`
      );
      navigate('/bookings');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create booking';
      setClashError(msg);
      toast.error(msg);
      // Auto-fetch suggestions on clash
      if (err.response?.status === 409) {
        fetchSuggestions();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Booking Request</h1>
          <p className="text-sm text-gray-500">Fill in the details to request a room</p>
        </div>
      </div>

      {clashError && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Booking Conflict Detected</p>
            <p className="text-sm text-red-600 mt-0.5">{clashError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Room */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room <span className="text-red-500">*</span></label>
          <select
            required value={form.room_id} onChange={handleRoomChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a room…</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} (cap: {r.capacity}){r.needs_approval ? ' — approval needed' : ''}
              </option>
            ))}
          </select>
          {selectedRoom && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="font-medium">{selectedRoom.name}</span> · Capacity: {selectedRoom.capacity} ·
              Facilities: {selectedRoom.facilities.join(', ')}
              {selectedRoom.needs_approval && <span className="text-orange-600 ml-2">· Requires approval</span>}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Title <span className="text-red-500">*</span></label>
          <input
            type="text" required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. ACM Tech Talk, Project Review"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Purpose, requirements, special arrangements…"
          />
        </div>

        {/* Date + Times */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date" required
              min={new Date().toISOString().split('T')[0]}
              value={form.date}
              onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setClashError(''); setSuggestions(null); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
            <input
              type="time" required
              value={form.start_time}
              onChange={e => { setForm(f => ({ ...f, start_time: e.target.value })); setClashError(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time <span className="text-red-500">*</span></label>
            <input
              type="time" required
              value={form.end_time}
              onChange={e => { setForm(f => ({ ...f, end_time: e.target.value })); setClashError(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Attendees */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendees <span className="text-red-500">*</span></label>
          <input
            type="number" required min="1"
            max={selectedRoom?.capacity || undefined}
            value={form.attendees}
            onChange={e => setForm(f => ({ ...f, attendees: parseInt(e.target.value) }))}
            className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedRoom && (
            <p className="text-xs text-gray-400 mt-1">Room capacity: {selectedRoom.capacity} people</p>
          )}
        </div>

        {/* Approval notice */}
        {selectedRoom?.needs_approval && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            ℹ️ This room requires approval from the in-charge. You will be notified once your request is reviewed.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm">
            {submitting ? 'Submitting…' : (selectedRoom?.needs_approval ? 'Submit for Approval' : 'Confirm Booking')}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {suggestions && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Suggested Alternatives</h3>
          </div>
          {suggestions.available_slots.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Free slots for the same room on {form.date}:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.available_slots.map(s => (
                  <button key={s.start_time}
                    onClick={() => setForm(f => ({ ...f, start_time: s.start_time, end_time: s.end_time }))}
                    className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg hover:bg-green-100 transition-colors">
                    {s.start_time} – {s.end_time}
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestions.alternative_rooms.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Alternative rooms available:</p>
              <div className="space-y-1">
                {suggestions.alternative_rooms.map(r => (
                  <button key={r.room_id}
                    onClick={() => { setForm(f => ({ ...f, room_id: r.room_id })); setSelectedRoom(rooms.find(x => x.id === r.room_id)); setClashError(''); setSuggestions(null); }}
                    className="w-full text-left px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors">
                    {r.room_name} · {r.type.replace('_', ' ')} · Capacity: {r.capacity}
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestions.available_slots.length === 0 && suggestions.alternative_rooms.length === 0 && (
            <p className="text-sm text-gray-500">No alternative slots or rooms found for this day. Try a different date.</p>
          )}
        </div>
      )}
    </div>
  );
}

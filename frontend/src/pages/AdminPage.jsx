import { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';

const ROOM_TYPES = ['lab', 'seminar_hall', 'auditorium', 'classroom'];
const FACILITIES_OPTIONS = ['projector', 'AC', 'mic', 'computers', 'whiteboard', 'oscilloscopes', 'multimeters', 'stage', 'chairs'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'addRoom' | 'timetable'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [roomForm, setRoomForm] = useState({
    name: '', type: 'lab', capacity: '', facilities: [], needs_approval: false, incharge_id: ''
  });
  const [ttForm, setTtForm] = useState({
    day_of_week: 1, start_time: '', end_time: '', subject: '', faculty_name: ''
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.get('/rooms'), api.get('/auth/users')])
      .then(([rRes, uRes]) => { setRooms(rRes.data); setUsers(uRes.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const fetchTimetable = roomId => {
    api.get(`/rooms/${roomId}/timetable`).then(r => setTimetable(r.data));
  };

  const toggleFacility = f => {
    setRoomForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f) ? prev.facilities.filter(x => x !== f) : [...prev.facilities, f]
    }));
  };

  const handleAddRoom = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/rooms', { ...roomForm, capacity: parseInt(roomForm.capacity) });
      toast.success('Room added!');
      setModal(null);
      setRoomForm({ name: '', type: 'lab', capacity: '', facilities: [], needs_approval: false, incharge_id: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async id => {
    if (!confirm('Deactivate this room?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      toast.success('Room deactivated');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleAddTimetableSlot = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/rooms/${selectedRoom.id}/timetable`, ttForm);
      toast.success('Slot added!');
      setTtForm({ day_of_week: 1, start_time: '', end_time: '', subject: '', faculty_name: '' });
      fetchTimetable(selectedRoom.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (roomId, slotId) => {
    try {
      await api.delete(`/rooms/${roomId}/timetable/${slotId}`);
      toast.success('Slot deleted');
      fetchTimetable(roomId);
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage rooms, facilities, and timetables</p>
      </div>

      {/* Rooms */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Rooms ({rooms.length})</h2>
          <button onClick={() => setModal('addRoom')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Type', 'Capacity', 'Facilities', 'Approval', 'In-charge', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rooms.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{r.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500">{r.capacity}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {r.facilities.slice(0, 3).map(f => (
                        <span key={f} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{f}</span>
                      ))}
                      {r.facilities.length > 3 && <span className="text-xs text-gray-400">+{r.facilities.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.needs_approval
                      ? <span className="text-xs text-orange-600 font-medium">Required</span>
                      : <span className="text-xs text-green-600">Auto</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {users.find(u => u.id === r.incharge_id)?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelectedRoom(r); fetchTimetable(r.id); setModal('timetable'); }}
                        className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors" title="Manage timetable">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRoom(r.id)}
                        className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors" title="Deactivate room">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Room Modal */}
      {modal === 'addRoom' && (
        <Modal title="Add New Room" onClose={() => setModal(null)}>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
              <input required value={roomForm.name}
                onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Computer Lab 3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={roomForm.type} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                <input type="number" required min="1" value={roomForm.capacity}
                  onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="40" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facilities</label>
              <div className="flex flex-wrap gap-2">
                {FACILITIES_OPTIONS.map(f => (
                  <button key={f} type="button" onClick={() => toggleFacility(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${roomForm.facilities.includes(f) ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="needs_approval"
                checked={roomForm.needs_approval}
                onChange={e => setRoomForm(f => ({ ...f, needs_approval: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="needs_approval" className="text-sm font-medium text-gray-700">
                Requires in-charge approval
              </label>
            </div>
            {roomForm.needs_approval && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign In-charge</label>
                <select value={roomForm.incharge_id}
                  onChange={e => setRoomForm(f => ({ ...f, incharge_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select in-charge…</option>
                  {users.filter(u => u.role === 'incharge').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {submitting ? 'Adding…' : 'Add Room'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Timetable Modal */}
      {modal === 'timetable' && selectedRoom && (
        <Modal title={`Timetable — ${selectedRoom.name}`} onClose={() => setModal(null)}>
          {/* Existing slots */}
          {timetable.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Schedule</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {timetable.map(slot => (
                  <div key={slot.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="w-10 font-medium text-purple-600 text-xs">{DAY_NAMES[slot.day_of_week].slice(0,3)}</span>
                    <span className="text-gray-500 text-xs">{slot.start_time}–{slot.end_time}</span>
                    <span className="font-medium text-gray-800 flex-1">{slot.subject}</span>
                    <button onClick={() => handleDeleteSlot(selectedRoom.id, slot.id)}
                      className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add slot form */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Add Recurring Slot</h4>
            <form onSubmit={handleAddTimetableSlot} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Day of Week</label>
                <select value={ttForm.day_of_week}
                  onChange={e => setTtForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                  <input type="time" required value={ttForm.start_time}
                    onChange={e => setTtForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                  <input type="time" required value={ttForm.end_time}
                    onChange={e => setTtForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input required value={ttForm.subject}
                  onChange={e => setTtForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. DBMS Lab" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Faculty Name</label>
                <input required value={ttForm.faculty_name}
                  onChange={e => setTtForm(f => ({ ...f, faculty_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Prof. John Doe" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {submitting ? 'Adding…' : 'Add Slot'}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import RoomTypeBadge from '../components/RoomTypeBadge';
import { Search, Users, Projector, Wifi, AirVent, Mic, Monitor, Cpu } from 'lucide-react';

const FACILITY_ICONS = {
  projector: Projector,
  AC: AirVent,
  mic: Mic,
  computers: Monitor,
  oscilloscopes: Cpu,
  whiteboard: null,
  stage: null,
};

const TYPES = ['all', 'lab', 'seminar_hall', 'auditorium', 'classroom'];
const FACILITIES_OPTIONS = ['projector', 'AC', 'mic', 'computers', 'whiteboard'];

export default function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [minCapacity, setMinCapacity] = useState('');
  const [facilityFilter, setFacilityFilter] = useState([]);

  useEffect(() => {
    api.get('/rooms').then(r => setRooms(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = rooms.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (minCapacity && r.capacity < parseInt(minCapacity)) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (facilityFilter.length > 0 && !facilityFilter.every(f => r.facilities.includes(f))) return false;
    return true;
  });

  const toggleFacility = f => setFacilityFilter(prev =>
    prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Rooms</h1>
          <p className="text-sm text-gray-500">{filtered.length} rooms available</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search rooms…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number" placeholder="Min capacity"
              value={minCapacity} onChange={e => setMinCapacity(e.target.value)} min="1"
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
          </div>
        </div>
        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
              ${typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {t === 'all' ? 'All Types' : t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        {/* Facility filter */}
        <div className="flex gap-2 flex-wrap">
          {FACILITIES_OPTIONS.map(f => (
            <button key={f} onClick={() => toggleFacility(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
              ${facilityFilter.includes(f) ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Room cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(room => (
          <div key={room.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            {/* Color header based on type */}
            <div className={`h-2 ${
              room.type === 'auditorium' ? 'bg-orange-400' :
              room.type === 'seminar_hall' ? 'bg-blue-500' :
              room.type === 'lab' ? 'bg-purple-500' : 'bg-green-500'
            }`} />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 leading-tight">{room.name}</h3>
                <RoomTypeBadge type={room.type} />
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                <Users className="w-3.5 h-3.5" />
                <span>Up to {room.capacity} people</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-4">
                {room.facilities.map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{f}</span>
                ))}
              </div>
              {room.needs_approval && (
                <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 mb-3">
                  ⚠ Requires in-charge approval
                </div>
              )}
              <div className="mt-auto flex gap-2">
                <Link to={`/rooms/${room.id}`}
                  className="flex-1 text-center text-sm py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  View Calendar
                </Link>
                <button onClick={() => navigate(`/bookings/new?room=${room.id}`)}
                  className="flex-1 text-sm py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No rooms match your filters</p>
        </div>
      )}
    </div>
  );
}

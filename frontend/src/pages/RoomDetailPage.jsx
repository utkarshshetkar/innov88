import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../api';
import RoomTypeBadge from '../components/RoomTypeBadge';
import { Users, ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timetableToFullCalendarEvents(timetable, year, month) {
  const events = [];
  // Generate events for the displayed month (and 2 months on each side for calendar nav)
  for (let offset = -60; offset <= 90; offset++) {
    const d = new Date(year, month - 1, 1 + offset);
    const dow = d.getDay();
    const slot = timetable.find(t => t.day_of_week === dow);
    if (!slot) continue;
    // Could be multiple slots per day
    timetable.filter(t => t.day_of_week === dow).forEach(t => {
      const dateStr = d.toISOString().split('T')[0];
      events.push({
        id: `tt-${t.id}-${dateStr}`,
        title: `📚 ${t.subject}`,
        start: `${dateStr}T${t.start_time}`,
        end:   `${dateStr}T${t.end_time}`,
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
        extendedProps: { type: 'timetable', faculty: t.faculty_name },
      });
    });
  }
  return events;
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    Promise.all([
      api.get(`/rooms/${id}`),
      api.get(`/rooms/${id}/timetable`),
    ]).then(([rRes, tRes]) => {
      setRoom(rRes.data);
      setTimetable(tRes.data);
    }).catch(() => toast.error('Room not found')).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    api.get(`/bookings/room/${id}/calendar?month=${year}-${String(month).padStart(2,'0')}`)
      .then(r => setBookings(r.data.bookings || []));
  }, [id, currentDate]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!room) return <div className="text-center py-12 text-gray-500">Room not found.</div>;

  const ttEvents = timetableToFullCalendarEvents(timetable, currentDate.getFullYear(), currentDate.getMonth() + 1);
  const bookingEvents = bookings.map(b => ({
    id: `bk-${b.id}`,
    title: b.status === 'pending' ? `⏳ ${b.title}` : `✅ ${b.title}`,
    start: `${b.date}T${b.start_time}`,
    end:   `${b.date}T${b.end_time}`,
    backgroundColor: b.status === 'pending' ? '#f59e0b' : '#16a34a',
    borderColor:     b.status === 'pending' ? '#d97706' : '#15803d',
    extendedProps: { type: 'booking', status: b.status, requester: b.requester_name },
  }));

  const allEvents = [...ttEvents, ...bookingEvents];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/rooms')}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
            <RoomTypeBadge type={room.type} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Capacity: {room.capacity}</span>
            {room.facilities.map(f => (
              <span key={f} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{f}</span>
            ))}
            {room.needs_approval && (
              <span className="text-orange-600 text-xs font-medium">⚠ Requires approval</span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate(`/bookings/new?room=${id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Book this room
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" /> Regular Lecture</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-600 inline-block" /> Approved Booking</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Pending Booking</span>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={allEvents}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          height="auto"
          datesSet={({ start }) => setCurrentDate(start)}
          eventClick={info => {
            const { type, faculty, status, requester } = info.event.extendedProps;
            if (type === 'timetable') {
              toast(`📚 Regular lecture — taught by ${faculty}`, { icon: '📅' });
            } else {
              toast(`${status === 'approved' ? '✅' : '⏳'} Booked by ${requester} · Status: ${status}`, { icon: '📋' });
            }
          }}
          dateClick={info => {
            navigate(`/bookings/new?room=${id}&date=${info.dateStr.split('T')[0]}`);
          }}
          nowIndicator
          businessHours={{ daysOfWeek: [1,2,3,4,5,6], startTime: '08:00', endTime: '18:00' }}
        />
      </div>

      {/* Weekly timetable summary */}
      {timetable.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Regular Lecture Schedule</h3>
          <div className="space-y-2">
            {timetable.map(slot => (
              <div key={slot.id} className="flex items-center gap-3 text-sm">
                <span className="w-8 font-medium text-purple-600">{DAY_NAMES[slot.day_of_week]}</span>
                <span className="text-gray-500">{slot.start_time}–{slot.end_time}</span>
                <span className="font-medium text-gray-800">{slot.subject}</span>
                <span className="text-gray-400">by {slot.faculty_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

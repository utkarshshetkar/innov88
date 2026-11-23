export default function RoomTypeBadge({ type }) {
  const map = {
    lab:          'bg-purple-100 text-purple-700',
    seminar_hall: 'bg-blue-100 text-blue-700',
    auditorium:   'bg-orange-100 text-orange-700',
    classroom:    'bg-green-100 text-green-700',
  };
  const labels = {
    lab: 'Lab',
    seminar_hall: 'Seminar Hall',
    auditorium: 'Auditorium',
    classroom: 'Classroom',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  );
}

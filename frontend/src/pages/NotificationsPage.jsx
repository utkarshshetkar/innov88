import { useEffect, useState } from 'react';
import api from '../api';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/notifications').then(r => setNotifications(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const markAllRead = () => {
    api.patch('/notifications/mark-read').then(() => fetch());
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              className={`bg-white rounded-xl border p-4 flex gap-3 transition-colors
              ${!n.is_read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
              <div className="flex-1">
                <p className={`text-sm ${!n.is_read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  {n.message}
                </p>
                {n.booking_title && (
                  <p className="text-xs text-gray-400 mt-0.5">Re: {n.booking_title}
                    {n.booking_date ? ` on ${n.booking_date}` : ''}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

const SEMINAR_REQUIREMENTS = [
  { id: 'wireless_mic', label: 'Handheld Wireless Mics (2)', icon: '🎤' },
  { id: 'collar_mic', label: 'Collar / Lapel Mic', icon: '🎙️' },
  { id: 'projector', label: 'Projector & HDMI Cable', icon: '📽️' },
  { id: 'sound_system', label: 'PA / Sound System', icon: '🔊' },
  { id: 'podium', label: 'Stage Podium / Lectern', icon: '🏛️' },
  { id: 'presenter_pc', label: 'Presenter Laptop / PC', icon: '💻' },
  { id: 'extra_chairs', label: 'Extra Chairs Arrangement', icon: '🪑' },
  { id: 'whiteboard', label: 'Whiteboard & Markers', icon: '🖊️' },
  { id: 'ac_precooling', label: 'AC Pre-cooling (30 min prior)', icon: '❄️' },
  { id: 'stage_lighting', label: 'Stage Spotlight / Lighting', icon: '💡' }
];

const REQUIREMENT_LABELS = {
  wireless_mic: '🎤 Wireless Mics (2)',
  collar_mic: '🎙️ Collar Mic',
  projector: '📽️ Projector & HDMI',
  sound_system: '🔊 Sound PA',
  podium: '🏛️ Podium',
  presenter_pc: '💻 Laptop/PC',
  extra_chairs: '🪑 Extra Chairs',
  whiteboard: '🖊️ Whiteboard',
  ac_precooling: '❄️ AC Pre-cooling',
  stage_lighting: '💡 Lighting'
};

const AUTHORITY_DETAILS = {
  coordinator: { title: 'Step 1: Student Coordinator Dashboard', badge: 'Level 1 Authority' },
  faculty:     { title: 'Step 2: Faculty Advisor Dashboard',     badge: 'Level 2 Authority' },
  incharge:    { title: 'Step 3: Hall In-Charge Dashboard',      badge: 'Level 3 Authority' },
  hod:         { title: 'Step 4: HOD Final Clearance Dashboard', badge: 'Final Authority'   }
};

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('roombook_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('roombook_token') || '');
  const [activeTab, setActiveTab] = useState('rooms');

  // Auth States
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    designation: 'General Secretary (GS)'
  });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Main Data States
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    room_id: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '12:00',
    attendees: 50
  });
  const [requirements, setRequirements] = useState([]);
  const [formError, setFormError] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [actionRemarks, setActionRemarks] = useState({});

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('roombook_user', JSON.stringify(userData));
    localStorage.setItem('roombook_token', userToken);
    setActiveTab(userData.role === 'student' ? 'my-bookings' : 'approvals');
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('roombook_user');
    localStorage.removeItem('roombook_token');
    setActiveTab('rooms');
  };

  // Safe JSON Fetch helper that never throws "Unexpected end of JSON input"
  const safeFetch = async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Backend returned invalid response. Ensure backend is running.');
      }

      if (!res.ok) {
        if (res.status === 401 && token) {
          // Stale session token detected, clear it
          handleLogout();
        }
        throw new Error(data.error || `Server error (Status: ${res.status})`);
      }
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Cannot connect to backend server. Please verify "npm start" is running on port 3001.');
      }
      throw err;
    }
  };

  // Sign In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const data = await safeFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      handleLogin(data.user, data.token);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Student Public Registration Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    try {
      const data = await safeFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm)
      });

      if (data.token && data.user) {
        handleLogin(data.user, data.token);
      } else {
        setAuthSuccess('Registration successful! Please sign in.');
        setAuthMode('login');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    if (!token) return;
    try {
      const data = await safeFetch('/api/rooms');
      setRooms(data);
      if (data.length > 0 && !formData.room_id) {
        setFormData(prev => ({ ...prev, room_id: data[0].id }));
      }
    } catch {}
  };

  const fetchMyBookings = async () => {
    if (!token) return;
    try {
      const data = await safeFetch('/api/bookings?my=true');
      setBookings(data);
    } catch {}
  };

  const fetchApprovals = async () => {
    if (!token || user?.role === 'student') return;
    try {
      const data = await safeFetch('/api/bookings?status=pending');
      setPendingApprovals(data);
    } catch {}
  };

  // Cross-Device 3-Second Heartbeat Polling
  useEffect(() => {
    if (token) {
      fetchRooms();
      fetchMyBookings();
      fetchApprovals();

      const interval = setInterval(() => {
        fetchMyBookings();
        fetchApprovals();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [token, user]);

  const handleToggleRequirement = (id) => {
    setRequirements(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuggestions(null);
    setBookingSuccess('');
    setLoading(true);

    try {
      const result = await safeFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          attendees: parseInt(formData.attendees) || 1,
          requirements
        })
      });

      setBookingSuccess(result.message);
      fetchMyBookings();
      setRequirements([]);
      setTimeout(() => {
        setActiveTab('my-bookings');
        setBookingSuccess('');
      }, 1500);
    } catch (err) {
      setFormError(err.message);
      if (formData.room_id && formData.date) {
        try {
          const suggData = await safeFetch(
            `/api/analytics/suggest?room_id=${formData.room_id}&date=${formData.date}&duration=1`
          );
          setSuggestions(suggData);
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  // Authority Approval
  const handleApprove = async (id) => {
    const remarks = actionRemarks[id] || 'Verified and approved';
    try {
      await safeFetch(`/api/bookings/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ remarks })
      });
      fetchApprovals();
      fetchMyBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  // Authority Rejection
  const handleReject = async (id) => {
    const reason = prompt('Please enter the official rejection reason:');
    if (!reason) return;
    try {
      await safeFetch(`/api/bookings/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      fetchApprovals();
      fetchMyBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await safeFetch(`/api/bookings/${id}/cancel`, { method: 'PATCH' });
      fetchMyBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  // AUTHENTICATION SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white text-xl font-black mb-2 shadow-md">
              RB
            </div>
            <h1 className="text-2xl font-bold text-slate-800">RoomBook Portal</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              4-Tier Sequential Hall Reservation & Approval Engine
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Authority / User Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Registration
            </button>
          </div>

          {authError && (
            <div className="p-3 mb-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-xs text-red-700">
              {authError}
            </div>
          )}

          {authSuccess && (
            <div className="p-3 mb-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-xs text-emerald-700">
              {authSuccess}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aditya.coordinator@college.edu"
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter account password"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Verifying Credentials...' : 'Sign In'}
              </button>

              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-[11px] font-bold text-slate-800">Authority Accounts Reference:</p>
                <div className="text-[10px] text-slate-600 space-y-1">
                  <div>1. <strong>Coordinator:</strong> aditya.coordinator@college.edu | <code>coord@2026</code></div>
                  <div>2. <strong>Faculty Advisor:</strong> radhika.faculty@college.edu | <code>faculty@2026</code></div>
                  <div>3. <strong>Hall In-Charge:</strong> sanjeev.incharge@college.edu | <code>incharge@2026</code></div>
                  <div>4. <strong>Head of Dept (HOD):</strong> sundaram.hod@college.edu | <code>hod@2026</code></div>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800">
                🔒 <strong>Student Gate:</strong> Authority accounts are fixed and prohibited from public registration.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Mehta"
                  value={registerForm.name}
                  onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College Email</label>
                <input
                  type="email"
                  required
                  placeholder="student.id@college.edu"
                  value={registerForm.email}
                  onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Choose password"
                  value={registerForm.password}
                  onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Role / Post</label>
                <select
                  value={registerForm.designation}
                  onChange={e => setRegisterForm({ ...registerForm, designation: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General Secretary (GS)">General Secretary (GS)</option>
                  <option value="Student Coordinator">Student Coordinator</option>
                  <option value="Event Coordinator">Event Coordinator</option>
                  <option value="Security Committee Lead">Security Committee Lead</option>
                  <option value="Cultural Secretary">Cultural Secretary</option>
                  <option value="Sports Secretary">Sports Secretary</option>
                  <option value="Club Lead / President">Club Lead / President</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50 mt-2"
              >
                {loading ? 'Registering...' : 'Register Student Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const isAuthority = user.role !== 'student';
  const authorityInfo = AUTHORITY_DETAILS[user.role];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl text-white flex items-center justify-center font-black text-sm shadow">
              RB
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight block">RoomBook</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                {authorityInfo ? authorityInfo.title : 'Student Hall Reservation Portal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 block">{user.name}</span>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium">({user.designation || user.role})</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto border-t border-slate-100">
          {[
            { id: 'rooms', label: '🏛️ Campus Halls' },
            { id: 'new-booking', label: '➕ Request Reservation' },
            { id: 'my-bookings', label: `📋 My Bookings (${bookings.length})` },
            ...(isAuthority
              ? [{ id: 'approvals', label: `🔔 Approvals Queue (${pendingApprovals.length})` }]
              : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {/* TAB 1: VENUES */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Campus Venues</h2>
                <p className="text-xs text-slate-500">Every hall request follows the strict sequential 4-tier approval process</p>
              </div>
              <button
                onClick={() => setActiveTab('new-booking')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
              >
                + Book Hall
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => (
                <div key={room.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700">
                      {room.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Sequential Approval Required
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{room.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">👥 Seating Capacity: <span className="font-bold text-slate-700">{room.capacity} seats</span></p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, room_id: room.id }));
                        setActiveTab('new-booking');
                      }}
                      className="w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-lg transition"
                    >
                      Reserve This Venue →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: NEW RESERVATION */}
        {activeTab === 'new-booking' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
              <h2 className="text-lg font-bold">New Hall Reservation</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Sequential clearance: Coordinator → Faculty → In-Charge → HOD
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-xs text-red-700">
                  <p className="font-bold">⚠️ Booking Error</p>
                  <p className="mt-0.5">{formError}</p>
                </div>
              )}

              {bookingSuccess && (
                <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-xs text-emerald-700">
                  <p className="font-bold">✅ Submitted!</p>
                  <p className="mt-0.5">{bookingSuccess}</p>
                </div>
              )}

              {suggestions?.available_slots?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <p className="font-bold text-amber-900">💡 Free slots for this hall today:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.available_slots.slice(0, 5).map(s => (
                      <button
                        type="button"
                        key={s.start_time}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, start_time: s.start_time, end_time: s.end_time }));
                          setFormError('');
                        }}
                        className="bg-white border border-amber-300 text-amber-900 px-2 py-1 rounded font-semibold hover:bg-amber-100"
                      >
                        {s.start_time} – {s.end_time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Venue</label>
                  <select
                    value={formData.room_id}
                    onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Venue...</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Cap: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Attendees</label>
                  <input
                    type="number"
                    value={formData.attendees}
                    onChange={e => setFormData({ ...formData, attendees: e.target.value })}
                    min="1"
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Title & Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. ACM Intra-College Coding Hackathon 2026"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* SEMINAR REQUIREMENTS CHECKBOXES */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Event Requirements Checklist</h3>
                    <p className="text-[11px] text-slate-500">Select required logistics</p>
                  </div>
                  <span className="text-[11px] bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                    {requirements.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {SEMINAR_REQUIREMENTS.map((item) => {
                    const isChecked = requirements.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleToggleRequirement(item.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${
                          isChecked
                            ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 pointer-events-none"
                        />
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Agenda / Description</label>
                <textarea
                  rows="2"
                  placeholder="Provide context for the authorities..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit to Coordinator (Step 1)'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: MY BOOKINGS (LIVE SEQUENTIAL PIPELINE) */}
        {activeTab === 'my-bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Hall Bookings</h2>
                <p className="text-xs text-slate-500">Live multi-tier approval progress across authorities</p>
              </div>
              <button
                onClick={() => setActiveTab('new-booking')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                + New Request
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">No requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(b => {
                  const stageOrder = ['coordinator', 'faculty', 'incharge', 'hod'];
                  const currentIdx = stageOrder.indexOf(b.current_stage);
                  const isApproved = b.status === 'approved';
                  const isRejected = b.status === 'rejected';

                  return (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                              {b.room_name}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isApproved ? 'bg-emerald-100 text-emerald-800' :
                              isRejected ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {isApproved ? '✅ Fully Approved' :
                               isRejected ? '❌ Request Rejected' :
                               `⏳ Pending: ${b.current_stage.toUpperCase()} Review`}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-1">{b.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            📅 {b.date} • ⏰ {b.start_time} - {b.end_time} • Attendees: {b.attendees}
                          </p>
                        </div>

                        {!isApproved && !isRejected && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-xs text-red-600 border border-red-200 hover:bg-red-50 font-bold px-3 py-1 rounded-lg"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>

                      {/* 4-STAGE SEQUENTIAL PIPELINE */}
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Sequential Approval Pipeline:
                        </span>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          {[
                            { id: 'coordinator', label: '1. Coordinator' },
                            { id: 'faculty', label: '2. Faculty' },
                            { id: 'incharge', label: '3. In-Charge' },
                            { id: 'hod', label: '4. HOD' }
                          ].map((step, idx) => {
                            let stepStatus = 'upcoming';
                            if (isApproved) stepStatus = 'done';
                            else if (isRejected) {
                              stepStatus = idx <= currentIdx ? (idx === currentIdx ? 'rejected' : 'done') : 'upcoming';
                            } else {
                              if (idx < currentIdx) stepStatus = 'done';
                              else if (idx === currentIdx) stepStatus = 'current';
                            }

                            return (
                              <div
                                key={step.id}
                                className={`p-2.5 rounded-lg border text-[11px] font-semibold transition ${
                                  stepStatus === 'done' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                                  stepStatus === 'current' ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold ring-2 ring-blue-300 shadow-sm' :
                                  stepStatus === 'rejected' ? 'bg-red-50 border-red-300 text-red-800' :
                                  'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                <div>{stepStatus === 'done' ? '✓' : stepStatus === 'current' ? '⏳' : stepStatus === 'rejected' ? '✕' : '○'}</div>
                                <div className="mt-0.5">{step.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Equipment badges */}
                      {b.requirements && b.requirements.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Equipment:
                          </span>
                          {b.requirements.map(reqId => (
                            <span
                              key={reqId}
                              className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium"
                            >
                              {REQUIREMENT_LABELS[reqId] || reqId}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Audit Trail */}
                      {b.approval_history && b.approval_history.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 bg-slate-50 p-3 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Official Audit Trail:
                          </span>
                          {b.approval_history.map((log, idx) => (
                            <div key={idx} className="text-[11px] text-slate-600 flex items-center justify-between">
                              <span>
                                • <strong>{log.actor_name}</strong> ({log.actor_role}) — <em>{log.action}</em>: "{log.remarks}"
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUTHORITY APPROVALS QUEUE */}
        {activeTab === 'approvals' && isAuthority && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {authorityInfo.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Only requests currently pending your official clearance appear here. (Auto-refreshes live every 3s)
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                {pendingApprovals.length} Pending Actions
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">🎉 Your authority queue is clear. No requests currently awaiting your action.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map(b => (
                  <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {b.room_name}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            📅 {b.date} • ⏰ {b.start_time} - {b.end_time}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{b.title}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Requester: <strong className="text-slate-800">{b.requester_name}</strong> ({b.requester_designation || b.requester_role}) • Attendees: <strong>{b.attendees}</strong>
                        </p>
                        {b.description && (
                          <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded">
                            "{b.description}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <input
                          type="text"
                          placeholder="Official remarks..."
                          value={actionRemarks[b.id] || ''}
                          onChange={e => setActionRemarks({ ...actionRemarks, [b.id]: e.target.value })}
                          className="text-xs p-1.5 border border-slate-300 rounded-md w-44"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReject(b.id)}
                            className="text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(b.id)}
                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg shadow-sm"
                          >
                            {user.role === 'hod' ? 'Give Final HOD Approval' : 'Approve & Advance →'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Equipment badges */}
                    {b.requirements && b.requirements.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Requested Equipment ({b.requirements.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {b.requirements.map(reqId => (
                            <span
                              key={reqId}
                              className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium"
                            >
                              {REQUIREMENT_LABELS[reqId] || reqId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prior clearance chain */}
                    {b.approval_history && b.approval_history.length > 0 && (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Prior Clearance:</span>
                        {b.approval_history.map((log, i) => (
                          <div key={i} className="text-slate-600">
                            ✓ {log.stage.toUpperCase()}: Approved by <strong>{log.actor_name}</strong> ({log.actor_role}) — <em>"{log.remarks}"</em>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function HolidayCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', description: '' });
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchHolidays();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { data } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.data.user.id)
        .single();
      setUserRole(data?.role || 'employee');
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchHolidays = async () => {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .order('date');
    setHolidays(data || []);
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('Only admins can add holidays');
      return;
    }

    const { error } = await supabase.from('holidays').insert([newHoliday]);
    if (error) alert('Error: ' + error.message);
    else {
      setNewHoliday({ date: '', name: '', description: '' });
      fetchHolidays();
    }
  };

  const deleteHoliday = async (id) => {
    if (userRole !== 'admin') {
      alert('Only admins can delete holidays');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchHolidays();
  };

  return (
    <div className="vtc-card">
      <h2>🎉 Holiday Calendar</h2>
      
      {/* Add Holiday Form (for Admin only) */}
      {userRole === 'admin' && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
          <h3>Add New Holiday</h3>
          <form onSubmit={addHoliday}>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="date"
                value={newHoliday.date}
                onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                required
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={newHoliday.name}
                onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                placeholder="Holiday Name"
                required
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={newHoliday.description}
                onChange={e => setNewHoliday({...newHoliday, description: e.target.value})}
                placeholder="Description"
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              />
            </div>
            <button type="submit" className="vtc-btn-primary">
              Add Holiday
            </button>
          </form>
        </div>
      )}

      {/* Holidays List */}
      <div>
        <h3>Upcoming Holidays ({holidays.length})</h3>
        {holidays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No holidays found
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {holidays.map(holiday => (
              <div key={holiday.id} className="vtc-card" style={{ 
                background: '#fff',
                position: 'relative'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                  {new Date(holiday.date).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={{ color: '#007bff', fontSize: '16px', margin: '5px 0' }}>{holiday.name}</div>
                <div style={{ color: '#666' }}>{holiday.description}</div>
                
                {userRole === 'admin' && (
                  <button 
                    onClick={() => deleteHoliday(holiday.id)}
                    className="vtc-btn-danger"
                    style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      right: '10px',
                      padding: '5px 10px',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
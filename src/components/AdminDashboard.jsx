import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SalarySlipGenerator from './SalarySlipGenerator';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('enrollment');
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState({ primary_color: '#3B82F6', company_name: 'VTC Attendance App' });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Enrollment Form State
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', role: 'employee', manager_id: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployees(),
      fetchSettings(),
      fetchAllAttendance(),
      fetchPendingLeaves(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        manager:employees!employees_manager_id_fkey(full_name)
      `)
      .order('full_name');
    
    if (!error) setEmployees(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').single();
    if (data) setSettings(data);
  };

  const fetchAllAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select(`
        *,
        employees!inner(full_name, email, role, manager_id)
      `)
      .order('signin_time', { ascending: false })
      .limit(100);
    setAttendanceRecords(data || []);
  };

  const fetchPendingLeaves = async () => {
    const { data } = await supabase
      .from('leaves')
      .select(`
        *,
        employees!inner(full_name, email)
      `)
      .eq('status', 'pending')
      .order('applied_at', { ascending: false });
    setPendingLeaves(data || []);
  };

  const fetchStats = async () => {
    try {
      // Total employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      // Present today
      const today = new Date().toISOString().split('T')[0];
      const { count: presentToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('signin_time', today)
        .is('signout_time', null);

      // Pending leaves
      const { count: pendingLeavesCount } = await supabase
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Pending approvals
      const { count: pendingApprovals } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalEmployees: totalEmployees || 0,
        presentToday: presentToday || 0,
        pendingLeaves: pendingLeavesCount || 0,
        pendingApprovals: pendingApprovals || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleEnrollment = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email.trim(),
        password: formData.password,
        email_confirm: true
      });
      
      if (authError) {
        alert('Auth Error: ' + authError.message);
        return;
      }

      // Insert into employees table
      const { error: dbError } = await supabase.from('employees').insert({
        id: authData.user.id,
        full_name: formData.full_name,
        email: formData.email.trim(),
        role: formData.role,
        manager_id: formData.manager_id || null
      });

      if (dbError) {
        alert('DB Error: ' + dbError.message);
      } else {
        alert('Employee enrolled successfully!');
        setFormData({ full_name: '', email: '', password: '', role: 'employee', manager_id: '' });
        fetchEmployees();
        fetchStats();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignManager = async (employeeId, managerId) => {
    const { error } = await supabase
      .from('employees')
      .update({ manager_id: managerId })
      .eq('id', employeeId);

    if (error) {
      alert('Error assigning manager: ' + error.message);
    } else {
      alert('Manager assigned successfully!');
      fetchEmployees();
    }
  };

  // Bulk manager assignment
  const bulkAssignManager = async (managerId) => {
    if (selectedEmployees.length === 0) {
      alert('Please select employees first');
      return;
    }

    const { error } = await supabase
      .from('employees')
      .update({ manager_id: managerId })
      .in('id', selectedEmployees);

    if (error) {
      alert('Error in bulk assignment: ' + error.message);
    } else {
      alert(`Manager assigned to ${selectedEmployees.length} employees successfully!`);
      setSelectedEmployees([]);
      fetchEmployees();
    }
  };

  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const markAttendanceForEmployee = async (employeeId, action) => {
    const user = await supabase.auth.getUser();
    
    if (action === 'signin') {
      const { error } = await supabase.from('attendance').insert({
        employee_id: employeeId,
        signin_time: new Date().toISOString(),
        status: 'approved',
        approved_by: user.data.user.id
      });
      
      if (error) alert('Error: ' + error.message);
      else alert('Sign in recorded successfully!');
    } else {
      // Find today's active attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: activeRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .is('signout_time', null)
        .gte('signin_time', today)
        .single();

      if (activeRecord) {
        const { error } = await supabase
          .from('attendance')
          .update({ 
            signout_time: new Date().toISOString(),
            approved_by: user.data.user.id
          })
          .eq('id', activeRecord.id);

        if (error) alert('Error: ' + error.message);
        else alert('Sign out recorded successfully!');
      } else {
        alert('No active sign-in found for this employee today.');
      }
    }
    
    fetchAllAttendance();
    fetchStats();
  };

  const handleLeaveApproval = async (leaveId, status) => {
    const { error } = await supabase
      .from('leaves')
      .update({ 
        status,
        approved_by: (await supabase.auth.getUser()).data.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', leaveId);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert(`Leave ${status} successfully!`);
      fetchPendingLeaves();
      fetchStats();
    }
  };

  const handleAttendanceApproval = async (attendanceId, status) => {
    const { error } = await supabase
      .from('attendance')
      .update({ 
        status,
        approved_by: (await supabase.auth.getUser()).data.user.id
      })
      .eq('id', attendanceId);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert(`Attendance ${status} successfully!`);
      fetchAllAttendance();
      fetchStats();
    }
  };

  const saveSettings = async () => {
    const { error } = await supabase.from('app_settings').upsert(settings);
    if (error) alert('Error: ' + error.message);
    else alert('Settings saved!');
  };

  const exportAttendanceCSV = () => {
    const headers = ['Name', 'Email', 'Date', 'Sign In', 'Sign Out', 'Status'];
    const csvData = attendanceRecords.map(record => [
      record.employees.full_name,
      record.employees.email,
      new Date(record.signin_time).toLocaleDateString('en-IN'),
      new Date(record.signin_time).toLocaleTimeString('en-IN'),
      record.signout_time ? new Date(record.signout_time).toLocaleTimeString('en-IN') : 'Not Signed Out',
      record.status
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="vtc-container">
      {/* Header */}
      <div className="vtc-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>VTC Attendance App</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>Admin Dashboard</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="vtc-btn-danger"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="vtc-stats-grid">
        <div className="vtc-stat-card">
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Employees</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: settings.primary_color }}>{stats.totalEmployees}</div>
        </div>
        <div className="vtc-stat-card">
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Present Today</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>{stats.presentToday}</div>
        </div>
        <div className="vtc-stat-card">
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Pending Leaves</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ffc107' }}>{stats.pendingLeaves}</div>
        </div>
        <div className="vtc-stat-card">
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Pending Approvals</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#dc3545' }}>{stats.pendingApprovals}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="vtc-card">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('enrollment')}
            className={activeTab === 'enrollment' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'enrollment' ? settings.primary_color : '#f8f9fa', 
              color: activeTab === 'enrollment' ? 'white' : 'black'
            }}
          >
            👥 Employee Enrollment
          </button>
          <button 
            onClick={() => setActiveTab('management')}
            className={activeTab === 'management' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'management' ? settings.primary_color : '#f8f9fa', 
              color: activeTab === 'management' ? 'white' : 'black'
            }}
          >
            🔧 Employee Management
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={activeTab === 'attendance' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'attendance' ? settings.primary_color : '#f8f9fa', 
              color: activeTab === 'attendance' ? 'white' : 'black'
            }}
          >
            📊 Attendance Management
          </button>
          <button 
            onClick={() => setActiveTab('leaves')}
            className={activeTab === 'leaves' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'leaves' ? settings.primary_color : '#f8f9fa', 
              color: activeTab === 'leaves' ? 'white' : 'black'
            }}
          >
            📝 Leave Approvals ({pendingLeaves.length})
          </button>
          <button 
            onClick={() => setActiveTab('salary')}
            className={activeTab === 'salary' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'salary' ? settings.primary_color : '#f8f9fa', 
              color: activeTab === 'salary' ? 'white' : 'black'
            }}
          >
            💰 Salary Slips
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={activeTab === 'settings' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'settings' ? settings.primary_color : '#f8f9fa', 
              color: activeTab === 'settings' ? 'white' : 'black'
            }}
          >
            ⚙️ App Settings
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="vtc-card" style={{ textAlign: 'center' }}>
          <div>Loading...</div>
        </div>
      )}

      {/* Employee Enrollment Tab */}
      {activeTab === 'enrollment' && (
        <div className="vtc-card">
          <h2>👥 Enroll New Employee</h2>
          <form onSubmit={handleEnrollment} style={{ maxWidth: '500px' }}>
            <div style={{ marginBottom: '15px' }}>
              <input 
                placeholder="Full Name" 
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
                required 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input 
                type="email" 
                placeholder="Email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                required 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input 
                type="password" 
                placeholder="Password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required 
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="temp_vendor">Temp/Vendor</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <select 
                value={formData.manager_id} 
                onChange={e => setFormData({...formData, manager_id: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              >
                <option value="">Select Manager (Optional)</option>
                {employees.filter(emp => emp.role === 'manager').map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name} ({manager.email})
                  </option>
                ))}
              </select>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="vtc-btn-success"
              style={{ width: '100%' }}
            >
              {loading ? 'Enrolling...' : 'Enroll Employee'}
            </button>
          </form>
        </div>
      )}

      {/* Employee Management Tab */}
      {activeTab === 'management' && (
        <div className="vtc-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>🔧 Employee Management ({employees.length} employees)</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div>
                <select 
                  onChange={(e) => bulkAssignManager(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                >
                  <option value="">Bulk Assign Manager</option>
                  {employees.filter(emp => emp.role === 'manager').map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Selected: {selectedEmployees.length}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                checked={selectedEmployees.length === employees.length && employees.length > 0}
                onChange={selectAllEmployees}
              />
              Select All
            </label>
          </div>

          <div style={{ display: 'grid', gap: '15px' }}>
            {employees.map(employee => (
              <div key={employee.id} className="vtc-card" style={{ 
                background: selectedEmployees.includes(employee.id) ? '#f0f8ff' : 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <input 
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeSelection(employee.id)}
                    />
                    <div>
                      <strong>{employee.full_name}</strong> - {employee.email}
                      <br />
                      <span style={{ 
                        background: employee.role === 'admin' ? '#dc3545' : 
                                   employee.role === 'manager' ? '#007bff' : '#28a745',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        marginLeft: '10px'
                      }}>
                        {employee.role}
                      </span>
                      {employee.manager && (
                        <span style={{ marginLeft: '10px', color: '#666' }}>
                          Manager: {employee.manager.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select 
                      value={employee.manager_id || ''}
                      onChange={(e) => assignManager(employee.id, e.target.value)}
                      style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '3px' }}
                    >
                      <option value="">No Manager</option>
                      {employees
                        .filter(emp => emp.role === 'manager' && emp.id !== employee.id)
                        .map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.full_name}
                          </option>
                        ))
                      }
                    </select>
                    <button 
                      onClick={() => markAttendanceForEmployee(employee.id, 'signin')}
                      className="vtc-btn-success"
                      style={{ padding: '5px 10px' }}
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => markAttendanceForEmployee(employee.id, 'signout')}
                      className="vtc-btn-danger"
                      style={{ padding: '5px 10px' }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Management Tab */}
      {activeTab === 'attendance' && (
        <div className="vtc-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>📊 Attendance Management</h2>
            <button 
              onClick={exportAttendanceCSV}
              className="vtc-btn-primary"
            >
              📥 Export CSV
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '10px' }}>
            {attendanceRecords.map(record => (
              <div key={record.id} className="vtc-card" style={{ 
                background: record.status === 'approved' ? '#f0fff0' : 
                           record.status === 'rejected' ? '#fff0f0' : '#fffaf0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{record.employees.full_name}</strong> ({record.employees.role})
                    <br />
                    <span>Date: {new Date(record.signin_time).toLocaleDateString('en-IN')}</span>
                    <br />
                    <span>Time: {new Date(record.signin_time).toLocaleTimeString('en-IN')}</span>
                    {record.signout_time && (
                      <span> to {new Date(record.signout_time).toLocaleTimeString('en-IN')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                      background: record.status === 'approved' ? '#28a745' : 
                                 record.status === 'rejected' ? '#dc3545' : '#ffc107',
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '15px',
                      fontSize: '12px'
                    }}>
                      {record.status}
                    </span>
                    {record.signin_selfie_url && (
                      <a href={record.signin_selfie_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
                        👤 View Selfie
                      </a>
                    )}
                    {record.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handleAttendanceApproval(record.id, 'approved')}
                          className="vtc-btn-success"
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                        >
                          ✓
                        </button>
                        <button 
                          onClick={() => handleAttendanceApproval(record.id, 'rejected')}
                          className="vtc-btn-danger"
                          style={{ padding: '3px 8px', fontSize: '12px' }}
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Approvals Tab */}
      {activeTab === 'leaves' && (
        <div className="vtc-card">
          <h2>📝 Leave Approvals ({pendingLeaves.length})</h2>
          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No pending leave applications
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {pendingLeaves.map(leave => (
                <div key={leave.id} className="vtc-card" style={{ background: '#fffaf0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {leave.employees.full_name} - {leave.employees.email}
                      </div>
                      <div><strong>Dates:</strong> {leave.start_date} to {leave.end_date}</div>
                      <div><strong>Type:</strong> {leave.leave_type}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                      {leave.document_url && (
                        <div>
                          <strong>Document:</strong>{' '}
                          <a href={leave.document_url} target="_blank" rel="noopener noreferrer">
                            📎 View Document
                          </a>
                        </div>
                      )}
                      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                        Applied on: {new Date(leave.applied_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleLeaveApproval(leave.id, 'approved')}
                        className="vtc-btn-success"
                      >
                        ✓ Approve
                      </button>
                      <button 
                        onClick={() => handleLeaveApproval(leave.id, 'rejected')}
                        className="vtc-btn-danger"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Salary Slips Tab */}
      {activeTab === 'salary' && <SalarySlipGenerator />}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="vtc-card">
          <h2>⚙️ App Settings</h2>
          <div style={{ maxWidth: '500px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Primary Color: </label>
              <input 
                type="color" 
                value={settings.primary_color} 
                onChange={e => setSettings({...settings, primary_color: e.target.value})} 
                style={{ width: '100px', height: '40px' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Company Name: </label>
              <input 
                value={settings.company_name} 
                onChange={e => setSettings({...settings, company_name: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              />
            </div>
            <button 
              onClick={saveSettings}
              className="vtc-btn-primary"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SalarySlipGenerator from './SalarySlipGenerator';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('enrollment');
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchAttendanceData();
    fetchLeaveRequests();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) {
        setEmployees(data || []);
      } else {
        console.error('Error fetching employees:', error);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('signin_time', { ascending: false })
        .limit(50);
      
      if (!error) {
        setAttendanceData(data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*, employees(full_name)')
        .order('created_at', { ascending: false });
      
      if (!error) {
        setLeaveRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: newEmployee.password,
      });

      if (authError) throw authError;

      // Create employee record
      const { error: dbError } = await supabase
        .from('employees')
        .insert([
          {
            id: authData.user.id,
            full_name: newEmployee.full_name,
            email: newEmployee.email,
            role: newEmployee.role,
            department: newEmployee.department,
            created_at: new Date().toISOString()
          }
        ]);

      if (dbError) throw dbError;

      alert('Employee added successfully!');
      setNewEmployee({
        full_name: '',
        email: '',
        password: '',
        role: 'employee',
        department: ''
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Error adding employee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({ status: 'approved' })
        .eq('id', leaveId);

      if (error) throw error;
      
      alert('Leave approved successfully!');
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Error approving leave');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({ status: 'rejected' })
        .eq('id', leaveId);

      if (error) throw error;
      
      alert('Leave rejected!');
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Error rejecting leave');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
        <h1 style={{ color: '#2c5aa0', marginBottom: '10px', textAlign: 'center', fontSize: '32px' }}>
          🎯 Admin Dashboard
        </h1>
        <p style={{ textAlign: 'center', color: '#6c757d', fontSize: '16px' }}>
          Complete Employee Management System
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>TOTAL EMPLOYEES</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{employees.length}</div>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>PENDING LEAVES</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {leaveRequests.filter(leave => leave.status === 'pending').length}
          </div>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>TODAY'S ATTENDANCE</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {attendanceData.filter(att => {
              const today = new Date().toDateString();
              const attDate = new Date(att.signin_time).toDateString();
              return attDate === today;
            }).length}
          </div>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', padding: '25px', borderRadius: '10px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>ACTIVE MANAGERS</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {employees.filter(emp => emp.role === 'manager').length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '30px',
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'enrollment', label: '👥 Employee Enrollment', icon: '👥' },
          { id: 'management', label: '📊 Employee Management', icon: '📊' },
          { id: 'attendance', label: '⏰ Attendance', icon: '⏰' },
          { id: 'leaves', label: '🏖️ Leave Management', icon: '🏖️' },
          { id: 'salary', label: '💰 Salary Slips', icon: '💰' },
          { id: 'reports', label: '📈 Reports', icon: '📈' },
          { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '15px 20px',
              background: activeTab === tab.id ? '#2c5aa0' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#2c5aa0',
              border: `2px solid ${activeTab === tab.id ? '#2c5aa0' : '#e9ecef'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              flex: '1',
              minWidth: '160px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '10px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        minHeight: '500px'
      }}>
        
        {/* Employee Enrollment Tab */}
        {activeTab === 'enrollment' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              👥 Employee Enrollment
            </h2>
            <form onSubmit={handleAddEmployee} style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>Full Name *</label>
                  <input
                    type="text"
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '16px' }}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>Email *</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '16px' }}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>Password *</label>
                  <input
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '16px' }}
                    placeholder="Set password"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>Role *</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                    style={{ width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '16px' }}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR Manager</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>Department</label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    style={{ width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '16px' }}
                    placeholder="Enter department"
                  />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '15px 40px',
                    background: loading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    minWidth: '200px'
                  }}
                >
                  {loading ? '⏳ Adding Employee...' : '➕ Add Employee'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employee Management Tab */}
        {activeTab === 'management' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              📊 Employee Management ({employees.length} Employees)
            </h2>
            <div style={{ overflowX: 'auto', background: '#f8f9fa', borderRadius: '8px', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#2c5aa0', color: 'white' }}>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Employee</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Contact</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Role</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Department</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Join Date</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, index) => (
                    <tr key={employee.id} style={{ borderBottom: '1px solid #dee2e6', background: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{employee.full_name}</td>
                      <td style={{ padding: '15px' }}>{employee.email}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: employee.role === 'admin' ? '#dc3545' : 
                                    employee.role === 'manager' ? '#fd7e14' : 
                                    employee.role === 'hr' ? '#20c997' : '#6f42c1',
                          color: 'white'
                        }}>
                          {employee.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>{employee.department || 'Not assigned'}</td>
                      <td style={{ padding: '15px' }}>
                        {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button style={{ 
                          padding: '8px 16px', 
                          marginRight: '8px', 
                          background: '#ffc107', 
                          color: 'black', 
                          border: 'none', 
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ✏️ Edit
                        </button>
                        <button style={{ 
                          padding: '8px 16px', 
                          background: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              ⏰ Attendance Management
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Employee</th>
                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Sign In</th>
                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Sign Out</th>
                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Hours</th>
                    <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.slice(0, 10).map(record => (
                    <tr key={record.id}>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.employee_id}</td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {new Date(record.signin_time).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {record.signout_time ? new Date(record.signout_time).toLocaleString() : 'Not signed out'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {record.signout_time ? 
                          ((new Date(record.signout_time) - new Date(record.signin_time)) / (1000 * 60 * 60)).toFixed(2) + ' hrs' : 
                          'N/A'
                        }
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          background: record.status === 'approved' ? '#28a745' : '#ffc107',
                          color: 'white'
                        }}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {attendanceData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <p>No attendance records found.</p>
              </div>
            )}
          </div>
        )}

        {/* Leave Management Tab */}
        {activeTab === 'leaves' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              🏖️ Leave Management
            </h2>
            <div style={{ display: 'grid', gap: '20px' }}>
              {leaveRequests.map(leave => (
                <div key={leave.id} style={{ 
                  background: '#f8f9fa', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  border: `2px solid ${getStatusColor(leave.status)}` 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: '#2c5aa0' }}>
                      {leave.employees?.full_name || 'Unknown Employee'}
                    </h4>
                    <span style={{ 
                      padding: '6px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: getStatusColor(leave.status),
                      color: 'white'
                    }}>
                      {leave.status.toUpperCase()}
                    </span>
                  </div>
                  <p><strong>Reason:</strong> {leave.reason}</p>
                  <p><strong>From:</strong> {new Date(leave.start_date).toLocaleDateString()} 
                     <strong> To:</strong> {new Date(leave.end_date).toLocaleDateString()}</p>
                  <p><strong>Total Days:</strong> {leave.total_days}</p>
                  
                  {leave.status === 'pending' && (
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleApproveLeave(leave.id)}
                        style={{
                          padding: '10px 20px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        onClick={() => handleRejectLeave(leave.id)}
                        style={{
                          padding: '10px 20px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {leaveRequests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <p>No leave requests found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Salary Slips Tab */}
        {activeTab === 'salary' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              💰 Salary Slip Management
            </h2>
            <SalarySlipGenerator />
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              📈 Reports & Analytics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#e8f5e8', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#28a745' }}>📊 Attendance Summary</h4>
                <p>Total Records: {attendanceData.length}</p>
                <p>Approved: {attendanceData.filter(a => a.status === 'approved').length}</p>
                <p>Pending: {attendanceData.filter(a => a.status === 'pending').length}</p>
              </div>
              
              <div style={{ background: '#e8f2ff', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#2c5aa0' }}>👥 Employee Statistics</h4>
                <p>Total Employees: {employees.length}</p>
                <p>Managers: {employees.filter(e => e.role === 'manager').length}</p>
                <p>HR: {employees.filter(e => e.role === 'hr').length}</p>
              </div>
              
              <div style={{ background: '#ffe8e8', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#dc3545' }}>🏖️ Leave Overview</h4>
                <p>Total Requests: {leaveRequests.length}</p>
                <p>Approved: {leaveRequests.filter(l => l.status === 'approved').length}</p>
                <p>Pending: {leaveRequests.filter(l => l.status === 'pending').length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{ color: '#2c5aa0', marginBottom: '25px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
              ⚙️ System Settings
            </h2>
            <div style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4>Company Information</h4>
                <p>Configure company details, policies, and system settings.</p>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4>Attendance Settings</h4>
                <p>Set working hours, overtime rules, and attendance policies.</p>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4>Leave Policies</h4>
                <p>Configure leave types, limits, and approval workflows.</p>
              </div>
              
              <div>
                <h4>Salary Structure</h4>
                <p>Set up salary components, deductions, and tax rules.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
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
  
  // Advanced States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchAttendanceData();
    fetchLeaveRequests();
    fetchNotifications();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) {
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(full_name)')
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
        .select('*, employees(full_name, department)')
        .order('created_at', { ascending: false });
      
      if (!error) {
        setLeaveRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchNotifications = async () => {
    // Simulate notifications
    const mockNotifications = [
      { id: 1, type: 'leave', message: '3 pending leave requests', time: '2 min ago', unread: true },
      { id: 2, type: 'attendance', message: '5 employees checked in today', time: '1 hour ago', unread: true },
      { id: 3, type: 'system', message: 'System backup completed', time: '3 hours ago', unread: false }
    ];
    setNotifications(mockNotifications);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: newEmployee.password,
      });

      if (authError) throw authError;

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

  // Advanced Filtering Functions
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const getUniqueDepartments = () => {
    const departments = employees.map(emp => emp.department).filter(Boolean);
    return ['all', ...new Set(departments)];
  };

  const exportToCSV = () => {
    setExportLoading(true);
    try {
      const headers = ['Name', 'Email', 'Role', 'Department', 'Join Date'];
      const csvData = employees.map(emp => [
        emp.full_name,
        emp.email,
        emp.role,
        emp.department,
        new Date(emp.created_at).toLocaleDateString()
      ]);
      
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      alert('Employee data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data');
    } finally {
      setExportLoading(false);
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

  const getUnreadNotificationsCount = () => {
    return notifications.filter(notif => notif.unread).length;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', background: '#f8f9fa' }}>
      
      {/* Enhanced Header with Notifications */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '25px', 
        borderRadius: '15px', 
        marginBottom: '25px',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: 'bold' }}>
              🎯 Admin Dashboard
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
              Complete Employee Management System
            </p>
          </div>
          
          {/* Notifications Bell */}
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <div style={{ 
              fontSize: '24px',
              padding: '10px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              🔔
              {getUnreadNotificationsCount() > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: '#ff4757',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {getUnreadNotificationsCount()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginTop: '25px' 
        }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '20px', 
            borderRadius: '10px', 
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>TOTAL EMPLOYEES</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{employees.length}</div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '20px', 
            borderRadius: '10px', 
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>PENDING LEAVES</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {leaveRequests.filter(leave => leave.status === 'pending').length}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '20px', 
            borderRadius: '10px', 
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>TODAY'S ATTENDANCE</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {attendanceData.filter(att => {
                const today = new Date().toDateString();
                const attDate = new Date(att.signin_time).toDateString();
                return attDate === today;
              }).length}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '20px', 
            borderRadius: '10px', 
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>ACTIVE MANAGERS</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {employees.filter(emp => emp.role === 'manager').length}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '30px',
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        position: 'sticky',
        top: '10px',
        zIndex: 100
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
              background: activeTab === tab.id ? 
                'linear-gradient(135deg, #2c5aa0 0%, #1e3a8a 100%)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#2c5aa0',
              border: `2px solid ${activeTab === tab.id ? '#2c5aa0' : '#e9ecef'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              flex: '1',
              minWidth: '160px',
              transform: activeTab === tab.id ? 'translateY(-2px)' : 'none',
              boxShadow: activeTab === tab.id ? '0 5px 15px rgba(44, 90, 160, 0.3)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enhanced Tab Content */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '15px', 
        boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
        minHeight: '500px',
        transition: 'all 0.3s ease'
      }}>
        
        {/* Enhanced Employee Enrollment Tab */}
        {activeTab === 'enrollment' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ 
              color: '#2c5aa0', 
              marginBottom: '25px', 
              borderBottom: '3px solid #e9ecef', 
              paddingBottom: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>👥 Employee Enrollment</span>
              <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal' }}>
                {employees.length} employees registered
              </span>
            </h2>
            <form onSubmit={handleAddEmployee} style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '20px', 
                marginBottom: '25px' 
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #dee2e6', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Enter full name"
                    onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
                    onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #dee2e6', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Enter email address"
                    onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
                    onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #dee2e6', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Set password"
                    onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
                    onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Role *
                  </label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #dee2e6', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR Manager</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #dee2e6', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Enter department"
                    onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
                    onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '15px 40px',
                    background: loading ? 
                      'linear-gradient(135deg, #6c757d 0%, #495057 100%)' : 
                      'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    minWidth: '200px',
                    transition: 'all 0.3s ease',
                    transform: loading ? 'none' : 'translateY(0)',
                    boxShadow: loading ? 'none' : '0 5px 15px rgba(40, 167, 69, 0.3)'
                  }}
                  onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                >
                  {loading ? '⏳ Adding Employee...' : '➕ Add Employee'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Enhanced Employee Management Tab with Search & Filters */}
        {activeTab === 'management' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '25px',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <h2 style={{ 
                color: '#2c5aa0', 
                borderBottom: '3px solid #e9ecef', 
                paddingBottom: '15px',
                margin: 0
              }}>
                📊 Employee Management ({filteredEmployees.length} Employees)
              </h2>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {/* Search Box */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '10px 15px 10px 40px',
                      border: '2px solid #dee2e6',
                      borderRadius: '25px',
                      fontSize: '14px',
                      width: '250px',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6c757d'
                  }}>
                    🔍
                  </span>
                </div>

                {/* Department Filter */}
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  style={{
                    padding: '10px 15px',
                    border: '2px solid #dee2e6',
                    borderRadius: '25px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="all">All Departments</option>
                  {getUniqueDepartments().filter(dept => dept !== 'all').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Role Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{
                    padding: '10px 15px',
                    border: '2px solid #dee2e6',
                    borderRadius: '25px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                </select>

                {/* Export Button */}
                <button
                  onClick={exportToCSV}
                  disabled={exportLoading}
                  style={{
                    padding: '10px 20px',
                    background: exportLoading ? 
                      'linear-gradient(135deg, #6c757d 0%, #495057 100%)' : 
                      'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {exportLoading ? '⏳' : '📥'} 
                  {exportLoading ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', background: '#f8f9fa', borderRadius: '12px', padding: '15px' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                background: 'white', 
                borderRadius: '10px', 
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ 
                    background: 'linear-gradient(135deg, #2c5aa0 0%, #1e3a8a 100%)', 
                    color: 'white' 
                  }}>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Employee</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Contact</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Role</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Department</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Join Date</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee, index) => (
                    <tr key={employee.id} style={{ 
                      borderBottom: '1px solid #dee2e6', 
                      background: index % 2 === 0 ? '#f8f9fa' : 'white',
                      transition: 'background 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? '#f8f9fa' : 'white'}
                    >
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          {employee.full_name}
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>{employee.email}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: employee.role === 'admin' ? 
                            'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' : 
                            employee.role === 'manager' ? 
                            'linear-gradient(135deg, #fd7e14 0%, #e55a00 100%)' : 
                            employee.role === 'hr' ? 
                            'linear-gradient(135deg, #20c997 0%, #17a589 100%)' : 
                            'linear-gradient(135deg, #6f42c1 0%, #5a2d9c 100%)',
                          color: 'white',
                          display: 'inline-block',
                          textAlign: 'center',
                          minWidth: '80px'
                        }}>
                          {employee.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>{employee.department || 'Not assigned'}</td>
                      <td style={{ padding: '15px' }}>
                        {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button style={{ 
                            padding: '8px 16px', 
                            background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)', 
                            color: 'black', 
                            border: 'none', 
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                          >
                            ✏️ Edit
                          </button>
                          <button style={{ 
                            padding: '8px 16px', 
                            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredEmployees.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px', 
                  color: '#6c757d',
                  background: 'white',
                  borderRadius: '10px',
                  marginTop: '15px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
                  <h3 style={{ margin: '0 0 10px 0' }}>No employees found</h3>
                  <p>Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Salary Slips Tab */}
        {activeTab === 'salary' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ 
              color: '#2c5aa0', 
              marginBottom: '25px', 
              borderBottom: '3px solid #e9ecef', 
              paddingBottom: '15px' 
            }}>
              💰 Salary Slip Management
            </h2>
            <SalarySlipGenerator />
          </div>
        )}

        {/* Other tabs remain the same but with enhanced styling */}
        {activeTab === 'attendance' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ 
              color: '#2c5aa0', 
              marginBottom: '25px', 
              borderBottom: '3px solid #e9ecef', 
              paddingBottom: '15px' 
            }}>
              ⏰ Attendance Management
            </h2>
            {/* Enhanced attendance content would go here */}
            <p>Advanced attendance features will be implemented here.</p>
          </div>
        )}

        {/* Add similar enhanced styling for other tabs... */}

      </div>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
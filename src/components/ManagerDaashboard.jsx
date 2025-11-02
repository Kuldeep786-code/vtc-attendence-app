import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ManagerDashboard() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'attendance') fetchPendingRequests();
    if (activeTab === 'leaves') fetchPendingLeaves();
    fetchTeamMembers();
  }, [activeTab]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Get team members first
      const { data: team, error: teamError } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', user.id);

      if (teamError) throw teamError;

      if (team && team.length > 0) {
        const teamIds = team.map(member => member.id);
        
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            *,
            employees!inner(full_name, email, role)
          `)
          .in('employee_id', teamIds)
          .eq('status', 'pending')
          .order('signin_time', { ascending: false });

        if (error) throw error;
        setPendingRequests(data || []);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      alert('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingLeaves = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { data: team, error: teamError } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', user.id);

      if (teamError) throw teamError;

      if (team && team.length > 0) {
        const teamIds = team.map(member => member.id);
        
        const { data, error } = await supabase
          .from('leaves')
          .select(`
            *,
            employees!inner(full_name, email)
          `)
          .in('employee_id', teamIds)
          .eq('status', 'pending')
          .order('applied_at', { ascending: false });

        if (error) throw error;
        setPendingLeaves(data || []);
      } else {
        setPendingLeaves([]);
      }
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
      alert('Error loading leave data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('manager_id', user.id)
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleApproval = async (id, status) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ 
          status,
          approved_by: (await supabase.auth.getUser()).data.user.id
        })
        .eq('id', id);
      
      if (error) throw error;
      
      alert(`Attendance ${status} successfully!`);
      fetchPendingRequests();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleLeaveApproval = async (id, status) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .update({ 
          status,
          approved_by: (await supabase.auth.getUser()).data.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update leave balance if approved
      if (status === 'approved') {
        await updateLeaveBalance(id);
      }
      
      alert(`Leave ${status} successfully!`);
      fetchPendingLeaves();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const updateLeaveBalance = async (leaveId) => {
    try {
      // Get leave details
      const { data: leave, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('id', leaveId)
        .single();

      if (leaveError) throw leaveError;

      if (leave) {
        // Calculate days
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Update balance
        const { data: balance, error: balanceError } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('employee_id', leave.employee_id)
          .single();

        if (!balanceError && balance) {
          const currentBalance = balance[`${leave.leave_type}_leaves`] || 0;
          const newBalance = Math.max(0, currentBalance - days);

          const { error: updateError } = await supabase
            .from('leave_balances')
            .update({
              [`${leave.leave_type}_leaves`]: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('employee_id', leave.employee_id);

          if (updateError) throw updateError;
        }
      }
    } catch (error) {
      console.error('Error updating leave balance:', error);
    }
  };

  return (
    <div className="vtc-container">
      {/* Header */}
      <div className="vtc-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>VTC Attendance App</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>Manager Dashboard</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="vtc-btn-danger"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="vtc-card">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={activeTab === 'attendance' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'attendance' ? '#3B82F6' : '#f8f9fa', 
              color: activeTab === 'attendance' ? 'white' : 'black'
            }}
          >
            📊 Attendance Approvals ({pendingRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('leaves')}
            className={activeTab === 'leaves' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'leaves' ? '#3B82F6' : '#f8f9fa', 
              color: activeTab === 'leaves' ? 'white' : 'black'
            }}
          >
            📝 Leave Approvals ({pendingLeaves.length})
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={activeTab === 'team' ? 'vtc-btn-primary' : ''}
            style={{ 
              background: activeTab === 'team' ? '#3B82F6' : '#f8f9fa', 
              color: activeTab === 'team' ? 'white' : 'black'
            }}
          >
            👥 Team Management ({teamMembers.length})
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="vtc-card" style={{ textAlign: 'center' }}>
          <div>Loading...</div>
        </div>
      )}

      {/* Attendance Approvals Tab */}
      {activeTab === 'attendance' && (
        <div className="vtc-card">
          <h2>Pending Attendance Approvals ({pendingRequests.length})</h2>
          {pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No pending attendance approvals
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {pendingRequests.map(request => (
                <div key={request.id} className="vtc-card" style={{ background: '#fffaf0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {request.employees.full_name} - {request.employees.email}
                      </div>
                      <div><strong>Date:</strong> {new Date(request.signin_time).toLocaleDateString('en-IN')}</div>
                      <div><strong>Time:</strong> {new Date(request.signin_time).toLocaleTimeString('en-IN')}</div>
                      {request.signin_selfie_url && (
                        <div>
                          <strong>Selfie:</strong>{' '}
                          <a href={request.signin_selfie_url} target="_blank" rel="noopener noreferrer">
                            👤 View Selfie
                          </a>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleApproval(request.id, 'approved')}
                        className="vtc-btn-success"
                      >
                        ✓ Approve
                      </button>
                      <button 
                        onClick={() => handleApproval(request.id, 'rejected')}
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

      {/* Leave Approvals Tab */}
      {activeTab === 'leaves' && (
        <div className="vtc-card">
          <h2>Pending Leave Approvals ({pendingLeaves.length})</h2>
          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No pending leave approvals
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

      {/* Team Management Tab */}
      {activeTab === 'team' && (
        <div className="vtc-card">
          <h2>Team Members ({teamMembers.length})</h2>
          {teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No team members assigned to you
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {teamMembers.map(member => (
                <div key={member.id} className="vtc-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{member.full_name}</strong> - {member.email}
                      <br />
                      <span style={{ 
                        background: member.role === 'employee' ? '#28a745' : '#007bff',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }}>
                        {member.role}
                      </span>
                    </div>
                    <div>
                      <button 
                        onClick={async () => {
                          // Mark attendance for team member
                          const user = await supabase.auth.getUser();
                          const { error } = await supabase.from('attendance').insert({
                            employee_id: member.id,
                            signin_time: new Date().toISOString(),
                            status: 'approved',
                            approved_by: user.data.user.id
                          });
                          
                          if (error) {
                            alert('Error: ' + error.message);
                          } else {
                            alert(`Attendance marked for ${member.full_name}`);
                          }
                        }}
                        className="vtc-btn-success"
                        style={{ marginRight: '10px' }}
                      >
                        Mark Present
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
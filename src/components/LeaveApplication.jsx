import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function LeaveApplication() {
  const [leaveForm, setLeaveForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    leave_type: 'casual',
    document: null
  });
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { data } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', user.data.user.id)
        .single();
      setLeaveBalance(data);
    } catch (error) {
      console.log('Leave balance not found');
    }
  };

  const calculateAvailableLeaves = () => {
    if (!leaveBalance) return 0;
    return leaveBalance[`${leaveForm.leave_type}_leaves`] || 0;
  };

  const handleFileUpload = async (file) => {
    const fileName = `leave-docs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('employee-documents')
      .upload(fileName, file);
    
    if (error) throw error;
    return supabase.storage.from('employee-documents').getPublicUrl(fileName).data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (calculateAvailableLeaves() <= 0) {
      alert('Insufficient leave balance!');
      setLoading(false);
      return;
    }

    try {
      let documentUrl = '';
      if (leaveForm.document) {
        documentUrl = await handleFileUpload(leaveForm.document);
      }

      const user = await supabase.auth.getUser();
      const { error } = await supabase.from('leaves').insert({
        employee_id: user.data.user.id,
        ...leaveForm,
        document_url: documentUrl
      });

      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Leave application submitted successfully!');
        setLeaveForm({ start_date: '', end_date: '', reason: '', leave_type: 'casual', document: null });
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getLeaveDays = () => {
    if (!leaveForm.start_date || !leaveForm.end_date) return 0;
    const start = new Date(leaveForm.start_date);
    const end = new Date(leaveForm.end_date);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="vtc-card">
      <h2>Apply for Leave</h2>
      
      {leaveBalance && (
        <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h4>Your Leave Balance</h4>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div><strong>Casual:</strong> {leaveBalance.casual_leaves}</div>
            <div><strong>Sick:</strong> {leaveBalance.sick_leaves}</div>
            <div><strong>Earned:</strong> {leaveBalance.earned_leaves}</div>
            <div><strong>Compensatory:</strong> {leaveBalance.compensatory_leaves}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Leave Type:</label>
          <select 
            value={leaveForm.leave_type}
            onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
          >
            <option value="casual">Casual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="earned">Earned Leave</option>
            <option value="compensatory">Compensatory Leave</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date:</label>
          <input 
            type="date"
            value={leaveForm.start_date}
            onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Date:</label>
          <input 
            type="date"
            value={leaveForm.end_date}
            onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
          />
        </div>

        {leaveForm.start_date && leaveForm.end_date && (
          <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
            <strong>Total Days:</strong> {getLeaveDays()} | <strong>Available:</strong> {calculateAvailableLeaves()}
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Reason:</label>
          <textarea 
            value={leaveForm.reason}
            onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
            required
            rows="4"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
            placeholder="Please provide detailed reason for leave..."
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Supporting Document (Optional):</label>
          <input 
            type="file"
            onChange={e => setLeaveForm({...leaveForm, document: e.target.files[0]})}
            style={{ width: '100%', padding: '10px' }}
            accept=".pdf,.jpg,.jpeg,.png"
          />
        </div>

        <button 
          type="submit"
          disabled={loading || calculateAvailableLeaves() <= 0}
          className={loading || calculateAvailableLeaves() <= 0 ? '' : 'vtc-btn-primary'}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: (loading || calculateAvailableLeaves() <= 0) ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: (loading || calculateAvailableLeaves() <= 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Submitting...' : calculateAvailableLeaves() <= 0 ? 'Insufficient Leave Balance' : 'Apply for Leave'}
        </button>
      </form>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SalarySlipGenerator() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [salaryData, setSalaryData] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Employees list fetch karein
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email');
      if (!error) {
        setEmployees(data || []);
      } else {
        console.error('Error fetching employees:', error);
      }
    } catch (err) {
      console.error('Error in fetchEmployees:', err);
    }
  };

  const fetchAttendanceForSlip = async () => {
    if (!selectedEmployee || !selectedMonth) {
      alert('Please select employee and month');
      return;
    }

    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;

      // Selected employee aur month ki attendance fetch karein
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('status', 'approved')
        .gte('signin_time', startDate)
        .lt('signin_time', endDate);

      if (error) {
        console.error('Attendance fetch error:', error);
        alert('Error fetching attendance data');
        return;
      }

      setAttendanceData(data || []);
      calculateSalary(data || []);
    } catch (err) {
      console.error('Error in fetchAttendanceForSlip:', err);
      alert('Error processing request');
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = (attendanceRecords) => {
    // Salary calculation logic
    const basicPay = 25000; // Basic salary
    const hra = basicPay * 0.4; // HRA (40% of basic)
    const conveyance = 1600;
    const medicalAllowance = 1250;

    // Total working days aur hours calculate karein
    const totalDays = attendanceRecords.length;
    let totalHours = 0;
    
    attendanceRecords.forEach(record => {
      if (record.signin_time && record.signout_time) {
        try {
          const signin = new Date(record.signin_time);
          const signout = new Date(record.signout_time);
          const hours = (signout - signin) / (1000 * 60 * 60);
          totalHours += hours;
        } catch (err) {
          console.error('Error calculating hours:', err);
        }
      }
    });

    // Deductions
    const professionalTax = 200;
    const pf = basicPay * 0.12; // Provident Fund (12%)

    // Totals
    const grossSalary = basicPay + hra + conveyance + medicalAllowance;
    const totalDeductions = professionalTax + pf;
    const netSalary = grossSalary - totalDeductions;

    setSalaryData({
      basicPay, 
      hra, 
      conveyance, 
      medicalAllowance,
      professionalTax, 
      pf,
      grossSalary, 
      totalDeductions, 
      netSalary,
      totalDays, 
      totalHours: totalHours || 0
    });
  };

  const generatePDF = () => {
    if (!salaryData) return;

    // Print-friendly salary slip banayein
    const printWindow = window.open('', '_blank');
    const employeeName = employees.find(e => e.id === selectedEmployee)?.full_name || 'Unknown Employee';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Slip - VTC Attendance App</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: white;
            }
            .slip-container { 
              max-width: 800px; 
              margin: 0 auto; 
              border: 2px solid #333; 
              padding: 30px; 
              background: white;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 15px; 
              margin-bottom: 25px; 
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #2c5aa0; 
              margin-bottom: 10px;
            }
            .section { 
              margin-bottom: 25px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold; 
            }
            .earnings-table th { 
              background-color: #e8f5e8; 
            }
            .deductions-table th { 
              background-color: #ffe8e8; 
            }
            .total-row { 
              font-weight: bold; 
              background-color: #f0f0f0; 
            }
            .net-salary { 
              font-size: 24px; 
              color: #2c5aa0; 
              font-weight: bold; 
              text-align: center; 
              padding: 20px; 
              background-color: #e8f2ff; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              color: #666; 
              font-size: 12px; 
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .slip-container { border: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <div class="header">
              <div class="company-name">VTC Attendance App</div>
              <h2>Salary Slip</h2>
              <p><strong>Month:</strong> ${selectedMonth}</p>
            </div>
            
            <div class="section">
              <p><strong>Employee Name:</strong> ${employeeName}</p>
              <p><strong>Employee ID:</strong> ${selectedEmployee}</p>
              <p><strong>Generated On:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="section">
              <table class="earnings-table">
                <tr><th colspan="2">💰 EARNINGS</th></tr>
                <tr><td>Basic Pay</td><td>₹${salaryData.basicPay.toLocaleString()}</td></tr>
                <tr><td>House Rent Allowance (HRA)</td><td>₹${salaryData.hra.toLocaleString()}</td></tr>
                <tr><td>Conveyance Allowance</td><td>₹${salaryData.conveyance.toLocaleString()}</td></tr>
                <tr><td>Medical Allowance</td><td>₹${salaryData.medicalAllowance.toLocaleString()}</td></tr>
                <tr class="total-row"><td>Gross Salary</td><td>₹${salaryData.grossSalary.toLocaleString()}</td></tr>
              </table>
            </div>

            <div class="section">
              <table class="deductions-table">
                <tr><th colspan="2">💸 DEDUCTIONS</th></tr>
                <tr><td>Professional Tax</td><td>₹${salaryData.professionalTax.toLocaleString()}</td></tr>
                <tr><td>Provident Fund (PF)</td><td>₹${salaryData.pf.toLocaleString()}</td></tr>
                <tr class="total-row"><td>Total Deductions</td><td>₹${salaryData.totalDeductions.toLocaleString()}</td></tr>
              </table>
            </div>

            <div class="net-salary">
              🎉 NET SALARY: ₹${salaryData.netSalary.toLocaleString()}
            </div>

            <div class="section">
              <p><strong>📊 Working Summary:</strong></p>
              <p>Total Working Days: ${salaryData.totalDays}</p>
              <p>Total Hours Worked: ${salaryData.totalHours.toFixed(2)} hours</p>
            </div>

            <div class="footer">
              <p><em>This is a computer generated salary slip - No signature required</em></p>
              <p>VTC Attendance App | HR Department</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedMonth('');
    setSalaryData(null);
    setAttendanceData([]);
  };

  return (
    <div style={{ 
      background: 'white', 
      padding: '25px', 
      borderRadius: '12px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      margin: '20px 0'
    }}>
      <h2 style={{ 
        color: '#2c5aa0', 
        borderBottom: '3px solid #2c5aa0', 
        paddingBottom: '12px', 
        marginBottom: '25px',
        fontSize: '28px'
      }}>
        💰 Salary Slip Generator
      </h2>
      
      {/* Selection Section */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '25px', 
        borderRadius: '10px', 
        marginBottom: '25px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#495057' }}>Select Employee & Month</h3>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              👤 Select Employee:
            </label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{ 
                width: '100%',
                padding: '12px', 
                border: '2px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              📅 Select Month:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ 
                width: '100%',
                padding: '12px', 
                border: '2px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button 
              onClick={fetchAttendanceForSlip}
              disabled={loading}
              style={{
                padding: '12px 30px',
                background: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                minWidth: '180px'
              }}
            >
              {loading ? '⏳ Generating...' : '🚀 Generate Salary Slip'}
            </button>
          </div>
        </div>
      </div>

      {/* Salary Details Display */}
      {salaryData && (
        <div style={{ 
          background: 'white', 
          padding: '25px', 
          borderRadius: '10px', 
          border: '2px solid #2c5aa0',
          marginTop: '20px'
        }}>
          <h3 style={{ 
            color: '#2c5aa0', 
            borderBottom: '2px solid #2c5aa0', 
            paddingBottom: '12px', 
            marginBottom: '25px',
            fontSize: '24px'
          }}>
            📋 Salary Details for {selectedMonth}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '25px' }}>
            {/* Earnings Section */}
            <div>
              <h4 style={{ color: '#28a745', marginBottom: '15px' }}>💰 Earnings</h4>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
                <p style={{ margin: '10px 0' }}><strong>Basic Pay:</strong> ₹{salaryData.basicPay.toLocaleString()}</p>
                <p style={{ margin: '10px 0' }}><strong>HRA:</strong> ₹{salaryData.hra.toLocaleString()}</p>
                <p style={{ margin: '10px 0' }}><strong>Conveyance:</strong> ₹{salaryData.conveyance.toLocaleString()}</p>
                <p style={{ margin: '10px 0' }}><strong>Medical Allowance:</strong> ₹{salaryData.medicalAllowance.toLocaleString()}</p>
                <p style={{ margin: '10px 0', paddingTop: '10px', borderTop: '1px solid #dee2e6', fontWeight: 'bold', fontSize: '18px' }}>
                  🎯 Gross Salary: ₹{salaryData.grossSalary.toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Deductions Section */}
            <div>
              <h4 style={{ color: '#dc3545', marginBottom: '15px' }}>💸 Deductions</h4>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
                <p style={{ margin: '10px 0' }}><strong>Professional Tax:</strong> ₹{salaryData.professionalTax.toLocaleString()}</p>
                <p style={{ margin: '10px 0' }}><strong>Provident Fund:</strong> ₹{salaryData.pf.toLocaleString()}</p>
                <p style={{ margin: '10px 0', paddingTop: '10px', borderTop: '1px solid #dee2e6', fontWeight: 'bold', fontSize: '18px' }}>
                  📉 Total Deductions: ₹{salaryData.totalDeductions.toLocaleString()}
                </p>
                <div style={{ marginTop: '15px', padding: '15px', background: '#e8f2ff', borderRadius: '6px' }}>
                  <h4 style={{ color: '#2c5aa0', margin: '0', fontSize: '20px' }}>
                    🎉 Net Salary: ₹{salaryData.netSalary.toLocaleString()}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* Working Details */}
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            background: '#e8f5e8', 
            borderRadius: '8px',
            border: '1px solid #28a745'
          }}>
            <h4 style={{ color: '#28a745', marginBottom: '15px' }}>📊 Working Summary</h4>
            <p style={{ margin: '8px 0', fontSize: '16px' }}><strong>Total Working Days:</strong> {salaryData.totalDays}</p>
            <p style={{ margin: '8px 0', fontSize: '16px' }}><strong>Total Hours Worked:</strong> {salaryData.totalHours.toFixed(2)} hours</p>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: '30px', textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={generatePDF}
              style={{
                padding: '15px 35px',
                background: '#2c5aa0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              🖨️ Print Salary Slip
            </button>
            
            <button 
              onClick={resetForm}
              style={{
                padding: '15px 35px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              🔄 Generate New Slip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
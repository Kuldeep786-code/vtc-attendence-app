import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SalarySlipGenerator() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [salaryData, setSalaryData] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);

  // Employees list fetch karein
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, email');
    if (!error) setEmployees(data || []);
  };

  const fetchAttendanceForSlip = async () => {
    if (!selectedEmployee || !selectedMonth) {
      alert('Please select employee and month');
      return;
    }

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
      return;
    }

    setAttendanceData(data || []);
    calculateSalary(data || []);
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
        const signin = new Date(record.signin_time);
        const signout = new Date(record.signout_time);
        const hours = (signout - signin) / (1000 * 60 * 60);
        totalHours += hours;
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
      basicPay, hra, conveyance, medicalAllowance,
      professionalTax, pf,
      grossSalary, totalDeductions, netSalary,
      totalDays, totalHours
    });
  };

  const generatePDF = () => {
    // Print-friendly salary slip banayein
    const printWindow = window.open('', '_blank');
    const employeeName = employees.find(e => e.id === selectedEmployee)?.full_name;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Slip - VTC Attendance App</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .slip-container { max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #2c5aa0; }
            .section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .earnings-table th { background-color: #e8f5e8; }
            .deductions-table th { background-color: #ffe8e8; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
            .net-salary { font-size: 20px; color: #2c5aa0; font-weight: bold; text-align: center; padding: 15px; background-color: #e8f2ff; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <div class="header">
              <div class="company-name">VTC Attendance App</div>
              <h2>Salary Slip</h2>
              <p>Month: ${selectedMonth}</p>
            </div>
            
            <div class="section">
              <p><strong>Employee Name:</strong> ${employeeName}</p>
              <p><strong>Employee ID:</strong> ${selectedEmployee}</p>
            </div>

            <div class="section">
              <table class="earnings-table">
                <tr><th colspan="2">Earnings</th></tr>
                <tr><td>Basic Pay</td><td>₹${salaryData?.basicPay}</td></tr>
                <tr><td>House Rent Allowance (HRA)</td><td>₹${salaryData?.hra}</td></tr>
                <tr><td>Conveyance Allowance</td><td>₹${salaryData?.conveyance}</td></tr>
                <tr><td>Medical Allowance</td><td>₹${salaryData?.medicalAllowance}</td></tr>
                <tr class="total-row"><td>Gross Salary</td><td>₹${salaryData?.grossSalary}</td></tr>
              </table>
            </div>

            <div class="section">
              <table class="deductions-table">
                <tr><th colspan="2">Deductions</th></tr>
                <tr><td>Professional Tax</td><td>₹${salaryData?.professionalTax}</td></tr>
                <tr><td>Provident Fund (PF)</td><td>₹${salaryData?.pf}</td></tr>
                <tr class="total-row"><td>Total Deductions</td><td>₹${salaryData?.totalDeductions}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="net-salary">
                Net Salary: ₹${salaryData?.netSalary}
              </div>
            </div>

            <div class="section">
              <p><strong>Working Days:</strong> ${salaryData?.totalDays}</p>
              <p><strong>Total Hours:</strong> ${salaryData?.totalHours?.toFixed(2)}</p>
            </div>

            <div class="footer">
              <p>This is a computer generated salary slip</p>
              <p>Authorized Signatory</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="vtc-card">
      <h2>💰 Salary Slip Generator</h2>
      
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label><strong>Select Employee:</strong></label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{ padding: '8px', minWidth: '200px', marginLeft: '10px' }}
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label><strong>Select Month:</strong></label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px', marginLeft: '10px' }}
            />
          </div>

          <button 
            onClick={fetchAttendanceForSlip}
            className="vtc-btn-success"
          >
            Generate Salary Slip
          </button>
        </div>
      </div>

      {salaryData && (
        <div className="vtc-card">
          <h3 style={{ color: '#2c5aa0', borderBottom: '2px solid #2c5aa0', paddingBottom: '10px' }}>
            Salary Details for {selectedMonth}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <h4>Earnings</h4>
              <p>Basic Pay: ₹{salaryData.basicPay}</p>
              <p>HRA: ₹{salaryData.hra}</p>
              <p>Conveyance: ₹{salaryData.conveyance}</p>
              <p>Medical Allowance: ₹{salaryData.medicalAllowance}</p>
              <p><strong>Gross Salary: ₹{salaryData.grossSalary}</strong></p>
            </div>
            
            <div>
              <h4>Deductions</h4>
              <p>Professional Tax: ₹{salaryData.professionalTax}</p>
              <p>Provident Fund: ₹{salaryData.pf}</p>
              <p><strong>Total Deductions: ₹{salaryData.totalDeductions}</strong></p>
              <div style={{ marginTop: '15px', padding: '15px', background: '#e8f2ff', borderRadius: '5px' }}>
                <h4 style={{ color: '#2c5aa0', margin: '0' }}>
                  Net Salary: ₹{salaryData.netSalary}
                </h4>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
            <p><strong>Working Details:</strong></p>
            <p>Total Working Days: {salaryData.totalDays}</p>
            <p>Total Hours Worked: {salaryData.totalHours.toFixed(2)}</p>
          </div>

          <div style={{ marginTop: '25px', textAlign: 'center' }}>
            <button 
              onClick={generatePDF}
              className="vtc-btn-primary"
              style={{ marginRight: '15px' }}
            >
              🖨️ Print Salary Slip
            </button>
            
            <button 
              onClick={() => setSalaryData(null)}
              style={{
                padding: '12px 30px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              🔄 Generate New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
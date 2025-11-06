import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDaashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserRole(data?.role || 'employee');
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('employee');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserRole(data.user.id);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    setEmail('');
    setPassword('');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <h1 style={styles.title}>VTC Attendance App</h1>
            <p style={styles.subtitle}>Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.loginButton} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Contact your administrator for account access
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <h2 style={styles.navTitle}>VTC Attendance App</h2>
          <div style={styles.navRight}>
            <span style={styles.roleTag}>
              {userRole?.toUpperCase() || 'USER'}
            </span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ padding: '20px' }}>
        {userRole === 'admin' && <AdminDashboard />}
        {userRole === 'manager' && <ManagerDashboard />}
        {userRole === 'employee' && <EmployeeDashboard />}
        {userRole === 'hr' && <AdminDashboard />}
        {userRole === 'temp_vendor' && <EmployeeDashboard />}
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '20px',
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '10px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#6b7280',
  },
  navbar: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '16px 24px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  navContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  navTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  roleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'white',
    color: '#3b82f6',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default App;
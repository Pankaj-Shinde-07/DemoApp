import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiRequest('/admin/login', 'POST', form);
      localStorage.setItem('demoapp_admin_token', data.accessToken);
      localStorage.setItem('demoapp_admin', JSON.stringify(data.admin));
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Admin Panel</h2>
        <p className="subtitle">DemoApp Administration</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem'
        }}>
          <div>
            <span style={{ color: '#64748B' }}>Admin Account:</span>{' '}
            <strong style={{ color: '#0F172A' }}>admin</strong> / <strong style={{ color: '#0F172A' }}>Admin@123</strong>
          </div>
          <button
            type="button"
            onClick={() => setForm({ username: 'admin', password: 'Admin@123' })}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#2563EB',
              borderRadius: '5px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Auto-fill
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handle} placeholder="admin" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handle} placeholder="Admin@123" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Logging in...' : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

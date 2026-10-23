import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiRequest('/users/login', 'POST', form);
      login(data.accessToken, data.user);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="subtitle">Login to DemoApp</p>
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
            <span style={{ color: '#64748B' }}>Demo Account:</span>{' '}
            <strong style={{ color: '#0F172A' }}>user1@example.com</strong>
          </div>
          <button
            type="button"
            onClick={() => setForm({ email: 'user1@example.com', password: 'Demo@1234' })}
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
            <label>Email Address</label>
            <input type="email" name="email" value={form.email} onChange={handle} placeholder="user@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handle} placeholder="Password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-links">
          Don't have an account? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

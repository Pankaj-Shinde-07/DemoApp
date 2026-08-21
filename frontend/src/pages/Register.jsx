import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', mobileNumber: '', password: '',
    dateOfBirth: '', gender: 'prefer_not_to_say',
    address: '', city: '', state: '', postalCode: ''
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await apiRequest('/users/register', 'POST', form);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="subtitle">Register with DemoApp</p>
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input name="fullName" value={form.fullName} onChange={handle} placeholder="Demo User" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" value={form.email} onChange={handle} placeholder="user@example.com" required />
            </div>
            <div className="form-group">
              <label>Mobile Number *</label>
              <input name="mobileNumber" value={form.mobileNumber} onChange={handle} placeholder="9000000001" required />
            </div>
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" name="password" value={form.password} onChange={handle} placeholder="Min 6 characters" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={form.gender} onChange={handle}>
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <input name="address" value={form.address} onChange={handle} placeholder="Street address" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input name="city" value={form.city} onChange={handle} placeholder="Mumbai" />
            </div>
            <div className="form-group">
              <label>State</label>
              <input name="state" value={form.state} onChange={handle} placeholder="Maharashtra" />
            </div>
          </div>
          <div className="form-group">
            <label>Postal Code</label>
            <input name="postalCode" value={form.postalCode} onChange={handle} placeholder="400001" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="auth-links">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

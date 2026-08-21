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
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    if (!privacyAgreed) {
      setError('You must accept the Privacy Policy Notice to register.');
      return;
    }
    setError(''); setSuccess(''); setLoading(true);
    try {
      await apiRequest('/users/register', 'POST', {
        ...form,
        consents: {
          ACCOUNT_SERVICE: true,
          SERVICE_COMMUNICATION: true,
          MARKETING: marketingConsent,
          ANALYTICS: analyticsConsent
        }
      });
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
          {/* DPDPA STATUTORY CONSENT SECTION */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1E1B4B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛡️</span> DPDPA Statutory Privacy & Consent Declarations
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                id="regPrivacyPolicy"
                checked={privacyAgreed}
                onChange={e => setPrivacyAgreed(e.target.checked)}
                required
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="regPrivacyPolicy" style={{ fontSize: '0.8rem', color: '#334155', cursor: 'pointer', lineHeight: '1.4' }}>
                <span style={{ color: '#DC2626', fontWeight: 'bold' }}>*</span> I have read and agree to the <Link to="/privacy-policy" target="_blank" style={{ color: '#4F46E5', textDecoration: 'underline' }}>Privacy Policy Notice</Link> and authorize processing of essential personal data for account operations under DPDPA Section 5 & 6.
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: '4px' }}>
              <input
                type="checkbox"
                id="regMarketing"
                checked={marketingConsent}
                onChange={e => setMarketingConsent(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="regMarketing" style={{ fontSize: '0.78rem', color: '#64748B', cursor: 'pointer' }}>
                (Optional) I consent to marketing communications & promotional discounts.
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
              <input
                type="checkbox"
                id="regAnalytics"
                checked={analyticsConsent}
                onChange={e => setAnalyticsConsent(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="regAnalytics" style={{ fontSize: '0.78rem', color: '#64748B', cursor: 'pointer' }}>
                (Optional) I consent to anonymous product telemetry & experience analytics.
              </label>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading || !privacyAgreed}>
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

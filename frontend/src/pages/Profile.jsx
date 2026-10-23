import { useState, useEffect } from 'react';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [msg,     setMsg]     = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest(`/users/${user.id}`, 'GET', null, token)
      .then(d => { setProfile(d.user); setForm(d.user); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async e => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await apiRequest(`/users/${user.id}`, 'PUT', form, token);
      setMsg('Profile updated successfully.');
      setProfile({ ...profile, ...form });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Your personal information stored in DemoApp</p>
      </div>

      <div className="test-banner">
        <strong>DPDPA Test Scenario Active</strong>
        This profile API returns all personal data fields including dateOfBirth, mobileNumber and address.
        The external DPDPA Audit Platform will detect this as excessive data exposure (RULE-006).
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
          color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', fontWeight: '800', flexShrink: 0
        }}>
          {profile?.fullName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            {profile?.fullName || 'User Profile'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{profile?.email}</span>
            <span className="badge badge-green">DPDPA Principal</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
          <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Personal Information</h3>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              Edit Details
            </button>
          )}
        </div>
        {!editing ? (
          <>
            <div className="profile-info">
              {[
                ['Full Name',    profile?.fullName],
                ['Email Address',profile?.email],
                ['Mobile Number',profile?.mobileNumber ? `${profile.mobileNumber.slice(0,3)}****${profile.mobileNumber.slice(-3)}` : '-'],
                ['Date of Birth',profile?.dateOfBirth?.slice(0,10) || '-'],
                ['Gender',       profile?.gender || '-'],
                ['City',         profile?.city || '-'],
                ['State',        profile?.state || '-'],
                ['Postal Code',  profile?.postalCode || '-'],
              ].map(([label, val]) => (
                <div className="info-item" key={label}>
                  <label>{label}</label>
                  <p>{val || '-'}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={save}>
            <div className="form-group">
              <label>Full Name</label>
              <input name="fullName" value={form.fullName || ''} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input name="address" value={form.address || ''} onChange={handle} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input name="city" value={form.city || ''} onChange={handle} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input name="state" value={form.state || ''} onChange={handle} />
              </div>
            </div>
            <div className="form-group">
              <label>Postal Code</label>
              <input name="postalCode" value={form.postalCode || ''} onChange={handle} />
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" type="submit" style={{ width: 'auto' }}>Save</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

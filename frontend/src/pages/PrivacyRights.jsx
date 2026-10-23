import { useState } from 'react';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function PrivacyRights() {
  const { user, token } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [grievance, setGrievance]     = useState({ category: 'DATA_EXPOSURE', complaintDetails: '' });
  const [nominee, setNominee]         = useState({ nomineeName: '', nomineeEmail: '', nomineeMobile: '', relationship: 'Family' });
  const [msg, setMsg]                 = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // 1. Download My Data Archive (Sec 11)
  const handleDownload = async () => {
    setDownloading(true); setError(''); setMsg('');
    try {
      const data = await apiRequest(`/users/${user.id}/download-data`, 'GET', null, token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DemoApp_Data_Principal_Archive_${user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Personal data archive downloaded successfully under DPDPA Section 11.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // 2. Submit Grievance (Sec 13)
  const handleGrievance = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const res = await apiRequest(`/users/${user.id}/grievance`, 'POST', grievance, token);
      setMsg(`${res.message} (Grievance ID: ${res.grievanceId})`);
      setGrievance({ category: 'DATA_EXPOSURE', complaintDetails: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Nominate Representative (Sec 14)
  const handleNomination = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const res = await apiRequest(`/users/${user.id}/nominate`, 'POST', nominee, token);
      setMsg(`${res.message} (Nomination ID: ${res.nominationId})`);
      setNominee({ nomineeName: '', nomineeEmail: '', nomineeMobile: '', relationship: 'Family' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>Data Principal Privacy & Rights Portal</h1>
        <p>Exercise your statutory rights under the Digital Personal Data Protection Act (DPDPA) 2023</p>
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* SECTION 11: ACCESS & PORTABILITY */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="badge badge-blue">DPDPA Section 11</span>
            <h3 style={{ margin: '6px 0' }}>Right to Access & Data Portability</h3>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Obtain a machine-readable summary of all your personal data, active consents, and processing events.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
            {downloading ? 'Exporting...' : 'Download My Data (JSON)'}
          </button>
        </div>
      </div>

      {/* SECTION 12: ERASURE & CORRECTION */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="badge badge-yellow">DPDPA Section 12</span>
            <h3 style={{ margin: '6px 0' }}>Right to Correction & Erasure</h3>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Update inaccurate personal details or request permanent erasure of your account.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/profile" className="btn btn-secondary btn-sm">Edit Profile</Link>
            <Link to="/deletion" className="btn btn-danger btn-sm">Request Erasure</Link>
          </div>
        </div>
      </div>

      {/* SECTION 13: GRIEVANCE REDRESSAL */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <span className="badge badge-red">DPDPA Section 13</span>
        <h3 style={{ margin: '6px 0' }}>Right of Grievance Redressal</h3>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Submit a privacy or data protection concern directly to our Grievance Redressal Officer (7 business days response window).
        </p>
        <form onSubmit={handleGrievance}>
          <div className="form-group">
            <label>Grievance Category</label>
            <select
              value={grievance.category}
              onChange={e => setGrievance({ ...grievance, category: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="DATA_EXPOSURE">Unauthorized Personal Data Exposure</option>
              <option value="PURPOSE_VIOLATION">Processing Beyond Declared Purpose</option>
              <option value="CONSENT_WITHDRAWAL_IGNORED">Consent Withdrawal Not Respected</option>
              <option value="RETENTION_COMPLAINT">Data Retained Beyond Mandated Period</option>
              <option value="OTHER">Other Privacy Concern</option>
            </select>
          </div>
          <div className="form-group">
            <label>Complaint Details</label>
            <textarea
              value={grievance.complaintDetails}
              onChange={e => setGrievance({ ...grievance, complaintDetails: e.target.value })}
              rows={3}
              placeholder="Describe your privacy concern or observed compliance discrepancy..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
              required
            />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={loading} style={{ width: 'auto' }}>
            {loading ? 'Submitting...' : 'Submit Grievance Complaint'}
          </button>
        </form>
      </div>

      {/* SECTION 14: RIGHT TO NOMINATE */}
      <div className="card">
        <span className="badge badge-green">DPDPA Section 14</span>
        <h3 style={{ margin: '6px 0' }}>Right to Nominate Representative</h3>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Designate an individual who shall exercise your data principal rights in the event of death or incapacity.
        </p>
        <form onSubmit={handleNomination}>
          <div className="form-row">
            <div className="form-group">
              <label>Nominee Full Name *</label>
              <input
                value={nominee.nomineeName}
                onChange={e => setNominee({ ...nominee, nomineeName: e.target.value })}
                placeholder="Nominee Name"
                required
              />
            </div>
            <div className="form-group">
              <label>Nominee Email *</label>
              <input
                type="email"
                value={nominee.nomineeEmail}
                onChange={e => setNominee({ ...nominee, nomineeEmail: e.target.value })}
                placeholder="nominee@example.com"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Nominee Mobile</label>
              <input
                value={nominee.nomineeMobile}
                onChange={e => setNominee({ ...nominee, nomineeMobile: e.target.value })}
                placeholder="9876543210"
              />
            </div>
            <div className="form-group">
              <label>Relationship</label>
              <input
                value={nominee.relationship}
                onChange={e => setNominee({ ...nominee, relationship: e.target.value })}
                placeholder="e.g. Spouse / Parent / Legal Representative"
              />
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" type="submit" disabled={loading} style={{ width: 'auto' }}>
            {loading ? 'Saving...' : 'Register Nominee'}
          </button>
        </form>
      </div>
    </div>
  );
}

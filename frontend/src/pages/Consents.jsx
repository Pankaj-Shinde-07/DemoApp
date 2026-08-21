import { useState, useEffect } from 'react';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

const PURPOSE_DESC = {
  ACCOUNT_SERVICE:       'Required for account creation and management.',
  SERVICE_COMMUNICATION: 'Used to send service-related notifications.',
  MARKETING:             'Used for promotional emails and offers.',
  ANALYTICS:             'Used to analyze usage patterns and improve services.',
};

export default function Consents() {
  const { user, token } = useAuth();
  const [consents, setConsents] = useState([]);
  const [msg,      setMsg]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(null);

  const fetchConsents = () =>
    apiRequest(`/consents/${user.id}`, 'GET', null, token)
      .then(d => setConsents(d.consents))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { fetchConsents(); }, []);

  const grant = async (purpose) => {
    setMsg(''); setError(''); setBusy(purpose);
    try {
      await apiRequest('/consents', 'POST', { userId: user.id, purpose }, token);
      setMsg(`Consent granted for ${purpose}.`);
      await fetchConsents();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const withdraw = async (consentId, purpose) => {
    setMsg(''); setError(''); setBusy(purpose);
    try {
      await apiRequest(`/consents/${consentId}/withdraw`, 'POST', {}, token);
      setMsg(`Consent withdrawn for ${purpose}. (DPDPA Test: marketing processing event still emitted — check admin events.)`);
      await fetchConsents();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="loading">Loading consents...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Consent Management</h1>
        <p>Manage your data processing consents</p>
      </div>

      <div className="test-banner">
        <strong>⚠ DPDPA Test Scenario Active</strong>
        Withdrawing MARKETING consent will still trigger a MARKETING_PROCESSING event in the backend.
        This is an intentional CONSENT_ENFORCEMENT test case (RULE-005) for the external DPDPA Audit Platform.
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="consent-grid">
        {consents.map(c => (
          <div className={`consent-card ${c.status.toLowerCase()}`} key={c.id}>
            <h4>{c.purpose.replace(/_/g, ' ')}</h4>
            <span className={`consent-status status-${c.status}`}>{c.status}</span>
            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '0.8rem' }}>
              {PURPOSE_DESC[c.purpose]}
            </p>
            {c.status === 'GRANTED' && c.purpose !== 'ACCOUNT_SERVICE' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => withdraw(c.id, c.purpose)}
                disabled={busy === c.purpose}
              >
                {busy === c.purpose ? 'Processing...' : 'Withdraw Consent'}
              </button>
            )}
            {(c.status === 'WITHDRAWN' || c.status === 'PENDING') && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => grant(c.purpose)}
                disabled={busy === c.purpose}
              >
                {busy === c.purpose ? 'Processing...' : 'Grant Consent'}
              </button>
            )}
            {c.status === 'GRANTED' && c.purpose === 'ACCOUNT_SERVICE' && (
              <span style={{ fontSize: '0.78rem', color: '#888' }}>Required — cannot withdraw</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

const PURPOSE_META = {
  ACCOUNT_SERVICE: {
    title: '1. Account & Core Service',
    section: 'DPDPA Sec 6(1)',
    desc: 'Essential authentication, session security, and order fulfillment. Required for platform operation.',
    isMandatory: true,
  },
  SERVICE_COMMUNICATION: {
    title: '2. Service Communications & Alerts',
    section: 'DPDPA Sec 6(1)',
    desc: 'Transactional SMS notifications, OTP authentication, and account delivery updates.',
    isMandatory: false,
  },
  MARKETING: {
    title: '3. Promotional Marketing & Offers',
    section: 'DPDPA Sec 6(4)',
    desc: 'Personalized discount campaigns, seasonal sales, and commercial product promotions.',
    isMandatory: false,
  },
  ANALYTICS: {
    title: '4. Telemetry & Product Analytics',
    section: 'DPDPA Sec 6(1)',
    desc: 'Anonymous behavioral telemetry, navigation analytics, and platform reliability insights.',
    isMandatory: false,
  },
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
      .then(d => setConsents(d.consents || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { fetchConsents(); }, []);

  const grant = async (purpose) => {
    setMsg(''); setError(''); setBusy(purpose);
    try {
      await apiRequest('/consents', 'POST', { userId: user.id, purpose }, token);
      setMsg(`✓ Consent granted for ${purpose}.`);
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
      setMsg(`✕ Consent withdrawn/rejected for ${purpose}. (Emitted DPDPA withdrawal event)`);
      await fetchConsents();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const bulkAction = async (actionType) => {
    setMsg(''); setError(''); setBusy('BULK');
    try {
      for (const c of consents) {
        if (c.purpose === 'ACCOUNT_SERVICE') continue;
        if (actionType === 'ACCEPT_ALL' && c.status !== 'GRANTED') {
          await apiRequest('/consents', 'POST', { userId: user.id, purpose: c.purpose }, token);
        } else if (actionType === 'REJECT_ALL' && c.status === 'GRANTED') {
          await apiRequest(`/consents/${c.id}/withdraw`, 'POST', {}, token);
        }
      }
      setMsg(actionType === 'ACCEPT_ALL' ? '✓ All optional privacy policies accepted.' : '✕ All optional privacy policies rejected/withdrawn.');
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Consent & Privacy Policy Management</h1>
          <p>DPDPA Statutory Consent Portal (Section 6) — Accept, reject, or withdraw granular processing permissions.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => bulkAction('ACCEPT_ALL')}
            disabled={busy !== null}
          >
            ✓ Accept All Policies
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => bulkAction('REJECT_ALL')}
            disabled={busy !== null}
          >
            ✕ Reject All Optional
          </button>
          <Link to="/privacy-policy" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            📄 View Full Notice
          </Link>
        </div>
      </div>

      <div className="test-banner">
        <strong>🛡️ DPDPA Section 6(4) Compliance Gate:</strong>
        As a Data Principal, you have the statutory right to give, modify, or withdraw consent at any time.
        Withdrawing <code>MARKETING</code> consent emits a statutory <code>CONSENT_WITHDRAWN</code> event to the PrivGuard Auditor.
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="consent-grid">
        {consents.map(c => {
          const meta = PURPOSE_META[c.purpose] || {
            title: c.purpose.replace(/_/g, ' '),
            section: 'DPDPA Sec 6',
            desc: 'Data processing activity.',
            isMandatory: false
          };

          const isGranted = c.status === 'GRANTED';

          return (
            <div className={`consent-card ${isGranted ? 'granted' : 'withdrawn'}`} key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{meta.title}</h4>
                <span className={`consent-status status-${c.status}`}>{c.status}</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#4F46E5', fontWeight: '600', marginBottom: '6px' }}>
                Statutory Reference: {meta.section}
              </div>

              <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                {meta.desc}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  {c.grantedAt ? `Granted: ${new Date(c.grantedAt).toLocaleDateString()}` : c.withdrawnAt ? `Withdrawn: ${new Date(c.withdrawnAt).toLocaleDateString()}` : 'Decision: Pending'}
                </span>

                {meta.isMandatory ? (
                  <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '700', background: '#DCFCE7', padding: '3px 8px', borderRadius: '4px' }}>
                    ✓ Essential Required
                  </span>
                ) : isGranted ? (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => withdraw(c.id, c.purpose)}
                    disabled={busy !== null}
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                  >
                    {busy === c.purpose ? 'Saving...' : '✕ Reject / Withdraw'}
                  </button>
                ) : (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => grant(c.purpose)}
                    disabled={busy !== null}
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                  >
                    {busy === c.purpose ? 'Saving...' : '✓ Accept Policy'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

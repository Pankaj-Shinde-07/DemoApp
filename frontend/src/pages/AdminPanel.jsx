import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/api';

const TABS = ['Users', 'Orders', 'Consents', 'Events', 'Audit Logs', 'Deletion Requests', 'DPDPA Testbed'];

const adminApi = (endpoint, token) => apiRequest(endpoint, 'GET', null, token);

export default function AdminPanel() {
  const navigate = useNavigate();
  const token = localStorage.getItem('demoapp_admin_token');
  const admin = JSON.parse(localStorage.getItem('demoapp_admin') || '{}');

  const [tab,     setTab]     = useState('Users');
  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const logout = () => {
    localStorage.removeItem('demoapp_admin_token');
    localStorage.removeItem('demoapp_admin');
    navigate('/admin/login');
  };

  const fetchTab = async (t) => {
    if (t === 'DPDPA Testbed') {
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    const map = {
      'Users':             '/admin/users',
      'Orders':            '/admin/orders',
      'Consents':          '/admin/consents',
      'Events':            '/admin/events?limit=100',
      'Audit Logs':        '/admin/audit-logs?limit=100',
      'Deletion Requests': '/admin/deletion-requests',
    };
    try {
      const res = await adminApi(map[t], token);
      setData(d => ({ ...d, [t]: res }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTab(tab); }, [tab]);

  const renderUsers = (d) => (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>City</th><th>Active</th><th>Registered</th></tr></thead>
        <tbody>
          {(d?.users || []).map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.fullName}</td>
              <td>{u.email}</td>
              <td>{u.mobileNumber}</td>
              <td>{u.city || '-'}</td>
              <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Yes' : 'No'}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOrders = (d) => (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>ID</th><th>User</th><th>Email</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
        <tbody>
          {(d?.orders || []).map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.fullName}</td>
              <td>{o.email}</td>
              <td><span className="badge badge-blue">{o.status}</span></td>
              <td>₹{parseFloat(o.totalAmount).toFixed(2)}</td>
              <td style={{ fontSize: '0.8rem' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderConsents = (d) => (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>ID</th><th>User</th><th>Email</th><th>Purpose</th><th>Status</th><th>Granted</th><th>Withdrawn</th></tr></thead>
        <tbody>
          {(d?.consents || []).map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.fullName}</td>
              <td>{c.email}</td>
              <td>{c.purpose}</td>
              <td>
                <span className={`badge ${c.status === 'GRANTED' ? 'badge-green' : c.status === 'WITHDRAWN' ? 'badge-red' : 'badge-yellow'}`}>
                  {c.status}
                </span>
              </td>
              <td style={{ fontSize: '0.8rem' }}>{c.grantedAt ? new Date(c.grantedAt).toLocaleDateString() : '-'}</td>
              <td style={{ fontSize: '0.8rem' }}>{c.withdrawnAt ? new Date(c.withdrawnAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderEvents = (d) => (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>ID</th><th>Event Type</th><th>User ID</th><th>Data Fields</th><th>Purpose</th><th>Time</th></tr></thead>
        <tbody>
          {(d?.events || []).map(e => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>
                <span className={`badge ${e.eventType.includes('MARKETING') ? 'badge-red' : e.eventType.includes('CONSENT') ? 'badge-yellow' : 'badge-blue'}`}>
                  {e.eventType}
                </span>
              </td>
              <td>{e.userId || '-'}</td>
              <td style={{ fontSize: '0.78rem' }}>
                {Array.isArray(e.dataFields)
                  ? e.dataFields.join(', ')
                  : typeof e.dataFields === 'string'
                  ? (() => {
                      try {
                        const parsed = JSON.parse(e.dataFields);
                        return Array.isArray(parsed) ? parsed.join(', ') : e.dataFields;
                      } catch {
                        return e.dataFields;
                      }
                    })()
                  : '-'}
              </td>
              <td style={{ fontSize: '0.8rem' }}>{e.purpose || '-'}</td>
              <td style={{ fontSize: '0.78rem' }}>{new Date(e.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderLogs = (d) => (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>ID</th><th>Level</th><th>Action</th><th>User ID</th><th>Message</th><th>Time</th></tr></thead>
        <tbody>
          {(d?.logs || []).map(l => (
            <tr key={l.id}>
              <td>{l.id}</td>
              <td>
                <span className={`badge ${l.level === 'ERROR' ? 'badge-red' : l.level === 'WARN' ? 'badge-yellow' : 'badge-blue'}`}>
                  {l.level}
                </span>
              </td>
              <td style={{ fontSize: '0.8rem' }}>{l.action}</td>
              <td>{l.userId || '-'}</td>
              <td style={{ fontSize: '0.78rem', maxWidth: '320px', wordBreak: 'break-word' }}>{l.message}</td>
              <td style={{ fontSize: '0.78rem' }}>{new Date(l.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDeletion = (d) => (
    <div className="table-wrapper">
      <table>
        <thead><tr><th>Request ID</th><th>User</th><th>Email</th><th>Status</th><th>Reason</th><th>Requested</th></tr></thead>
        <tbody>
          {(d?.requests || []).map(r => (
            <tr key={r.id}>
              <td style={{ fontSize: '0.78rem' }}>{r.requestId}</td>
              <td>{r.fullName}</td>
              <td>{r.email}</td>
              <td><span className={`badge ${r.status === 'COMPLETED' ? 'badge-green' : r.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span></td>
              <td style={{ fontSize: '0.8rem' }}>{r.reason || '-'}</td>
              <td style={{ fontSize: '0.78rem' }}>{new Date(r.requestedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const [testResult, setTestResult] = useState(null);
  const [triggering, setTriggering] = useState(false);

  const triggerTest = async (scenarioId) => {
    setTriggering(true);
    setTestResult(null);
    try {
      const res = await apiRequest(`/audit-feed/trigger-test/${scenarioId}`, 'POST');
      setTestResult(res);
      // refresh tabs data in background
      fetchTab('Events');
      fetchTab('Audit Logs');
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTriggering(false);
    }
  };

  const renderTestbed = () => (
    <div>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
        Trigger intentional DPDPA non-compliance scenarios on demand. The external PrivGuard platform will detect these in real-time.
      </p>

      {testResult && (
        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>
          <strong>{testResult.success ? `✓ ${testResult.scenarioId} Triggered Successfully` : 'Trigger Failed'}</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>{testResult.message}</p>
          {testResult.rule && <span className="badge badge-blue" style={{ marginTop: '6px' }}>Target: {testResult.rule} ({testResult.severity})</span>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #C43232', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-red">TEST-001 | HIGH</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-001</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Personal Data in Logs</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Logs raw user name, email, and mobile into unmasked application log files and DB table.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-001')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-001'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #B54708', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-yellow">TEST-002 | HIGH</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-006</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Excessive API Data Exposure</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Profile endpoint returns excessive fields (DOB, address, gender, postal code).
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-002')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-002'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #5B21B6', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-red" style={{ background: '#5B21B6' }}>TEST-003 | CRITICAL</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-005</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Consent Enforcement Failure</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Emits a MARKETING_PROCESSING event after a user executes CONSENT_WITHDRAWN.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-003')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-003'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #B54708', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-yellow">TEST-004 | HIGH</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-003</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Purpose-Use Mismatch</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Processes mobile number during order flow when declared purpose is strictly OTP verification.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-004')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-004'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #18794E', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-green">TEST-005 | MEDIUM</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-007</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Retention Window Exceeded</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Creates a 410-day-old marketing processing record (declared retention is 365 days).
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-005')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-005'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #5B21B6', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-red" style={{ background: '#5B21B6' }}>TEST-006 | CRITICAL</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-001 (Sec 8)</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>PAN Card / Sensitive PII Logged</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Plain-text PAN identity card number is logged during identity/KYC processing.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-006')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-006'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #18794E', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-blue">TEST-007 | MEDIUM</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>RULE-010 (Sec 12)</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Data Principal Right to Erasure</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Submits a user deletion/erasure request under DPDPA Section 12 for compliance verification.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-007')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-007'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #DC2626', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-red" style={{ background: '#DC2626' }}>TEST-008 | CRITICAL</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>PRIVACY DRIFT</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>Architectural Privacy Drift</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Reroutes auth mobile numbers to unapproved marketing-service violating Behavior Contracts.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-008')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-008'}
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #7F1D1D', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-red" style={{ background: '#7F1D1D' }}>TEST-009 | CRITICAL</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>SECRET LEAK</span>
          </div>
          <h4 style={{ margin: '8px 0 4px 0' }}>High-Entropy API Key / Token Leak</h4>
          <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '12px' }}>
            Logs live high-entropy Stripe API credentials into application webhook logs.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => triggerTest('TEST-009')} disabled={triggering}>
            {triggering ? 'Triggering...' : 'Fire TEST-009'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (tab === 'DPDPA Testbed')  return renderTestbed();
    if (loading) return <div className="loading">Loading...</div>;
    if (error)   return <div className="alert alert-error">{error}</div>;
    const d = data[tab];
    if (!d)      return <div className="loading">No data.</div>;
    if (tab === 'Users')             return renderUsers(d);
    if (tab === 'Orders')            return renderOrders(d);
    if (tab === 'Consents')          return renderConsents(d);
    if (tab === 'Events')            return renderEvents(d);
    if (tab === 'Audit Logs')        return renderLogs(d);
    if (tab === 'Deletion Requests') return renderDeletion(d);
  };

  const [resetting, setResetting] = useState(false);

  const resetSeeds = async () => {
    if (!window.confirm('Reset DemoApp database to clean initial seed state?')) return;
    setResetting(true);
    try {
      await apiRequest('/admin/reset-demo-data', 'POST', {}, token);
      alert('DemoApp database successfully reset to clean seed state.');
      fetchTab('Events');
      fetchTab('Audit Logs');
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Admin Panel</h1>
          <p>Logged in as: {admin.username}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={resetSeeds} disabled={resetting}>
            {resetting ? 'Resetting...' : 'Reset Seeds'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="test-banner">
        <strong>DemoApp Admin — Evidence View for DPDPA Audit Platform</strong>
        This panel shows all personal data, events, logs and consent records generated by DemoApp.
        The external DPDPA Audit Platform ingests this evidence to detect compliance risks.
      </div>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="card">
        <h3>{tab}</h3>
        {renderContent()}
      </div>
    </div>
  );
}

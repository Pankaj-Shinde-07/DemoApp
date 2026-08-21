import { useState } from 'react';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Deletion() {
  const { user, token } = useAuth();
  const [reason,  setReason]  = useState('');
  const [msg,     setMsg]     = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setMsg(''); setError(''); setLoading(true);
    try {
      const data = await apiRequest(`/users/${user.id}/deletion-request`, 'POST', { reason }, token);
      setMsg(`Deletion request submitted. Request ID: ${data.requestId}`);
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Request Data Deletion</h1>
        <p>Submit a request to delete your personal data from DemoApp</p>
      </div>

      <div className="card" style={{ maxWidth: '560px' }}>
        <h3>Data Deletion Request</h3>

        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <strong>What gets deleted:</strong> Your profile, orders, and consent records will be marked for deletion.
          <br /><br />
          <strong>What is retained:</strong> Audit logs and security records are retained for legal/security purposes.
          This is an intentional behavior — the external DPDPA Audit Platform will analyze whether deletion behavior
          matches the declared data handling policy.
        </div>

        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Reason (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for deletion request..."
              rows={3}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
            />
          </div>
          <button className="btn btn-danger" type="submit" disabled={loading} style={{ width: 'auto', padding: '10px 28px' }}>
            {loading ? 'Submitting...' : 'Submit Deletion Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  PENDING:    'badge-yellow',
  CONFIRMED:  'badge-blue',
  PROCESSING: 'badge-blue',
  SHIPPED:    'badge-blue',
  DELIVERED:  'badge-green',
  CANCELLED:  'badge-red',
};

export default function Orders() {
  const { user, token } = useAuth();
  const [events,  setEvents]  = useState([]);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest(`/users/${user.id}/events`, 'GET', null, token)
      .then(d => setEvents(d.events.filter(e => e.eventType === 'ORDER_CREATED' || e.eventType === 'ORDER_VIEWED')))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Orders</h1>
        <p>Your order history and data processing events</p>
      </div>

      <div className="test-banner">
        <strong>⚠ DPDPA Test Scenario Active</strong>
        Order events include mobileNumber even though its declared purpose is OTP verification only.
        This is a PURPOSE_MISMATCH test case for the external DPDPA Audit Platform.
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Order Events ({events.length})</h3>
        {events.length === 0 ? (
          <p style={{ color: '#888' }}>No orders yet. Go to Products to place an order.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Data Fields</th>
                  <th>Purpose</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id}>
                    <td><span className="badge badge-blue">{e.eventType}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>
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
                    <td>{e.purpose}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiRequest } from '../api/api';

export default function PrivacyPolicy() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/audit-feed/policy')
      .then(d => setPolicy(d.policy))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading Privacy Policy...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>{policy?.title || 'Digital Personal Data Protection Notice'}</h1>
        <p>Issued under Section 5 & 6 of DPDP Act 2023 and DPDP Rules 2025</p>
      </div>

      <div className="test-banner">
        <strong>📋 Itemized Privacy Notice (DPDPA Statutory Standard)</strong>
        Under DPDP Rules 2025, Data Fiduciaries must present clear, standalone notices itemizing the personal data
        collected, specified purposes, and principal rights. External auditors (PrivGuard) parse this notice against actual runtime behavior.
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>1. Data Fiduciary Identity</h3>
        <p><b>Name:</b> {policy?.fiduciary?.name || 'DemoApp Technologies Pvt. Ltd.'}</p>
        <p><b>Registered Address:</b> {policy?.fiduciary?.address || 'BKC, Mumbai, Maharashtra 400051'}</p>
        <p><b>Data Protection Officer (DPO):</b> <code>{policy?.fiduciary?.dpoContact || 'dpo@demoapp.local'}</code></p>
        <p><b>Grievance Redressal Officer:</b> <code>{policy?.fiduciary?.grievanceOfficer || 'grievance@demoapp.local'}</code></p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>2. Itemized Personal Data & Specified Purposes</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Purpose</th>
                <th>Lawful Basis</th>
                <th>Personal Data Collected</th>
                <th>Retention Schedule</th>
              </tr>
            </thead>
            <tbody>
              {(policy?.itemizedPurposes || []).map((p, idx) => (
                <tr key={idx}>
                  <td><b>{p.purpose}</b></td>
                  <td><span className="badge badge-blue">{p.lawfulBasis}</span></td>
                  <td>{p.personalDataCollected?.join(', ')}</td>
                  <td><span className="badge badge-yellow">{p.retentionPeriod}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>3. Data Principal Statutory Rights</h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li><b>Right to Access:</b> Review active data processing events under My Profile / Orders.</li>
          <li><b>Right to Correction & Updating:</b> Edit personal details via My Profile.</li>
          <li><b>Right to Erasure:</b> Submit formal data deletion requests via the Delete Data page.</li>
          <li><b>Right to Withdraw Consent:</b> Freely grant or revoke optional processing via the Consents tab.</li>
          <li><b>Right to Grievance Redressal:</b> Contact our designated Grievance Officer.</li>
        </ul>
      </div>
    </div>
  );
}

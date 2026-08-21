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
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Statutory Notice</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DPDP Act 2023 & DPDP Rules 2025</span>
        </div>
        <h1>{policy?.title || 'DemoApp Digital Privacy Notice'}</h1>
        <p>Issued under Section 5 & 6 of the Digital Personal Data Protection Act (DPDPA) 2023</p>
      </div>

      <div className="test-banner">
        <strong>📋 Itemized Privacy Notice (DPDPA Statutory Standard):</strong>
        Under DPDP Rules 2025, Data Fiduciaries must present clear, standalone notices itemizing the personal data
        collected, specified purposes, retention schedules, and principal rights. External auditors (PrivGuard) parse this notice against actual runtime behavior.
      </div>

      {/* 1. Data Fiduciary Identity */}
      <div className="card">
        <h3>1. Data Fiduciary Identity & Governance</h3>
        <div className="profile-info" style={{ marginTop: '0.8rem' }}>
          <div className="info-item">
            <label>Legal Entity</label>
            <p>{policy?.fiduciary?.name || 'DemoApp Technologies Pvt. Ltd.'}</p>
          </div>
          <div className="info-item">
            <label>Registered Office</label>
            <p>{policy?.fiduciary?.address || 'BKC, Mumbai, Maharashtra 400051'}</p>
          </div>
          <div className="info-item">
            <label>Data Protection Officer (DPO)</label>
            <p><code>{policy?.fiduciary?.dpoContact || 'dpo@demoapp.local'}</code></p>
          </div>
          <div className="info-item">
            <label>Grievance Redressal Officer</label>
            <p><code>{policy?.fiduciary?.grievanceOfficer || 'grievance@demoapp.local'}</code></p>
          </div>
        </div>
      </div>

      {/* 2. Itemized Purposes & Personal Data */}
      <div className="card">
        <h3>2. Itemized Personal Data & Specified Purposes</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Specified Purpose</th>
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
                  <td style={{ fontSize: '0.84rem' }}>{p.personalDataCollected?.join(', ')}</td>
                  <td><span className="badge badge-yellow">{p.retentionPeriod}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Statutory Rights */}
      <div className="card">
        <h3>3. Data Principal Statutory Rights (Sections 11–14)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              1. Right to Access (Sec 11)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Download a machine-readable summary of all processed personal data via the Data Principal Portal.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              2. Right to Correction & Erasure (Sec 12)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Update inaccurate personal details or request permanent account erasure.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              3. Right of Grievance Redressal (Sec 13)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              File a complaint with our Grievance Officer with a guaranteed statutory response timeline.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              4. Right to Nominate (Sec 14)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Designate a nominee who may exercise your data rights in the event of death or incapacity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

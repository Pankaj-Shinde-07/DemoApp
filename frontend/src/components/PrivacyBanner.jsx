import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/api';

export default function PrivacyBanner() {
  const { user, token } = useAuth();
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    ACCOUNT_SERVICE: true,
    SERVICE_COMMUNICATION: true,
    MARKETING: false,
    ANALYTICS: false
  });

  useEffect(() => {
    const saved = localStorage.getItem('demoapp_dpdpa_consent_decision');
    if (!saved) {
      setVisible(true);
    }
  }, []);

  const saveDecision = async (decisionType, customPrefs = null) => {
    const finalPrefs = customPrefs || (decisionType === 'ACCEPT_ALL'
      ? { ACCOUNT_SERVICE: true, SERVICE_COMMUNICATION: true, MARKETING: true, ANALYTICS: true }
      : { ACCOUNT_SERVICE: true, SERVICE_COMMUNICATION: true, MARKETING: false, ANALYTICS: false });

    localStorage.setItem('demoapp_dpdpa_consent_decision', JSON.stringify({
      decisionType,
      preferences: finalPrefs,
      timestamp: new Date().toISOString()
    }));

    // If user is authenticated, sync with backend database
    if (user && token) {
      try {
        for (const [purpose, enabled] of Object.entries(finalPrefs)) {
          if (purpose === 'ACCOUNT_SERVICE') continue;
          if (enabled) {
            await apiRequest('/consents', 'POST', { userId: user.id, purpose }, token).catch(() => {});
          }
        }
      } catch (_) {}
    }

    setVisible(false);
    setShowModal(false);
  };

  if (!visible && !showModal) return null;

  return (
    <>
      {/* FLOATING CONSENT BANNER */}
      {visible && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#0F172A',
          color: '#F8FAFC',
          padding: '1.25rem 2rem',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.35)',
          zIndex: 9998,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderTop: '2px solid #4F46E5'
        }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              
              <strong style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>DPDPA Statutory Privacy & Consent Notice</strong>
              <span style={{ background: '#312E81', color: '#C7D2FE', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                DPDP Rules 2025
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#CBD5E1', lineHeight: '1.5' }}>
              Under India's Digital Personal Data Protection Act (DPDPA), we collect personal data strictly for specified purposes.
              You have the statutory right to accept or reject optional data processing (Marketing & Analytics) or customize your preferences anytime.
              Read our <Link to="/privacy-policy" style={{ color: '#818CF8', textDecoration: 'underline' }}>Privacy Policy Notice</Link>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => saveDecision('ACCEPT_ALL')}
              style={{
                background: '#4F46E5', color: '#FFFFFF', border: 'none',
                padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
              }}
            >
              ✓ Accept All Policies
            </button>
            <button
              onClick={() => saveDecision('REJECT_OPTIONAL')}
              style={{
                background: '#334155', color: '#F1F5F9', border: '1px solid #475569',
                padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
              }}
            >
              ✕ Reject Optional (Essential Only)
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'transparent', color: '#94A3B8', border: '1px solid #475569',
                padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Customize
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMIZE PREFERENCES MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 9999 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#0F172A' }}>Privacy & Consent Preferences</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
              Itemized purposes under DPDP Act 2023 (Section 6). Manage which data processing activities you authorize.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
              {/* Essential */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>
                    1. Account & Core Service (Essential)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Required for user authentication, order processing, and security.
                  </div>
                </div>
                <span className="badge badge-green">Always Required</span>
              </div>

              {/* Service Communications */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>
                    2. Service Communications & OTP
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Transaction alerts, order tracking SMS, and OTP verification.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.SERVICE_COMMUNICATION}
                  onChange={e => setPreferences({ ...preferences, SERVICE_COMMUNICATION: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Marketing */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>
                    3. Promotional Marketing & Offers
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Personalized discounts, newsletters, and promotional email campaigns.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.MARKETING}
                  onChange={e => setPreferences({ ...preferences, MARKETING: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Analytics */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>
                    4. Usage Telemetry & Analytics
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Product experience metrics and behavioral telemetry.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.ANALYTICS}
                  onChange={e => setPreferences({ ...preferences, ANALYTICS: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => saveDecision('REJECT_OPTIONAL')}
              >
                Reject Optional
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => saveDecision('CUSTOM', preferences)}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

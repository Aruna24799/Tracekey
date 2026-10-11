import React, { useState, useEffect } from 'react';

function ReportsHistory({ token, refreshTrigger }) {
  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalPersona, setModalPersona] = useState('developer');

  const SEVERITY_COLORS = {
    CRITICAL: { text: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    HIGH:     { text: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    MEDIUM:   { text: '#60A5FA', bg: 'rgba(59,130,246,0.1)' },
    LOW:      { text: '#10B981', bg: 'rgba(16,185,129,0.1)' }
  };

  const API_BASE = window.location.port === "5173" ? "http://localhost:5000/api" : "/api";

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(false);

      const res = await fetch(`${API_BASE}/errors/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setReports(data);
      } else {
        setError(true);
      }

      // Fetch activity summary for badges
      try {
        const actRes = await fetch(`${API_BASE}/security/activity`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const actData = await actRes.json();
        if (actRes.ok && actData.summary) {
          setTotalCount(actData.summary.totalReports || 0);
          setCriticalCount(actData.summary.criticalReports || 0);
        }
      } catch (_) {}

    } catch (e) {
      console.error('Reports load failed:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [token, refreshTrigger]);

  const activePersonaTabStyle = (active) => ({
    padding: '4px 10px',
    background: active ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #06B6D4' : '2px solid transparent',
    color: active ? '#06B6D4' : '#64748B',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'all 0.2s'
  });

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setModalPersona('developer'); // default view
  };

  const closeReportModal = () => {
    setSelectedReport(null);
  };

  const getPersonaContent = (r) => {
    if (!r) return {};
    if (r.personas && r.personas[modalPersona]) {
      return r.personas[modalPersona];
    }
    return {
      rootCause: r.rootCause,
      fix: r.fix,
      prevention: r.prevention,
      debugSteps: r.debugSteps
    };
  };

  const currentModalContent = selectedReport ? getPersonaContent(selectedReport) : {};

  return (
    <div className="card" style={{ animationDelay: '0.8s', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: 0 }}>Reports History</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            color: '#06B6D4',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px'
          }}>
            {totalCount || reports.length} total
          </span>
          {criticalCount > 0 && (
            <span style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#EF4444',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              {criticalCount} critical
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '6px' }}>
        {loading && <p style={{ color: '#64748B', textAlign: 'center', marginTop: '20px' }}>Loading reports...</p>}

        {!loading && error && (
          <p style={{ color: '#EF4444', textAlign: 'center', marginTop: '20px' }}>Failed to load reports.</p>
        )}

        {!loading && !error && reports.length === 0 && (
          <p style={{ color: '#64748B', textAlign: 'center', marginTop: '20px' }}>No analysis reports yet.</p>
        )}

        {!loading && !error && reports.map((r) => {
          const sev = (r.severity || 'MEDIUM').toUpperCase();
          const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.MEDIUM;
          const date = new Date(r.createdAt).toLocaleString();
          const sourceIcon = r.source === 'ocr' ? '📷' : r.source === 'sdk' ? '⚙️' : '✍️';

          return (
            <div
              key={r._id}
              onClick={() => handleReportClick(r)}
              style={{
                background: 'rgba(15,23,42,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${sc.text}`,
                borderRadius: '10px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(15,23,42,0.7)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(15,23,42,0.4)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px' }}>{sourceIcon}</span>
                  <span style={{ color: sc.text, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sev}</span>
                  <span style={{ color: '#475569', fontSize: '10px' }}>·</span>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>{r.category || 'UNKNOWN'}</span>
                </div>
                <span style={{ color: '#475569', fontSize: '10px' }}>{date}</span>
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.rootCause || r.rawError?.slice(0, 80) || '—'}
              </div>
              <div style={{ color: '#475569', fontSize: '10px', marginTop: '4px' }}>ID: {r._id?.toString().slice(-8)}</div>
            </div>
          );
        })}
      </div>

      {/* OVERLAY DETAILED MODAL */}
      {selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(11, 17, 32, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.7)',
            position: 'relative'
          }}>
            <button
              onClick={closeReportModal}
              style={{
                position: 'absolute',
                top: '20px', right: '20px',
                background: 'transparent',
                border: 'none', color: '#94A3B8',
                fontSize: '18px', cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#F8FAFC' }}>
              Report Details #{selectedReport._id?.toString().slice(-8)}
            </h3>

            {/* Labels summary */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                background: SEVERITY_COLORS[selectedReport.severity]?.bg || 'rgba(255,255,255,0.04)',
                color: SEVERITY_COLORS[selectedReport.severity]?.text || '#CBD5E1',
                padding: '3px 8px',
                borderRadius: '4px',
                border: `1px solid ${SEVERITY_COLORS[selectedReport.severity]?.text}33`
              }}>
                {selectedReport.severity}
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.1)', color: '#06B6D4', padding: '3px 8px', borderRadius: '4px' }}>
                {selectedReport.category}
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#94A3B8', padding: '3px 8px', borderRadius: '4px' }}>
                Source: {selectedReport.source}
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#94A3B8', padding: '3px 8px', borderRadius: '4px' }}>
                {new Date(selectedReport.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Raw Exception */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Raw Exception Output</div>
              <pre style={{
                background: 'rgba(15,23,42,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#CBD5E1',
                maxHeight: '130px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {selectedReport.rawError}
              </pre>
            </div>

            {/* Persona Switcher Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '16px'
            }}>
              <button style={activePersonaTabStyle(modalPersona === 'beginner')} onClick={() => setModalPersona('beginner')}>Beginner 👶</button>
              <button style={activePersonaTabStyle(modalPersona === 'developer')} onClick={() => setModalPersona('developer')}>Developer ⚙️</button>
              <button style={activePersonaTabStyle(modalPersona === 'security')} onClick={() => setModalPersona('security')}>Security 🛡️</button>
              <button style={activePersonaTabStyle(modalPersona === 'ops')} onClick={() => setModalPersona('ops')}>Ops 🎛️</button>
            </div>

            {/* Diagnostic Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', lineHeight: '1.6' }}>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Root Cause ({modalPersona})</div>
                <div style={{ color: '#E2E8F0', fontSize: '13px' }}>{currentModalContent.rootCause || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Recommended Fix</div>
                <div style={{ color: '#10B981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {currentModalContent.fix || '—'}
                </div>
              </div>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Prevention Strategy</div>
                <div style={{ color: '#E2E8F0', fontSize: '13px' }}>{currentModalContent.prevention || '—'}</div>
              </div>

              {currentModalContent.debugSteps && currentModalContent.debugSteps.length > 0 && (
                <div>
                  <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Debug Steps</div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#94A3B8', fontSize: '13px' }}>
                    {currentModalContent.debugSteps.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={closeReportModal}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', color: '#F8FAFC',
                  padding: '8px 18px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 'bold'
                }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsHistory;

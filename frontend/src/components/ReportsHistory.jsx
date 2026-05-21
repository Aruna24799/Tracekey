import React, { useState, useEffect } from 'react';

function ReportsHistory({ token, refreshTrigger }) {
  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const SEVERITY_COLORS = {
    CRITICAL: { text: '#EF4444' },
    HIGH:     { text: '#F59E0B' },
    MEDIUM:   { text: '#60A5FA' },
    LOW:      { text: '#10B981' }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const res = await fetch('http://localhost:5000/api/errors/reports', {
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
        const actRes = await fetch('http://localhost:5000/api/security/activity', {
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
    </div>
  );
}

export default ReportsHistory;

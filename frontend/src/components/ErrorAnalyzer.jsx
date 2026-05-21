import React, { useState } from 'react';

function ErrorAnalyzer({ token, onNewReport }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('#64748B');
  const [result, setResult] = useState(null);

  const SEVERITY_COLORS = {
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
    HIGH:     { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' },
    MEDIUM:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#60A5FA' },
    LOW:      { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10B981' }
  };

  const runAnalysis = async () => {
    if (!input.trim()) {
      setStatus('⚠️ Paste an error first.');
      setStatusColor('#F59E0B');
      return;
    }

    setLoading(true);
    setStatus('');
    setResult(null);

    try {
      const res = await fetch('http://localhost:5000/api/errors/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ error: input })
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`❌ ${data.message || 'Analysis failed'}`);
        setStatusColor('#EF4444');
        return;
      }

      setResult(data);
      setStatus(`✅ Saved as report #${data.reportId?.toString().slice(-6) || 'N/A'}`);
      setStatusColor('#10B981');
      
      if (onNewReport) {
        onNewReport();
      }
    } catch (e) {
      setStatus('❌ Network error. Is the server running?');
      setStatusColor('#EF4444');
      console.error('Analysis failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const sev = (result?.severity || 'MEDIUM').toUpperCase();
  const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.MEDIUM;

  return (
    <div className="card" style={{ animationDelay: '0.6s' }}>
      <h2>Error Analyzer</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your error log or stack trace here..." 
          style={{
            width: '100%', 
            minHeight: '120px', 
            padding: '14px 16px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', 
            color: '#CBD5E1',
            fontFamily: "'Inter', monospace", 
            fontSize: '13px',
            resize: 'vertical', 
            transition: 'border-color 0.3s',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#06B6D4'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={runAnalysis} 
            disabled={loading}
            style={{
              width: 'auto', 
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
              border: 'none', 
              borderRadius: '10px', 
              color: '#fff',
              fontSize: '14px', 
              fontWeight: 700, 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            {loading && (
              <span className="loader" style={{
                width: '14px', 
                height: '14px', 
                border: '2px solid #fff',
                borderBottomColor: 'transparent', 
                borderRadius: '50%',
                display: 'block'
              }}></span>
            )}
            <span>{loading ? 'Analyzing...' : '⚡ Analyze Error'}</span>
          </button>
          <span style={{ fontSize: '13px', color: statusColor }}>{status}</span>
        </div>

        {/* Result panel, hidden until analysis completes */}
        {result && (
          <div style={{ 
            background: 'rgba(15,23,42,0.5)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '12px', 
            padding: '20px', 
            fontSize: '13px', 
            lineHeight: '1.7',
            textAlign: 'left'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Category</div>
                <div style={{ color: '#06B6D4', fontWeight: 700, fontSize: '15px' }}>{result.category || '—'}</div>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Fingerprint</div>
                <div style={{ color: '#A78BFA', fontWeight: 700, fontSize: '15px' }}>
                  {result.fingerprint?.code ? `${result.fingerprint.code} · ${result.fingerprint.label}` : '—'}
                </div>
              </div>
              <div style={{ 
                borderRadius: '10px', 
                padding: '14px',
                background: sc.bg,
                border: `1px solid ${sc.border}`
              }}>
                <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Severity</div>
                <div style={{ color: sc.text, fontWeight: 700, fontSize: '15px' }}>{sev}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Root Cause</div>
                <div style={{ color: '#CBD5E1' }}>{result.rootCause || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Fix</div>
                <div style={{ color: '#10B981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)', whiteSpace: 'pre-wrap' }}>
                  {result.fix || '—'}
                </div>
              </div>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Prevention</div>
                <div style={{ color: '#CBD5E1' }}>{result.prevention || '—'}</div>
              </div>
              
              {result.security?.hasThreats && result.security.threats.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ color: '#EF4444', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>⚠️ Security Threats Detected</div>
                  <div style={{ color: '#FCA5A5', fontSize: '13px' }}>
                    {result.security.threats.map((t, idx) => (
                      <div key={idx} style={{ marginBottom: '4px' }}>• [{t.type}] {t.message}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorAnalyzer;

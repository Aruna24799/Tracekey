import React, { useState, useEffect } from 'react';

function OcrAnalyzer({ token, onNewReport }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('#64748B');
  const [result, setResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [persona, setPersona] = useState('developer'); // 'developer', 'beginner', 'security', 'ops'
  const [previewUrl, setPreviewUrl] = useState(null);

  const SEVERITY_COLORS = {
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
    HIGH:     { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' },
    MEDIUM:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#60A5FA' },
    LOW:      { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10B981' }
  };

  const API_BASE = window.location.port === "5173" ? "http://localhost:5000/api" : "/api";

  const previewOcrFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setStatus('');
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setFileName(file.name);
      setStatus('');
    } else {
      setStatus('⚠️ Only image files accepted.');
      setStatusColor('#F59E0B');
    }
  };

  const runOcrAnalysis = async () => {
    if (!selectedFile) {
      setStatus('⚠️ Select an image first.');
      setStatusColor('#F59E0B');
      return;
    }

    setLoading(true);
    setStatus('');
    setResult(null);

    try {
      const form = new FormData();
      form.append('image', selectedFile);

      const res = await fetch(`${API_BASE}/ocr/extract`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(`❌ ${data.message || 'OCR failed'}`);
        setStatusColor('#EF4444');
        return;
      }

      setResult(data);
      setStatus(`✅ Report #${data.reportId?.toString().slice(-6) || 'N/A'}`);
      setStatusColor('#10B981');

      if (onNewReport) {
        onNewReport();
      }
    } catch (e) {
      setStatus('❌ Network error or server offline.');
      setStatusColor('#EF4444');
      console.error('OCR analysis failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const sev = (result?.severity || 'MEDIUM').toUpperCase();
  const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.MEDIUM;

  const getPersonaContent = () => {
    if (!result) return {};
    if (result.personas && result.personas[persona]) {
      return result.personas[persona];
    }
    return {
      rootCause: result.rootCause,
      fix: result.fix,
      prevention: result.prevention,
      debugSteps: result.debugSteps
    };
  };

  const personaContent = getPersonaContent();
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  return (
    <div className="premium-card">
      <h2>OCR Screenshot Analyzer</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Drop zone */}
        <label
          id="ocrDropZone"
          htmlFor="ocrFileInput"
          className={`ocr-dropzone ${isDragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span style={{ fontSize: '32px', marginBottom: '8px' }}>📷</span>
          <span style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center' }}>
            Drag &amp; drop a screenshot<br />or click to browse
          </span>
          {fileName && (
            <span id="ocrFileName" style={{ color: '#06B6D4', fontSize: '12px', marginTop: '8px' }}>
              {fileName}
            </span>
          )}
        </label>
        <input
          id="ocrFileInput"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={previewOcrFile}
        />
        {previewUrl && (
          <img src={previewUrl} alt="Preview" className="ocr-preview" />
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={runOcrAnalysis}
            disabled={loading}
          >
            {loading && <span className="loader" />}
            <span>{loading ? 'Extracting...' : '🔍 Extract & Analyze'}</span>
          </button>
          <span style={{ fontSize: '13px', color: statusColor }}>{status}</span>
        </div>

        {/* OCR extracted text preview */}
        {result && result.extractedText && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Extracted Text</span>
              {result.confidence > 0 && (
                <span style={{
                  fontSize: '11px',
                  color: result.confidence > 75 ? '#10B981' : '#F59E0B',
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Accuracy: {result.confidence}%
                </span>
              )}
            </div>
            <div style={{
              background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: '#94A3B8',
              fontFamily: 'monospace',
              maxHeight: '100px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {result.extractedText}
            </div>
          </div>
        )}

        {/* Structured traces list */}
        {result && result.structuredTrace && result.structuredTrace.length > 0 && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Detected Stack Call Sites ({result.structuredTrace.length})
            </div>
            <div style={{
              background: 'rgba(15,23,42,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {result.structuredTrace.map((site, sIdx) => (
                <div key={sIdx} style={{ fontSize: '11px', color: '#CBD5E1', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: '#8B5CF6' }}>at {site.method}</span>
                  <span style={{ color: '#06B6D4' }}>{site.file}:{site.line}:{site.column}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OCR diagnostic result */}
        {result && (
          <div style={{
            background: 'rgba(15,23,42,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '13px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Category</div>
                <div style={{ color: '#06B6D4', fontWeight: 700 }}>{result.category || '—'}</div>
              </div>
              <div style={{
                borderRadius: '8px',
                padding: '12px',
                background: sc.bg,
                border: `1px solid ${sc.border}`
              }}>
                <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Severity</div>
                <div style={{ color: sc.text, fontWeight: 700 }}>{sev}</div>
              </div>
            </div>

            {/* Persona Switcher Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '14px'
            }}>
              <button style={activePersonaTabStyle(persona === 'beginner')} onClick={() => setPersona('beginner')}>Beginner 👶</button>
              <button style={activePersonaTabStyle(persona === 'developer')} onClick={() => setPersona('developer')}>Developer ⚙️</button>
              <button style={activePersonaTabStyle(persona === 'security')} onClick={() => setPersona('security')}>Security 🛡️</button>
              <button style={activePersonaTabStyle(persona === 'ops')} onClick={() => setPersona('ops')}>Ops 🎛️</button>
            </div>

            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Root Cause ({persona})</div>
            <div style={{ color: '#CBD5E1', marginBottom: '12px' }}>{personaContent.rootCause || '—'}</div>

            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Fix Guidance</div>
            <div style={{ color: '#10B981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)', whiteSpace: 'pre-wrap', fontSize: '12px', marginBottom: '12px' }}>
              {personaContent.fix || '—'}
            </div>

            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Prevention Strategy</div>
            <div style={{ color: '#CBD5E1' }}>{personaContent.prevention || '—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OcrAnalyzer;

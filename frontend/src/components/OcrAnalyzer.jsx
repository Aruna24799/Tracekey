import React, { useState } from 'react';

function OcrAnalyzer({ token, onNewReport }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('#64748B');
  const [result, setResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const SEVERITY_COLORS = {
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
    HIGH:     { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' },
    MEDIUM:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#60A5FA' },
    LOW:      { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10B981' }
  };

  const previewOcrFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setStatus('');
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

      const res = await fetch('http://localhost:5000/api/ocr/analyze', {
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

  return (
    <div className="card" style={{ animationDelay: '0.7s' }}>
      <h2>OCR Screenshot Analyzer</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Drop zone */}
        <label 
          id="ocrDropZone" 
          htmlFor="ocrFileInput" 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: isDragOver ? '2px dashed #06B6D4' : '2px dashed rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '32px 20px',
            cursor: 'pointer',
            transition: 'border-color 0.3s, background 0.3s',
            background: 'rgba(15,23,42,0.3)'
          }}
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

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={runOcrAnalysis} 
            disabled={loading}
            style={{
              width: 'auto',
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 14px rgba(139,92,246,0.4)',
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
            <span>{loading ? 'Extracting...' : '🔍 Extract & Analyze'}</span>
          </button>
          <span style={{ fontSize: '13px', color: statusColor }}>{status}</span>
        </div>

        {/* OCR extracted text preview */}
        {result && result.extractedText && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Extracted Text</div>
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
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Root Cause</div>
            <div style={{ color: '#CBD5E1', marginBottom: '12px' }}>{result.rootCause || '—'}</div>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Fix</div>
            <div style={{ color: '#10B981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)', whiteSpace: 'pre-wrap' }}>
              {result.fix || '—'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OcrAnalyzer;

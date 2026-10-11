import React, { useState, useEffect } from 'react';

function PredictiveAnalytics({ token, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'cascades', 'drift', 'prevention'

  // Dynamically resolve API URL base
  const API_BASE = window.location.port === "5173" ? "http://localhost:5000/api" : "/api";

  const fetchPredictions = async () => {
    try {
      const res = await fetch(`${API_BASE}/predictive/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Predictive analysis engine request failed');
      const json = await res.json();
      if (json.success) {
        setData(json.analysis);
        setError('');
      } else {
        throw new Error(json.message || 'Predictive analysis failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [token, refreshTrigger]);

  if (loading && !data) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px' }}>Predictive Diagnostics & Replay</h2>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <div className="loader" style={{ width: '24px', height: '24px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px' }}>Predictive Diagnostics & Replay</h2>
        <div style={{ color: '#EF4444', fontSize: '13px' }}>⚠️ {error}</div>
      </div>
    );
  }

  const { runtimeRiskScore, scores, driftDetections, cascadeChains, preventionRecommendations, escalationWarnings } = data;

  // Score colors
  let riskColor = '#10B981';
  if (runtimeRiskScore > 75) riskColor = '#EF4444';
  else if (runtimeRiskScore > 45) riskColor = '#F59E0B';

  const tabStyle = (active) => ({
    padding: '8px 16px',
    background: active ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
    border: active ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
    borderRadius: '8px',
    color: active ? '#06B6D4' : '#94A3B8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  });

  return (
    <div className="card" style={{ animationDelay: '0.4s', textAlign: 'left' }}>
      <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <span>Predictive Failures &amp; Replay Timeline</span>
        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
          {data.traceabilityTag}
        </span>
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', overflowX: 'auto' }}>
        <button style={tabStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={tabStyle(activeTab === 'cascades')} onClick={() => setActiveTab('cascades')}>Replay Cascades ({cascadeChains.length})</button>
        <button style={tabStyle(activeTab === 'drift')} onClick={() => setActiveTab('drift')}>Temporal Drift</button>
        <button style={tabStyle(activeTab === 'prevention')} onClick={() => setActiveTab('prevention')}>Preventive Patches ({preventionRecommendations.length})</button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Circular Gauge */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              border: `6px solid rgba(255,255,255,0.04)`,
              borderTopColor: riskColor,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>{runtimeRiskScore}%</div>
              <div style={{ fontSize: '8px', color: '#64748B', textTransform: 'uppercase', marginTop: '2px' }}>Risk Index</div>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '14px' }}>
                Composite Runtime Crash Likelihood
              </div>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: '4px 0 0', lineHeight: '1.4' }}>
                Analyzes timing faults, environmental drift logs, session hijack profiles, and repeated client telemetries to forecast imminent failures.
              </p>
            </div>
          </div>

          {/* Escalation Warnings */}
          {escalationWarnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {escalationWarnings.map((warning, idx) => (
                <div key={idx} style={{
                  background: warning.level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  borderLeft: `3px solid ${warning.level === 'CRITICAL' ? '#EF4444' : '#F59E0B'}`,
                  padding: '10px 14px',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '12px',
                  color: warning.level === 'CRITICAL' ? '#FCA5A5' : '#FDE047',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span><strong>[{warning.level}]</strong> {warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Risk Factors breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Failure Prob.', score: scores.failureProbability.score, color: '#F59E0B' },
              { label: 'Async Instability', score: scores.asyncInstability.score, color: '#3B82F6' },
              { label: 'Silent Failure Risk', score: scores.silentFailureRisk.score, color: '#A78BFA' },
              { label: 'Replay Cascade Risk', score: scores.replayCorrelation.score, color: '#EC4899' },
              { label: 'Security Exposure', score: scores.securityExposure.score, color: '#EF4444' }
            ].map((factor, idx) => (
              <div key={idx} style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ color: '#64748B', fontSize: '9px', textTransform: 'uppercase' }}>{factor.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                  {factor.score}%
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '1.5px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${factor.score}%`, height: '100%', background: factor.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPLAY CASCADES TAB */}
      {activeTab === 'cascades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cascadeChains.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              👍 No cascading failure sequences detected. Error intervals are safely distributed.
            </div>
          ) : (
            cascadeChains.map((chain, cIdx) => (
              <div key={cIdx} style={{
                background: 'rgba(15,23,42,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                    🚨 CASCADE ({chain.chainLength} links)
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Time delta: <strong>{chain.timeSpanSeconds}s</strong></span>
                </div>
                <div style={{ color: '#F8FAFC', fontSize: '13px', marginBottom: '10px' }}>{chain.description}</div>

                {/* Horizontal Timeline Path */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingLeft: '10px',
                  borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
                  marginLeft: '4px'
                }}>
                  {chain.events.map((evt, eIdx) => (
                    <div key={eIdx} style={{ fontSize: '12px', position: 'relative' }}>
                      {/* Timeline dot */}
                      <span style={{
                        position: 'absolute',
                        left: '-15px',
                        top: '4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: evt.severity === 'CRITICAL' ? '#EF4444' : evt.severity === 'HIGH' ? '#F59E0B' : '#3B82F6'
                      }}></span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
                        <span><strong>{evt.category}</strong> ({evt.fingerprint || 'Unclassified'})</span>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>
                          {new Date(evt.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ color: '#64748B', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {evt.rawErrorSnippet}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TEMPORAL DRIFT TAB */}
      {activeTab === 'drift' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {driftDetections.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              👍 No configurations drift or version regressions detected.
            </div>
          ) : (
            driftDetections.map((drift, dIdx) => (
              <div key={dIdx} style={{
                background: 'rgba(15,23,42,0.3)',
                border: drift.detected ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '18px',
                  background: drift.detected ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  color: drift.detected ? '#F59E0B' : '#64748B'
                }}>
                  {drift.detected ? '⚡' : '✓'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '13px', color: drift.detected ? '#F59E0B' : '#CBD5E1' }}>{drift.label}</strong>
                    {drift.detected && (
                      <span style={{ fontSize: '10px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', padding: '2px 6px', borderRadius: '4px' }}>
                        Conf: {Math.round(drift.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '11px', margin: '4px 0 0' }}>
                    {drift.evidence}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PREVENTIVE RECOMMENDATIONS TAB */}
      {activeTab === 'prevention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {preventionRecommendations.map((rec, rIdx) => (
            <div key={rIdx} style={{
              background: 'rgba(15,23,42,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ color: '#06B6D4', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                {rec.category}
              </div>
              <strong style={{ fontSize: '14px', color: '#F8FAFC', display: 'block', marginBottom: '6px' }}>
                {rec.title}
              </strong>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 14px', lineHeight: '1.4' }}>
                {rec.description}
              </p>

              {/* Code comparison panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {/* Before */}
                <div>
                  <div style={{ fontSize: '11px', color: '#EF4444', marginBottom: '4px', fontWeight: '600' }}>Vulnerable Pattern:</div>
                  <pre style={{
                    background: 'rgba(239, 68, 68, 0.03)',
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#FCA5A5',
                    overflowX: 'auto',
                    margin: 0
                  }}>
                    {rec.beforeCode}
                  </pre>
                </div>
                {/* After */}
                <div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginBottom: '4px', fontWeight: '600' }}>Resilient Architecture Recommendation:</div>
                  <pre style={{
                    background: 'rgba(16, 185, 129, 0.03)',
                    border: '1px solid rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#A7F3D0',
                    overflowX: 'auto',
                    margin: 0
                  }}>
                    {rec.afterCode}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PredictiveAnalytics;

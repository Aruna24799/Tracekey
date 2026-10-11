import React, { useState, useEffect } from 'react';

function SystemHealth({ token, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dynamically resolve API URL base
  const API_BASE = window.location.port === "5173" ? "http://localhost:5000/api" : "/api";

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Health check failed');
      const json = await res.json();
      if (json.success) {
        setData(json.health);
        setError('');
      } else {
        throw new Error(json.message || 'Health check failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [token, refreshTrigger]);

  if (loading && !data) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px' }}>System Health Monitor</h2>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <div className="loader" style={{ width: '24px', height: '24px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px' }}>System Health Monitor</h2>
        <div style={{ color: '#EF4444', fontSize: '13px' }}>⚠️ {error}</div>
      </div>
    );
  }

  const { db, memory, system, stabilityIndex, telemetrySummary, authMetrics } = data;

  // DB color classes
  let dbColor = '#EF4444';
  if (db.status === 'CONNECTED') dbColor = '#10B981';
  else if (db.status === 'CONNECTING') dbColor = '#F59E0B';

  // Stability Index color
  let stabilityColor = '#10B981';
  if (stabilityIndex < 50) stabilityColor = '#EF4444';
  else if (stabilityIndex < 80) stabilityColor = '#F59E0B';

  // Format uptime (seconds to readable string)
  const formatUptime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="card" style={{ animationDelay: '0.3s', textAlign: 'left' }}>
      <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>System Health Monitor</span>
        <span style={{
          fontSize: '11px',
          background: 'rgba(255,255,255,0.06)',
          padding: '4px 10px',
          borderRadius: '20px',
          color: '#94A3B8',
          fontWeight: 'normal'
        }}>
          Live
        </span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Core database status */}
        <div style={{
          background: 'rgba(15,23,42,0.3)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Database Connection</div>
            <div style={{ color: '#F8FAFC', fontSize: '16px', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: dbColor }}></span>
              {db.status}
            </div>
          </div>
          {db.status === 'CONNECTED' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>Ping Latency</div>
              <div style={{ color: '#06B6D4', fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                {db.pingMs}ms
              </div>
            </div>
          )}
        </div>

        {/* Health gauges grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Stability Index */}
          <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stability Index</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stabilityColor, marginTop: '4px' }}>
              {stabilityIndex}%
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${stabilityIndex}%`, height: '100%', background: stabilityColor, borderRadius: '2px' }}></div>
            </div>
          </div>

          {/* Node Heap Memory */}
          <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Heap Memory</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#3B82F6', marginTop: '4px' }}>
              {memory.heapUsed} <span style={{ fontSize: '12px', color: '#64748B' }}>/ {memory.heapTotal} MB</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((memory.heapUsed / memory.heapTotal) * 100))}%`, height: '100%', background: '#3B82F6', borderRadius: '2px' }}></div>
            </div>
          </div>
        </div>

        {/* Telemetry counts status details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#94A3B8' }}>Node Uptime</span>
            <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{formatUptime(system.uptime)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#94A3B8' }}>SDK Telemetry Reports</span>
            <span style={{ fontWeight: 600, color: '#06B6D4' }}>{telemetrySummary.sources.sdk}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#94A3B8' }}>OCR Extraction Reports</span>
            <span style={{ fontWeight: 600, color: '#A78BFA' }}>{telemetrySummary.sources.ocr}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#94A3B8' }}>Login Failure Rate</span>
            <span style={{
              fontWeight: 600,
              color: authMetrics.failureRate > 20 ? '#EF4444' : '#10B981'
            }}>
              {authMetrics.failureRate}% ({authMetrics.failedCount} failures)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#94A3B8' }}>System Memory</span>
            <span style={{ fontWeight: 600, color: '#CBD5E1' }}>
              {system.totalMemory - system.freeMemory} / {system.totalMemory} MB Used
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemHealth;

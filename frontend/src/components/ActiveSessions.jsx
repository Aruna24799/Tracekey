import React, { useState, useEffect } from 'react';

function ActiveSessions({ token, onSessionChange }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/auth/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSessions(data);
      }
    } catch (e) {
      console.error("Sessions load failed", e);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (id) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadSessions();
        if (onSessionChange) {
          onSessionChange(); // Notify parent to refresh other dashboard states
        }
      }
    } catch (e) {
      console.error("Revoke failed", e);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [token]);

  return (
    <div className="card" style={{ animationDelay: '0.3s', textAlign: 'left' }}>
      <h2>Active Sessions</h2>
      <div id="sessionsList" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        {loading && <p style={{ color: '#64748B', fontSize: '13px' }}>Fetching sessions...</p>}
        
        {!loading && sessions.length === 0 && (
          <p style={{ color: '#64748B', fontSize: '13px' }}>No other active sessions.</p>
        )}
        
        {!loading && sessions.map((session) => {
          const isCurrent = session.token === token;
          return (
            <div 
              key={session._id} 
              className="status-item"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '4px',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span className="status-value" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {session.device?.browser || 'Unknown'} on {session.device?.os || 'Unknown'}
                  {isCurrent && (
                    <span style={{ color: '#06B6D4', fontSize: '10px', marginLeft: '8px' }}>(Current)</span>
                  )}
                </span>
                {!isCurrent && (
                  <button 
                    onClick={() => terminateSession(session._id)} 
                    style={{
                      background: 'none', 
                      border: 'none', 
                      color: '#EF4444', 
                      fontSize: '11px', 
                      cursor: 'pointer', 
                      fontWeight: 600, 
                      padding: 0
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: '#64748B', fontSize: '11px' }}>
                <span>IP: {session.ipAddress}</span>
                <span>Started: {new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActiveSessions;

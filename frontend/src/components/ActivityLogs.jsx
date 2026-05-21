import React, { useState, useEffect } from 'react';

function ActivityLogs({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/logs/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setLogs(data);
      }
    } catch (e) {
      console.error("Logs load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [token]);

  return (
    <div className="card" style={{ animationDelay: '0.5s', flex: 1, minHeight: '400px', textAlign: 'left' }}>
      <h2>Login Activity Logs</h2>
      <div 
        className="logs-list" 
        id="logsList"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '8px'
        }}
      >
        {loading && (
          <p style={{ color: '#64748B', textAlign: 'center', marginTop: '20px' }}>
            Fetching logs...
          </p>
        )}
        
        {!loading && logs.length === 0 && (
          <p style={{ color: '#64748B', textAlign: 'center', marginTop: '20px' }}>
            No recent activity.
          </p>
        )}

        {!loading && logs.map((log) => {
          const date = new Date(log.createdAt).toLocaleString();
          const isSuccess = log.loginStatus === 'success';
          return (
            <div 
              key={log._id}
              className={`log-entry ${log.loginStatus}`}
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '14px',
                borderRadius: '10px',
                borderLeft: `3px solid ${isSuccess ? '#10B981' : '#EF4444'}`,
                fontSize: '13px'
              }}
            >
              <div 
                className="log-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}
              >
                <span 
                  className="log-type" 
                  style={{ 
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    letterSpacing: '0.5px',
                    color: isSuccess ? '#10B981' : '#EF4444' 
                  }}
                >
                  {log.loginStatus.toUpperCase()} LOGIN
                </span>
                <span className="log-time" style={{ color: '#64748B', fontSize: '11px' }}>{date}</span>
              </div>
              <div style={{ color: '#CBD5E1' }}>
                Device: <strong>{log.browser}</strong> on {log.os} 
                <span style={{ color: '#64748B', float: 'right' }}>IP: {log.ipAddress}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityLogs;

import React, { useState, useEffect } from 'react';
import ErrorAnalyzer from '../components/ErrorAnalyzer.jsx';
import OcrAnalyzer from '../components/OcrAnalyzer.jsx';
import ReportsHistory from '../components/ReportsHistory.jsx';
import ActiveSessions from '../components/ActiveSessions.jsx';
import ActivityLogs from '../components/ActivityLogs.jsx';

function Dashboard({ token, onLogout }) {
  const [user, setUser] = useState({ name: '...', email: '...' });
  const [securityScore, setSecurityScore] = useState('--');
  const [securityStatus, setSecurityStatus] = useState('Calculating...');
  const [securityScoreColor, setSecurityScoreColor] = useState('#CBD5E1');
  const [deviceInfo, setDeviceInfo] = useState('Analyzing...');
  const [deviceClass, setDeviceClass] = useState('status-value');
  const [activeSessionCount, setActiveSessionCount] = useState(0);
  const [totalReportsCount, setTotalReportsCount] = useState(0);
  const [recentFailuresCount, setRecentFailuresCount] = useState(0);
  const [accountHealth, setAccountHealth] = useState('Analyzing...');
  const [accountHealthClass, setAccountHealthClass] = useState('status-value');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const API = "http://localhost:5000/api";

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Auth failed");
      const data = await res.json();
      setUser(data.user);
    } catch (e) {
      onLogout();
    }
  };

  const loadSecurityStats = async () => {
    try {
      const [scoreRes, activityRes] = await Promise.all([
        fetch(`${API}/security/score`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/security/activity`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const scoreData = await scoreRes.json();
      const activityData = await activityRes.json();
      
      // Update Score
      setSecurityScore(scoreData.score);
      setSecurityStatus(`Status: ${scoreData.status}`);
      
      if (scoreData.score < 50) setSecurityScoreColor("#EF4444");
      else if (scoreData.score < 80) setSecurityScoreColor("#F59E0B");
      else setSecurityScoreColor("#10B981");

      // Update System Status
      setActiveSessionCount(scoreData.details.activeSessions);
      
      if (scoreData.details.knownDevices <= 1) {
        setDeviceInfo("Trusted Device");
        setDeviceClass("status-value status-active");
      } else {
        setDeviceInfo("New Device Logged");
        setDeviceClass("status-value status-warning");
      }

      // Update Activity Summary
      if (activityData.summary) {
        setTotalReportsCount(activityData.summary.totalReports);
        setRecentFailuresCount(activityData.summary.failedLogins);
        
        if (activityData.summary.criticalReports > 0) {
          setAccountHealth("Critical Issues");
          setAccountHealthClass("status-value status-danger");
        } else {
          setAccountHealth("Healthy");
          setAccountHealthClass("status-value status-active");
        }
      }
    } catch (e) {
      console.error("Score/Activity load failed", e);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}
    onLogout();
  };

  useEffect(() => {
    checkAuth();
    loadSecurityStats();
  }, [token, refreshTrigger]);

  return (
    <div className="dashboard-container">
      {/* Inject original CSS perfectly */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        .dashboard-container {
          font-family: 'Inter', sans-serif;
          background: #0B1120; 
          color: #fff; 
          min-height: 100vh;
          width: 100vw;
          margin: 0;
          padding: 0;
          position: relative;
          z-index: 1;
        }
        
        /* Background Pattern */
        .dashboard-container::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 100%, rgba(139, 92, 246, 0.05) 0%, transparent 40%);
          z-index: -1;
          pointer-events: none;
        }

        header { 
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 16px 40px; 
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0; }
        header h1 span { color: #06B6D4; text-shadow: 0 0 10px rgba(6, 182, 212, 0.5); }
        
        .user-controls {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .user-info { text-align: right; }
        .welcome-text { color: #94A3B8; font-size: 13px; margin-bottom: 2px; }
        .welcome-text span { color: #fff; font-weight: 600; }
        .user-email { color: #64748B; font-size: 11px; }
        
        .logout-btn {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px; color: #EF4444; font-weight: 600; font-size: 13px;
          cursor: pointer; transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(239, 68, 68, 0.2); transform: translateY(-1px); }

        main { 
          padding: 40px 20px; 
          max-width: 1200px; 
          margin: 0 auto; 
          width: 100%; 
          display: grid; 
          grid-template-columns: repeat(12, 1fr); 
          gap: 24px; 
        }
        
        .card { 
          background: rgba(30, 41, 59, 0.5); 
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 20px; 
          padding: 24px; 
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
          animation: fadeUp 0.5s ease-out forwards;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .col-4 { grid-column: span 4; }
        .col-6 { grid-column: span 6; }
        .col-8 { grid-column: span 8; }
        .col-12 { grid-column: span 12; }

        @media (max-width: 900px) {
          .col-4, .col-6, .col-8 { grid-column: span 12; }
        }

        h2 { font-size: 18px; margin-top: 0; margin-bottom: 20px; color: #F8FAFC; display: flex; align-items: center; gap: 8px; }
        h2::before {
          content: "";
          display: block;
          width: 6px;
          height: 18px;
          background: #06B6D4;
          border-radius: 3px;
        }

        /* Score Card */
        .score-container { text-align: center; padding: 10px 0; }
        .score-circle {
          width: 120px; height: 120px; border-radius: 50%;
          border: 8px solid rgba(6, 182, 212, 0.1);
          border-top-color: #06B6D4;
          margin: 0 auto 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 700;
          position: relative;
          transition: color 0.5s;
        }
        .score-label { font-size: 14px; color: #94A3B8; font-weight: 500; }

        /* Status Items */
        .status-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .status-item:last-child { border-bottom: none; }
        .status-label { font-size: 14px; color: #94A3B8; }
        .status-value { font-size: 14px; font-weight: 600; }
        .status-active { color: #10B981; }
        .status-warning { color: #F59E0B; }
        .status-danger { color: #EF4444; }

        .loader {
          width: 18px;
          height: 18px;
          border: 2px solid #fff;
          border-bottom-color: transparent;
          border-radius: 50%;
          animation: rotation 1s linear infinite;
        }

        @keyframes rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <header>
        <h1>Trace<span>Key</span> 2.0</h1>
        <div className="user-controls">
          <div className="user-info">
            <div className="welcome-text">Welcome, <span id="userName">{user.name}</span></div>
            <div className="user-email" id="userEmail">{user.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogoutClick}>Disconnect</button>
        </div>
      </header>
      
      <main>
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ animationDelay: '0.1s' }}>
            <h2>Security Score</h2>
            <div className="score-container">
              <div className="score-circle" style={{ color: securityScoreColor }}>
                {securityScore}%
              </div>
              <div className="score-label">{securityStatus}</div>
            </div>
          </div>

          <div className="card" style={{ animationDelay: '0.2s', textAlign: 'left' }}>
            <h2>System Status</h2>
            <div className="status-item">
              <span className="status-label">Device Identity</span>
              <span className={deviceClass}>{deviceInfo}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Active Sessions</span>
              <span className="status-value">{activeSessionCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Total Reports</span>
              <span className="status-value">{totalReportsCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Recent Failures</span>
              <span className="status-value status-danger">{recentFailuresCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Account Health</span>
              <span className={accountHealthClass}>{accountHealth}</span>
            </div>
          </div>

          <ActiveSessions token={token} onSessionChange={triggerRefresh} />
        </div>

        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ActivityLogs token={token} />
        </div>

        <div className="col-12">
          <ErrorAnalyzer token={token} onNewReport={triggerRefresh} />
        </div>

        <div className="col-6">
          <OcrAnalyzer token={token} onNewReport={triggerRefresh} />
        </div>

        <div className="col-6">
          <ReportsHistory token={token} refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;

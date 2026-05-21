import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regErr, setRegErr] = useState('');

  const API = "http://localhost:5000/api";

  const getFingerprint = () => {
    return {
      browser: navigator.userAgent.match(/(firefox|msie|chrome|safari|trident)/i)?.[0] || "Unknown",
      os: navigator.platform,
      platform: navigator.vendor || "Unknown",
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      hash: btoa(`${navigator.userAgent}${window.screen.width}${navigator.language}`).slice(0, 16)
    };
  };

  const toggleView = (e) => {
    e.preventDefault();
    setIsLoginView(!isLoginView);
    setLoginErr('');
    setRegErr('');
    setLoginSuccessMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    setLoginSuccessMsg('');

    if (!loginEmail.trim() || !loginPassword) {
      setLoginErr("Please fill in all fields.");
      return;
    }

    const fingerprint = getFingerprint();

    try {
      setLoginLoading(true);
      
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword, fingerprint })
      });
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem("tk_token", data.token);
        localStorage.setItem("tk_user", JSON.stringify(data.user));
        setLoginSuccessMsg("Authentication successful! Redirecting...");
        setTimeout(() => {
          onLoginSuccess(data.token);
        }, 800);
      } else {
        setLoginErr(data.message || "Invalid credentials");
        setLoginLoading(false);
      }
    } catch (err) {
      setLoginErr("Server offline. Ensure backend is running.");
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegErr('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegErr("Please fill in all fields.");
      return;
    }

    try {
      setRegLoading(true);
      
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), password: regPassword })
      });
      const data = await res.json();
      
      if (res.status === 201) {
        setIsLoginView(true);
        setLoginEmail(regEmail);
        setLoginSuccessMsg("Clearance granted! Please authenticate.");
        setRegLoading(false);
        // Clear registration states
        setRegName('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setRegErr(data.message || "Registration failed.");
        setRegLoading(false);
      }
    } catch (err) {
      setRegErr("Server offline. Ensure backend is running.");
      setRegLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Inject original CSS perfectly */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        .login-page-container {
          font-family: 'Inter', sans-serif;
          background: radial-gradient(circle at top left, #1e0b36, #0B1120 40%, #050810 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: relative;
          margin: 0;
          padding: 0;
        }
        
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 1;
          animation: float 10s infinite ease-in-out alternate;
        }
        .orb-1 { width: 300px; height: 300px; background: rgba(6, 182, 212, 0.4); top: 10%; left: 20%; }
        .orb-2 { width: 400px; height: 400px; background: rgba(139, 92, 246, 0.4); bottom: 10%; right: 15%; animation-duration: 12s; }
        
        @keyframes float {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-50px) scale(1.1); }
        }

        .card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 48px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: fadeUp 0.6s ease-out;
          margin: 20px;
          position: relative;
          z-index: 2;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card h1 { font-size: 32px; font-weight: 700; margin-top: 0; margin-bottom: 8px; text-align: center; letter-spacing: -0.5px; }
        .card h1 span { color: #06B6D4; text-shadow: 0 0 10px rgba(6, 182, 212, 0.5); }
        p.sub { color: #94A3B8; font-size: 15px; margin-bottom: 32px; text-align: center; }
        
        .form-group { margin-bottom: 20px; position: relative; text-align: left; }
        .form-group label { display: block; font-size: 13px; color: #CBD5E1; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-group input {
          width: 100%; padding: 14px 16px;
          background: rgba(15, 23, 42, 0.6); 
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px; color: #fff; font-size: 15px;
          transition: all 0.3s ease;
        }
        .form-group input:focus { outline: none; border-color: #06B6D4; background: rgba(15, 23, 42, 0.9); box-shadow: 0 0 15px rgba(6, 182, 212, 0.2); }
        
        .card button {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #06B6D4, #3B82F6);
          border: none;
          border-radius: 10px; color: #fff;
          font-size: 16px; font-weight: 700;
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 10px;
          box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }
        .card button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(6, 182, 212, 0.6); }
        .card button:active { transform: translateY(0); }
        .card button:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
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

        .err { color: #F87171; font-size: 14px; margin-top: 14px; text-align: center; font-weight: 500; min-height: 20px; }
        .success { color: #10B981; }
        .switch { text-align: center; margin-top: 24px; color: #94A3B8; font-size: 14px; }
        .switch a { color: #06B6D4; text-decoration: none; font-weight: 600; transition: color 0.2s; }
        .switch a:hover { color: #fff; }

        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      
      <div className="card">
        {/* LOGIN VIEW */}
        {isLoginView ? (
          <div className="fade-in">
            <h1>Trace<span>Key</span> 2.0</h1>
            <p className="sub">Welcome back to the Intelligence Hub</p>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@domain.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              
              <button type="submit" disabled={loginLoading}>
                {loginLoading && <span className="loader"></span>}
                <span>{loginLoading ? "Authenticating..." : "Authenticate"}</span>
              </button>
            </form>

            <div className={`err ${loginSuccessMsg ? "success" : ""}`}>
              {loginErr || loginSuccessMsg}
            </div>

            <div className="switch">
              First time here? <a href="#" onClick={toggleView}>Initialize Account</a>
            </div>
          </div>
        ) : (
          /* REGISTER VIEW */
          <div className="fade-in">
            <h1>Trace<span>Key</span> 2.0</h1>
            <p className="sub">Initialize your developer clearance</p>
            
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@domain.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <button type="submit" disabled={regLoading}>
                {regLoading && <span className="loader"></span>}
                <span>{regLoading ? "Creating..." : "Create Access Key"}</span>
              </button>
            </form>

            <div className="err">{regErr}</div>
            
            <div className="switch">
              Already cleared? <a href="#" onClick={toggleView}>Authenticate</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;

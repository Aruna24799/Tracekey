import React, { useContext, useEffect, useState } from "react";
import { fetchSettings, saveSettings, testAiConnection } from "../api.js";
import { ThemeContext } from "../context/ThemeContext.jsx";

function Settings() {
    const { theme: activeTheme, setTheme: setGlobalTheme } = useContext(ThemeContext) || {};
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [theme, setTheme] = useState(activeTheme || "dark");
    const [hfApiKey, setHfApiKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let mounted = true;

        fetchSettings()
            .then((data) => {
                if (!mounted) {
                    return;
                }

                setName(data?.name || localStorage.getItem("tk_username") || "");
                setEmail(data?.email || localStorage.getItem("tk_email") || "");
                const savedTheme = localStorage.getItem("tk_theme") || data?.settings?.theme || "dark";
                setTheme(savedTheme);
                if (setGlobalTheme) setGlobalTheme(savedTheme);
                setHfApiKey(data?.settings?.hfApiKey || "");
            })
            .catch((err) => setMessage(err.message || "Failed to load settings"))
            .finally(() => setLoading(false));

        return () => {
            mounted = false;
        };
    }, [setGlobalTheme]);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        if (setGlobalTheme) setGlobalTheme(newTheme);
    };

    const persistProfile = async () => {
        try {
            setSaving(true);
            await saveSettings({ name, email, password, theme, hfApiKey });
            localStorage.setItem("tk_username", name || "TraceKey User");
            localStorage.setItem("tk_email", email || "");
            if (setGlobalTheme) setGlobalTheme(theme);
            setPassword("");
            setMessage("Settings saved successfully.");
        } catch (err) {
            setMessage(err.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const runAiTest = async () => {
        try {
            setTesting(true);
            const result = await testAiConnection();
            setMessage(result?.connected ? "AI connection verified." : result?.message || "AI connection checked with fallback.");
        } catch (err) {
            setMessage(err.message || "AI connection test failed");
        } finally {
            setTesting(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("tk_token");
        localStorage.removeItem("tk_username");
        localStorage.removeItem("tk_email");
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="card"><p>Loading settings...</p></div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="card">
                <h1>Settings</h1>
                <p style={{ marginTop: "10px", color: "#94A3B8" }}>Profile, theme, password, and Hugging Face configuration only.</p>
            </div>

            {message ? <div className="card"><p style={{ margin: 0 }}>{message}</p></div> : null}

            <div className="grid-2">
                <div className="card">
                    <h2>Profile</h2>
                    <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" type="password" />
                    </div>
                </div>

                <div className="card">
                    <h2>AI and Theme</h2>
                    <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                        <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
                            <option value="dark">Dark Theme</option>
                            <option value="light">Light Theme</option>
                        </select>
                        <input value={hfApiKey} onChange={(e) => setHfApiKey(e.target.value)} placeholder="Hugging Face API Key" />
                        <button className="btn-primary" onClick={runAiTest} disabled={testing}>{testing ? "Testing AI..." : "Test AI Connection"}</button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={persistProfile} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
                <button className="btn-primary" onClick={handleLogout}>Logout</button>
            </div>
        </div>
    );
}

export default Settings;

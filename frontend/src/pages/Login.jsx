import React, { useState } from "react";
import {
  loginUser,
  registerUser
} from "../api";

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      let response;

      if (isRegister) {
        await registerUser({
          name: username,
          email,
          password
        });

        response = await loginUser({
          email,
          password
        });
      } else {
        response = await loginUser({
          email,
          password
        });
      }

      if (!response?.token) {
        throw new Error(
          "Login succeeded but token not returned."
        );
      }

      localStorage.setItem(
        "tk_token",
        response.token
      );

      localStorage.setItem(
        "tk_email",
        response.user?.email || email
      );

      localStorage.setItem(
        "tk_username",
        response.user?.name ||
          username ||
          "TraceKey User"
      );

      localStorage.setItem(
        "tk_user",
        JSON.stringify(response.user || {})
      );

      onLoginSuccess(response.token);
    } catch (err) {
      setError(
        err.message ||
          "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px"
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px"
        }}
      >
        <h1
          style={{
            fontSize: "2.8rem",
            marginBottom: "12px"
          }}
        >
          TraceKey 2.0
        </h1>

        <p
          style={{
            color: "#94A3B8",
            marginBottom: "34px",
            lineHeight: "1.7"
          }}
        >
          AI Semantic Observability &
          Runtime Debugging Platform
        </p>

        {error && (
          <div
            style={{
              background: "#7f1d1d",
              color: "#fff",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "16px"
            }}
          >
            {error}
          </div>
        )}

        {isRegister && (
          <>
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              required
            />
          </>
        )}

        <label
          style={{
            marginTop: "20px",
            display: "block"
          }}
        >
          Email
        </label>

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <label
          style={{
            marginTop: "20px",
            display: "block"
          }}
        >
          Password
        </label>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center"
          }}
        >
          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="Enter password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{
            width: "100%",
            marginTop: "32px"
          }}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : isRegister
            ? "Register"
            : "Login"}
        </button>

        <p
          style={{
            marginTop: "26px",
            textAlign: "center",
            color: "#94A3B8"
          }}
        >
          {isRegister
            ? "Already registered?"
            : "Need an account?"}

          <button
            type="button"
            onClick={() =>
              setIsRegister(
                !isRegister
              )
            }
            style={{
              background: "none",
              border: "none",
              color: "white",
              marginLeft: "8px",
              cursor: "pointer",
              fontWeight: "700"
            }}
          >
            {isRegister
              ? "Login"
              : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}

export default Login;
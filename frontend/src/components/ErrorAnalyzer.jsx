import React from 'react';

function ErrorAnalysis() {
  return (
    <div className="page-content">

      {/* TOP ACTION */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
        }}
      >
        <button className="btn-primary">
          Analyze Error
        </button>

        <p
          style={{
            color: '#86efac',
          }}
        >
          Saved as report #8762e2
        </p>
      </div>

      {/* TOP GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr 0.5fr',
          gap: '18px',
        }}
      >

        {/* CATEGORY */}
        <div className="card">
          <p
            style={{
              color: '#94a3b8',
              marginBottom: '12px',
            }}
          >
            CATEGORY
          </p>

          <h2
            className="severity-low"
          >
            NULL_ERROR
          </h2>
        </div>

        {/* FINGERPRINT */}
        <div className="card">
          <p
            style={{
              color: '#94a3b8',
              marginBottom: '12px',
            }}
          >
            FINGERPRINT
          </p>

          <h2>
            NULL_CHAIN
          </h2>

          <p
            style={{
              marginTop: '8px',
              color: '#94a3b8',
            }}
          >
            Null Property Access
          </p>
        </div>

        {/* SEVERITY */}
        <div className="card">
          <p
            style={{
              color: '#94a3b8',
              marginBottom: '12px',
            }}
          >
            SEVERITY
          </p>

          <h2
            className="severity-high"
          >
            HIGH
          </h2>
        </div>

      </div>

      {/* TABS */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >

        <button className="btn-primary">
          BEGINNER
        </button>

        <button className="nav-link">
          DEVELOPER
        </button>

        <button className="nav-link">
          SECURITY ANALYST
        </button>

        <button className="nav-link">
          OPERATOR (OPS)
        </button>

      </div>

      {/* ROOT CAUSE */}
      <div className="card">

        <h2
          style={{
            marginBottom: '20px',
          }}
        >
          ROOT CAUSE (BEGINNER)
        </h2>

        <p
          style={{
            lineHeight: '1.8',
            color: '#e2e8f0',
          }}
        >
          The computer tried to use
          information that does not exist
          yet. It attempted to open an
          empty value during execution.
        </p>

      </div>

      {/* FIX */}
      <div className="card">

        <h2
          style={{
            marginBottom: '18px',
          }}
        >
          RECOMMENDED FIX
        </h2>

        <div
          style={{
            padding: '18px',
            borderRadius: '16px',
            background:
              'rgba(34,197,94,0.08)',
            border:
              '1px solid rgba(34,197,94,0.2)',
            color: '#86efac',
            lineHeight: '1.8',
          }}
        >
          Check whether the object exists
          before accessing its properties.
          Use optional chaining:
          item?.name
        </div>

      </div>

      {/* PREVENTION */}
      <div className="card">

        <h2
          style={{
            marginBottom: '18px',
          }}
        >
          PREVENTION STRATEGY
        </h2>

        <p
          style={{
            color: '#cbd5e1',
            lineHeight: '1.8',
          }}
        >
          Validate all incoming runtime
          data and prevent undefined
          object access before rendering
          components or processing APIs.
        </p>

      </div>

      {/* DEBUG */}
      <div className="card">

        <h2
          style={{
            marginBottom: '18px',
          }}
        >
          DEBUG STEPS
        </h2>

        <ul
          style={{
            paddingLeft: '20px',
            lineHeight: '2',
            color: '#cbd5e1',
          }}
        >
          <li>
            Find where the empty value
            is accessed.
          </li>

          <li>
            Validate API response data.
          </li>

          <li>
            Add fallback values.
          </li>

          <li>
            Use optional chaining.
          </li>
        </ul>

      </div>

    </div>
  );
}

export default ErrorAnalysis;
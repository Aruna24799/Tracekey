/*
  TraceKey SDK API Layer
  Stable frontend-compatible version
*/

const API_BASE =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';

/* -------------------------------- */
/* GENERIC REQUEST */
/* -------------------------------- */

async function request(
  endpoint,
  options = {}
) {
  try {
    const response = await fetch(
      `${API_BASE}${endpoint}`,
      {
        headers: {
          'Content-Type':
            'application/json',
          ...(options.headers || {}),
        },

        ...options,
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        'API request failed'
      );
    }

    return data;
  } catch (error) {
    console.error(
      'TraceKey API Error:',
      error.message
    );

    return {
      success: false,
      message: error.message,
    };
  }
}

/* -------------------------------- */
/* ERROR ANALYSIS */
/* -------------------------------- */

export async function analyzeError(
  errorText,
  token
) {
  return request(
    '/errors/analyze',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        error: errorText,
      }),
    }
  );
}

/* -------------------------------- */
/* OCR */
/* -------------------------------- */

export async function runOCR(
  formData,
  token
) {
  try {
    const response = await fetch(
      `${API_BASE}/ocr/extract`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        'OCR extraction failed',
    };
  }
}

/* -------------------------------- */
/* REPORTS */
/* -------------------------------- */

export async function getReports(
  token
) {
  return request(
    '/errors/reports',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/* -------------------------------- */
/* HEALTH */
/* -------------------------------- */

export async function getHealthStats(
  token
) {
  return request(
    '/health/stats',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/* -------------------------------- */
/* PREDICTIVE */
/* -------------------------------- */

export async function getPredictions(
  token
) {
  return request(
    '/predictive/analysis',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/* -------------------------------- */
/* SESSIONS */
/* -------------------------------- */

export async function getSessions(
  token
) {
  return request(
    '/auth/sessions',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
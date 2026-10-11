module.exports = {
  id: 'RESPONSE_UNCHECKED',
  label: 'Unchecked Network Response Status',
  category: 'NETWORK_ERROR',
  description: 'Fetch response status is not checked before processing payload with json() or text().',
  severity: 'HIGH',
  confidence: 0.87,
  fixTemplate: 'const res = await fetch(url);\nif (!res.ok) throw new Error(res.statusText);\nconst data = await res.json();',
  prevention: 'Always verify response.ok or response.status prior to parsing the payload with .json() or .text().',
  signatures: [
    /fetch\([^)]+\)\.then\([^)]*res\s*=>\s*res\.json\(\)\)/,
    /const data = await res\.json\(\)/,
    /unchecked response/i,
    /failed to parse json/i,
    /unexpected token.*in json/i
  ],
  debugSteps: [
    "Find fetch() calls in the codebase.",
    "Ensure there is a check for res.ok or res.status === 200 before parsing.",
    "Add error handling for non-2xx HTTP status codes."
  ]
};

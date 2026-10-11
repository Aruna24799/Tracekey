module.exports = {
  id: 'EFFECT_CLEANUP_MISS',
  label: 'Missing Hook Cleanup Return',
  category: 'REACT_ERROR',
  description: 'useEffect hook has no cleanup function returned, leading to potential memory leaks or redundant listeners.',
  severity: 'MEDIUM',
  confidence: 0.84,
  fixTemplate: 'useEffect(() => {\n  const sub = stream.subscribe();\n  return () => sub.unsubscribe();\n}, []);',
  prevention: 'Always return a cleanup function from useEffect when creating subscriptions, listeners, or timers.',
  signatures: [
    /useEffect\(\(\)\s*=>\s*\{[^}]*(subscription|listener|setInterval|addEventListener)[^}]*\}\)/s,
    /missing cleanup/i,
    /memory leak/i,
    /effect cleanup missing/i,
    /unmounted state update/i
  ],
  debugSteps: [
    "Verify if the useEffect sets up external listeners or timeouts.",
    "Check if there is a return statement inside the useEffect callback.",
    "Add a return function to clear intervals or unsubscribe."
  ]
};

module.exports = {
  id: 'CATCH_SWALLOW',
  label: 'Swallowed Exception Catch Block',
  category: 'SERVER_ERROR',
  description: 'Catch block does not rethrow, log, or handle the error, silencing critical runtime issues.',
  severity: 'HIGH',
  confidence: 0.92,
  fixTemplate: 'catch (err) { console.error(err); throw err; }',
  prevention: 'Never leave catch blocks empty. At minimum, log the error or propagate it so it does not fail silently.',
  signatures: [
    /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/s,
    /catch\s*\(\s*\w*\s*\)\s*\{\s*\/\/.*?\}[\s\n]*$/s,
    /catch\s*\(\s*\w*\s*\)\s*\{\s*\/\/.*?\}/s,
    /catch\s*\{\s*\}/s,
    /swallowed error/i,
    /silent exception/i,
    /empty catch/i
  ],
  debugSteps: [
    "Find the empty try-catch block in the code.",
    "Add console.error('Caught error:', err); inside the catch block.",
    "Determine if the error should trigger UI feedback or a retry mechanism."
  ]
};

module.exports = {
  id: 'ASYNC_VOID',
  label: 'Unhandled Async Operation',
  category: 'ASYNC_ERROR',
  description: 'Async function returns void without awaiting, leading to silent failures.',
  severity: 'HIGH',
  confidence: 0.93,
  fixTemplate: 'await asyncFunction();',
  prevention: 'Always await async calls or handle their promises properly in control flow.',
  signatures: [
    /async\s+.*?\{[^}]*?return;[^}]*?\}/s,
    /return\s+void\s+/i,
    /unawaited async/i,
    /promise\<void\>/i
  ],
  debugSteps: [
    "Identify the async call that is not being awaited.",
    "Add an await keyword or chain a .catch() / .then() handler.",
    "Verify that the return type of the function is processed properly."
  ]
};

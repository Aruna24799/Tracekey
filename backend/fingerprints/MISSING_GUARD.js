module.exports = {
  id: 'MISSING_GUARD',
  label: 'Missing Guard Initialization Check',
  category: 'NULL_ERROR',
  description: 'Executing operation before checking if target is initialized.',
  severity: 'HIGH',
  confidence: 0.97, // High confidence to take precedence over generic NULL_CHAIN when guard terms are present
  fixTemplate: 'if (!target) return; target.perform();',
  prevention: 'Ensure initialization guards are present prior to calling methods on external objects.',
  signatures: [
    /missing guard/i,
    /guard check/i,
    /not initialized/i,
    /initialization check/i,
    /target is not initialized/i
  ],
  debugSteps: [
    "Locate the method or property call on the uninitialized object.",
    "Verify where the object is declared and initialized.",
    "Add a check: if (typeof target !== 'undefined' && target) { ... }"
  ]
};

module.exports = {
  id: 'RACE_FETCH',
  label: 'Fetch Race Condition',
  category: 'NETWORK_ERROR',
  description: 'Simultaneous fetch calls where responses can arrive out of order, overwriting state.',
  severity: 'MEDIUM',
  confidence: 0.88,
  fixTemplate: 'Use AbortController to cancel stale fetch requests.',
  prevention: 'Ensure each asynchronous network request has a cancelation mechanism like AbortController or a tracking active/ignore flag.',
  signatures: [
    /race condition/i,
    /race_fetch/i,
    /fetch\s+race/i,
    /out-of-order fetch/i,
    /concurrent fetch/i,
    /overlapping requests/i
  ],
  debugSteps: [
    "Trace consecutive triggers that initiate network requests.",
    "Verify if a later network response can arrive before an earlier one.",
    "Implement cleanup in React's useEffect to abort active requests."
  ]
};

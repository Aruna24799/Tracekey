module.exports = {
  id: 'INFINITE_EFFECT',
  label: 'React Hooks Infinite Render Loop',
  category: 'REACT_ERROR',
  description: 'useEffect hook dependency array contains values updated inside the hook, causing an infinite rendering loop.',
  severity: 'CRITICAL',
  confidence: 0.96,
  fixTemplate: 'Remove state updates from useEffect or add proper state conditional checks.',
  prevention: 'Ensure state updated inside useEffect is not also listed in its dependency array without a conditional exit.',
  signatures: [
    /infinite render/i,
    /Maximum update depth exceeded/i,
    /too many re-renders/i,
    /infinite loop/i,
    /Rendered more neighbors/i
  ],
  debugSteps: [
    "Identify state variables modified inside the useEffect hook.",
    "Check the dependency array of the useEffect.",
    "Use conditionals or a ref to prevent updating state on every render."
  ]
};

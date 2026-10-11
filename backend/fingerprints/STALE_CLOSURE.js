module.exports = {
  id: 'STALE_CLOSURE',
  label: 'Stale Closure in Timer/Hook',
  category: 'REACT_ERROR',
  description: 'A closure inside a hook or timer referencing old variable state.',
  severity: 'MEDIUM',
  confidence: 0.86,
  fixTemplate: 'Use React useRef or include missing variables in the hook\'s dependency array.',
  prevention: 'Avoid capturing mutable values in long-running timers or handlers without updating dependency arrays.',
  signatures: [
    /stale closure/i,
    /captured outdated state/i,
    /setTimeout.*closure/i,
    /setInterval.*stale/i,
    /outdated dependency/i,
    /closure variable/i
  ],
  debugSteps: [
    "Check if variables in the timer function are updated outside.",
    "Ensure useEffect dependency array lists all local state referenced.",
    "Use a functional state update (setVal(prev => ...)) to access current state."
  ]
};

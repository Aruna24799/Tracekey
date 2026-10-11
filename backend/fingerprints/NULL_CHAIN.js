module.exports = {
  id: 'NULL_CHAIN',
  label: 'Null Property Access',
  category: 'NULL_ERROR',
  description: 'Application attempted to access a property on an undefined or null object.',
  severity: 'HIGH',
  confidence: 0.95,
  fixTemplate: 'const name = data?.user?.name;',
  prevention: 'Add optional chaining (?.) before property access or implement guard clauses.',
  signatures: [
    /cannot read properties of/i,
    /TypeError:\s*Cannot read property/i,
    /TypeError:\s*.*is undefined/i,
    /TypeError:\s*.*is null/i,
    /null has no properties/i,
    /undefined is not an object/i
  ],
  debugSteps: [
    "Identify the property access on null or undefined.",
    "Check if the API response returned the expected schema.",
    "Add a guard clause: if (!object) return;"
  ]
};

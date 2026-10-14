// formatDate.js
// Properly formats YYYY-MM-DD strings without timezone shift bugs

export function formatDate(dateString, format = 'en-IN') {
  if (!dateString) return '-';
  // Replace hyphens with slashes to force local timezone parsing in JS
  // '2026-09-01' -> parsed as UTC midnight
  // '2026/09/01' -> parsed as local midnight
  const safeString = typeof dateString === 'string' ? dateString.replace(/-/g, '/') : dateString;
  const date = new Date(safeString);
  return date.toLocaleDateString(format);
}

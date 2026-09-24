export const formatCurrency = (amount) => {
  const numeric = typeof amount === 'string'
    ? parseFloat(amount.replace(/,/g, ''))
    : Number(amount);

  if (Number.isNaN(numeric)) return 'INR 0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
};

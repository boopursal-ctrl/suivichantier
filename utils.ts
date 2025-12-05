export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MAD', 'DH');
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

export const countDays = (start: string, end: string): number => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays + 1; // Inclusive
};

export const countSundays = (start: string, end: string): number => {
  let count = 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const current = new Date(d1);

  while (current <= d2) {
    if (current.getDay() === 0) { // 0 is Sunday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const calculateMarginColor = (difference: number, budgetPrevu: number) => {
  const percent = (difference / budgetPrevu);
  if (difference < 0) return 'text-red-600 bg-red-50'; // Over budget
  if (percent < 0.1) return 'text-orange-600 bg-orange-50'; // Tight margin
  return 'text-green-600 bg-green-50'; // Healthy
};
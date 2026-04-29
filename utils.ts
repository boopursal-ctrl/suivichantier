import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: any) => {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount).replace('MAD', 'DH');
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

export const countDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive
};

export const countWorkDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

  let count = 0;
  const current = new Date(d1);
  while (current <= d2) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Exclure Dimanche (0) et Samedi (6)
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

export const getCityName = (code: string): string => {
  const cityMap: { [key: string]: string } = {
    '522': 'Casablanca (Zone)',
    '523': 'Mohammedia / Settat / El Jadida (Zone)',
    '524': 'Marrakech / Safi / Ouarzazate (Zone)',
    '525': 'Boujdour',
    '528': 'Agadir / Sud (Zone)',
    '535': 'Fès / Meknès / Taza (Zone)',
    '536': 'Oujda / Oriental / Nador (Zone)',
    '537': 'Rabat / Kénitra / Khémisset (Zone)',
    '539': 'Tanger / Tétouan / Al Hoceima (Zone)',
    '056': 'Mont Arruit',
    '000': 'Ville Inconnue'
  };
  
  // Clean code if it comes with leading zeros or extra chars
  const cleanCode = String(code).trim().replace(/^0/, '');
  
  return cityMap[cleanCode] || cityMap['5' + cleanCode] || code;
};
// Shared period filter logic for date range filtering

export type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all_time' | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// Local date formatting helpers (same as in DateField)
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

// Get date range from preset
export const getPeriodDateRange = (preset: PeriodPreset, from?: string, to?: string): DateRange | null => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  switch (preset) {
    case 'this_month': {
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date();
      return {
        from: formatLocalDate(start),
        to: formatLocalDate(end),
      };
    }
    case 'last_month': {
      const start = new Date(currentYear, currentMonth - 1, 1);
      const end = new Date(currentYear, currentMonth, 0);
      return {
        from: formatLocalDate(start),
        to: formatLocalDate(end),
      };
    }
    case 'last_3_months': {
      const start = new Date(currentYear, currentMonth - 2, 1);
      const end = new Date();
      return {
        from: formatLocalDate(start),
        to: formatLocalDate(end),
      };
    }
    case 'this_year': {
      const start = new Date(currentYear, 0, 1);
      const end = new Date();
      return {
        from: formatLocalDate(start),
        to: formatLocalDate(end),
      };
    }
    case 'all_time':
      return null; // null means no date filter
    case 'custom':
      if (from && to) {
        if (from > to) {
          return null;
        }
        return { from, to };
      }
      return null;
    default:
      return null;
  }
};

// Format period label with real month/date names
export const getPeriodLabel = (preset: PeriodPreset, customFromDate?: string, customToDate?: string): string => {
  if (preset === 'custom') {
    if (!customFromDate || !customToDate || customFromDate > customToDate) {
      return 'Invalid date range';
    }
    const fromDate = parseLocalDate(customFromDate);
    const toDate = parseLocalDate(customToDate);
    if (!fromDate || !toDate) return 'Invalid date range';

    const fromDay = fromDate.getDate();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const fullFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
      // Same month: "01 - 15 Oct 2026"
      return `${fromDay} - ${fullFormatter.format(toDate)}`;
    } else {
      // Different months: "01 Oct - 15 Nov 2026"
      return `${fromDay} ${monthFormatter.format(fromDate)} - ${fullFormatter.format(toDate)}`;
    }
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  const monthOnlyFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

  if (preset === 'this_month') {
    return monthFormatter.format(today);
  }
  if (preset === 'last_month') {
    const lastMonth = new Date(currentYear, today.getMonth() - 1, 1);
    return monthFormatter.format(lastMonth);
  }
  if (preset === 'last_3_months') {
    const start = new Date(currentYear, today.getMonth() - 2, 1);
    const startMonth = monthOnlyFormatter.format(start);
    const endMonth = monthOnlyFormatter.format(today);
    const endYear = today.getFullYear();
    return `${startMonth} - ${endMonth} ${endYear}`;
  }
  if (preset === 'this_year') {
    return currentYear.toString();
  }
  return 'All Time';
};

// Transaction category types
export type TransactionCategory = 'all' | 'collected' | 'received' | 'handover' | 'purchase';

export interface TransactionCategoryOption {
  label: string;
  value: TransactionCategory;
  types: string[];
}

export const TRANSACTION_CATEGORIES: TransactionCategoryOption[] = [
  { label: 'All', value: 'all', types: ['payment', 'handover_sent', 'handover_received', 'water_payment'] },
  { label: 'Collected', value: 'collected', types: ['payment'] },
  { label: 'Received', value: 'received', types: ['handover_received'] },
  { label: 'Handed Over', value: 'handover', types: ['handover_sent'] },
  { label: 'Water Purchase', value: 'purchase', types: ['water_payment'] },
];

// Filter transactions by date range and category
export const filterTransactions = <T extends { date: string; type: string }>(
  records: T[],
  dateRange: DateRange | null,
  category: TransactionCategory = 'all'
): T[] => {
  let filtered = records;

  // Filter by date range
  if (dateRange) {
    filtered = filtered.filter((record) => record.date >= dateRange.from && record.date <= dateRange.to);
  }

  // Filter by category
  if (category !== 'all') {
    const categoryOption = TRANSACTION_CATEGORIES.find((cat) => cat.value === category);
    if (categoryOption) {
      filtered = filtered.filter((record) => categoryOption.types.includes(record.type));
    }
  }

  return filtered;
};

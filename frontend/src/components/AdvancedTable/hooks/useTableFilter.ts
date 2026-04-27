import { useState, useMemo } from 'react';

export const useTableFilter = (data: any[]) => {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = String(row[key]).toLowerCase();
        const filterValue = String(value).toLowerCase();
        return rowValue.includes(filterValue);
      });
    });
  }, [data, filters]);

  const handleFilter = (key: string, value: any) => {
    setFilters(current => ({
      ...current,
      [key]: value
    }));
  };

  return { filteredData, filters, handleFilter };
};

import { useState } from 'react';

export const useTableSelection = (data: any[]) => {
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const handleSelectRow = (row: any) => {
    setSelectedRows(current => {
      if (current.includes(row)) {
        return current.filter(r => r !== row);
      }
      return [...current, row];
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows([...data]);
    }
  };

  const clearSelection = () => {
    setSelectedRows([]);
  };

  return {
    selectedRows,
    handleSelectRow,
    handleSelectAll,
    clearSelection
  };
};

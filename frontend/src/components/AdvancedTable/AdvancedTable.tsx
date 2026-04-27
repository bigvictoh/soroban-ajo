import React, { useState, useMemo } from 'react';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';
import { TablePagination } from './TablePagination';
import { TableToolbar } from './TableToolbar';
import { useTableSort } from './hooks/useTableSort';
import { useTableFilter } from './hooks/useTableFilter';
import { useTableSelection } from './hooks/useTableSelection';

export interface Column {
  id: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface AdvancedTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  onBulkAction?: (action: string, selectedRows: any[]) => void;
  exportFormats?: ('csv' | 'excel' | 'pdf')[];
  pageSize?: number;
  virtualScroll?: boolean;
}

export const AdvancedTable: React.FC<AdvancedTableProps> = ({
  columns,
  data,
  onRowClick,
  onBulkAction,
  exportFormats = ['csv', 'excel'],
  pageSize = 10,
  virtualScroll = false
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map(c => c.id)
  );
  const [currentPage, setCurrentPage] = useState(1);

  const { sortedData, sortConfig, handleSort } = useTableSort(data);
  const { filteredData, filters, handleFilter } = useTableFilter(sortedData);
  const { selectedRows, handleSelectRow, handleSelectAll, clearSelection } = 
    useTableSelection(filteredData);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleExport = (format: string) => {
    // Export logic
    console.log(`Exporting as ${format}`);
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction) {
      onBulkAction(action, selectedRows);
    }
    clearSelection();
  };

  return (
    <div className="advanced-table">
      <TableToolbar
        selectedCount={selectedRows.length}
        onBulkAction={handleBulkAction}
        onExport={handleExport}
        exportFormats={exportFormats}
        columns={columns}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
      />
      
      <div className="table-container">
        <table>
          <TableHeader
            columns={columns.filter(c => visibleColumns.includes(c.id))}
            sortConfig={sortConfig}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
            allSelected={selectedRows.length === filteredData.length}
          />
          
          <TableBody
            columns={columns.filter(c => visibleColumns.includes(c.id))}
            data={virtualScroll ? filteredData : paginatedData}
            selectedRows={selectedRows}
            onSelectRow={handleSelectRow}
            onRowClick={onRowClick}
            virtualScroll={virtualScroll}
          />
        </table>
      </div>

      {!virtualScroll && (
        <TablePagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredData.length / pageSize)}
          pageSize={pageSize}
          totalItems={filteredData.length}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

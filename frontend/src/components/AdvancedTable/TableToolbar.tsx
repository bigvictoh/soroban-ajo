import React from 'react';
import { Column } from './AdvancedTable';

interface TableToolbarProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onExport: (format: string) => void;
  exportFormats: string[];
  columns: Column[];
  visibleColumns: string[];
  onColumnVisibilityChange: (columns: string[]) => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  selectedCount,
  onBulkAction,
  onExport,
  exportFormats,
  columns,
  visibleColumns,
  onColumnVisibilityChange
}) => {
  const toggleColumn = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      onColumnVisibilityChange(visibleColumns.filter(id => id !== columnId));
    } else {
      onColumnVisibilityChange([...visibleColumns, columnId]);
    }
  };

  return (
    <div className="table-toolbar">
      <div className="toolbar-left">
        {selectedCount > 0 && (
          <div className="bulk-actions">
            <span>{selectedCount} selected</span>
            <button onClick={() => onBulkAction('delete')}>Delete</button>
            <button onClick={() => onBulkAction('export')}>Export Selected</button>
          </div>
        )}
      </div>

      <div className="toolbar-right">
        <div className="column-visibility">
          <button>Columns</button>
          <div className="column-dropdown">
            {columns.map(column => (
              <label key={column.id}>
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.id)}
                  onChange={() => toggleColumn(column.id)}
                />
                {column.label}
              </label>
            ))}
          </div>
        </div>

        <div className="export-options">
          <button>Export</button>
          <div className="export-dropdown">
            {exportFormats.map(format => (
              <button key={format} onClick={() => onExport(format)}>
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

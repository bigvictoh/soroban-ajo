import React from 'react';
import { Column } from './AdvancedTable';

interface TableHeaderProps {
  columns: Column[];
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (columnId: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  sortConfig,
  onSort,
  onSelectAll,
  allSelected
}) => {
  return (
    <thead>
      <tr>
        <th>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
          />
        </th>
        {columns.map(column => (
          <th
            key={column.id}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort(column.id)}
            className={column.sortable ? 'sortable' : ''}
          >
            {column.label}
            {column.sortable && sortConfig?.key === column.id && (
              <span className="sort-indicator">
                {sortConfig.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
};

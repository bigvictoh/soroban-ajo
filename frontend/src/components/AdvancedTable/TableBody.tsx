import React from 'react';
import { Column } from './AdvancedTable';

interface TableBodyProps {
  columns: Column[];
  data: any[];
  selectedRows: any[];
  onSelectRow: (row: any) => void;
  onRowClick?: (row: any) => void;
  virtualScroll?: boolean;
}

export const TableBody: React.FC<TableBodyProps> = ({
  columns,
  data,
  selectedRows,
  onSelectRow,
  onRowClick,
  virtualScroll
}) => {
  const isSelected = (row: any) => selectedRows.includes(row);

  return (
    <tbody>
      {data.map((row, index) => (
        <tr
          key={index}
          className={isSelected(row) ? 'selected' : ''}
          onClick={() => onRowClick?.(row)}
        >
          <td>
            <input
              type="checkbox"
              checked={isSelected(row)}
              onChange={() => onSelectRow(row)}
              onClick={(e) => e.stopPropagation()}
            />
          </td>
          {columns.map(column => (
            <td key={column.id}>
              {column.render
                ? column.render(row[column.id], row)
                : row[column.id]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

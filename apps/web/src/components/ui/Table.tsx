import type { Key, MouseEvent, ReactNode } from "react";

export type TableColumn<Row> = {
  key: string;
  header: ReactNode;
  renderCell: (row: Row) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export type TableProps<Row> = {
  ariaLabel: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
  emptyState?: ReactNode;
  className?: string;
  headerRowClassName?: string;
  rowClassName?: string | ((row: Row) => string);
  onRowClick?: (row: Row) => void;
};

export function Table<Row>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  emptyState = "No rows to display.",
  className = "w-full border-collapse text-left text-sm",
  headerRowClassName = "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500",
  rowClassName = "border-b border-slate-100 text-slate-700",
  onRowClick
}: TableProps<Row>) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={ariaLabel} className={className}>
        <thead>
          <tr className={headerRowClassName}>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`px-4 py-3 font-semibold ${column.headerClassName ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-600">
                {emptyState}
              </td>
            </tr>
          ) : rows.map((row) => {
            const rowClass = typeof rowClassName === "function" ? rowClassName(row) : rowClassName;
            const handleClick = onRowClick
              ? (event: MouseEvent<HTMLTableRowElement>) => {
                  if (event.target instanceof HTMLElement
                    && event.target.closest("a, button, input, select, textarea")) return;
                  onRowClick(row);
                }
              : undefined;
            return (
              <tr
                key={getRowKey(row)}
                className={`${rowClass}${onRowClick ? " cursor-pointer" : ""}`}
                onClick={handleClick}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-4 ${column.cellClassName ?? ""}`}>
                    {column.renderCell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

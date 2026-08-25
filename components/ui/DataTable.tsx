"use client";
import { useState, useMemo, ReactNode } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T | string; // The key to access data for sorting
  accessorFn?: (row: T) => any; // Function to access data for sorting
  cell?: (row: T) => ReactNode; // Function to render the cell
  className?: string; // Additional classes for the header/cell
  sortable?: boolean;
};

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, keyExtractor, className = "", onRowClick }: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState<boolean>(false);

  const handleSort = (colId: string) => {
    if (sortCol === colId) {
      if (sortDesc) {
        setSortCol(null);
        setSortDesc(false);
      } else {
        setSortDesc(true);
      }
    } else {
      setSortCol(colId);
      setSortDesc(false);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    const col = columns.find((c) => (c.accessorKey || c.header) === sortCol);
    if (!col) return data;

    return [...data].sort((a, b) => {
      let valA = col.accessorFn ? col.accessorFn(a) : col.accessorKey ? (a as any)[col.accessorKey] : undefined;
      let valB = col.accessorFn ? col.accessorFn(b) : col.accessorKey ? (b as any)[col.accessorKey] : undefined;

      if (typeof valA === "string" && typeof valB === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [data, sortCol, sortDesc, columns]);

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead className="sticky top-0 bg-[var(--color-surface-elevated-dark)] border-b border-[var(--color-hairline-on-dark)] text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase z-10">
          <tr>
            {columns.map((col, i) => {
              const colId = (col.accessorKey || col.header) as string;
              const isSortable = col.sortable !== false && (col.accessorKey || col.accessorFn);
              const isSorted = sortCol === colId;
              
              return (
                <th key={i} className={`px-4 py-3 ${col.className || ""} ${isSortable ? "cursor-pointer hover:text-white transition group select-none" : ""}`} onClick={() => isSortable && handleSort(colId)}>
                  <div className={`flex items-center gap-1.5 ${col.className?.includes("text-right") ? "justify-end" : ""}`}>
                    {col.header}
                    {isSortable && (
                      <span className="shrink-0 flex flex-col justify-center text-[var(--color-muted-strong)] group-hover:text-white">
                        {isSorted ? (
                          sortDesc ? <ArrowDown size={12} strokeWidth={3} /> : <ArrowUp size={12} strokeWidth={3} />
                        ) : (
                          <ArrowUpDown size={12} strokeWidth={2} className="opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-hairline-on-dark)]">
          {sortedData.map((row) => (
            <tr key={keyExtractor(row)} onClick={() => onRowClick?.(row)} className={`transition hover:bg-[var(--color-surface-elevated-dark)]/30 ${onRowClick ? "cursor-pointer" : ""}`}>
              {columns.map((col, i) => (
                <td key={i} className={`px-4 py-3 align-middle ${col.className || ""}`}>
                  {col.cell ? col.cell(row) : col.accessorKey ? String((row as any)[col.accessorKey]) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

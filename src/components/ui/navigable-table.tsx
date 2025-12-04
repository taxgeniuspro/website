'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Table } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface NavigableTableProps {
  /**
   * Table content
   */
  children: React.ReactNode;

  /**
   * Callback when a row is activated (Enter key or click)
   */
  onRowActivate?: (rowIndex: number) => void;

  /**
   * Number of rows in the table
   */
  rowCount: number;

  /**
   * Whether keyboard navigation is enabled
   * @default true
   */
  enableKeyboardNav?: boolean;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Callback when selected row changes
   */
  onSelectedRowChange?: (rowIndex: number | null) => void;
}

/**
 * NavigableTable Component
 *
 * Table with keyboard navigation support.
 * Enables power users to navigate tables efficiently.
 *
 * Keyboard Shortcuts:
 * - ↑/↓ or J/K: Navigate rows (vim-style)
 * - Enter: Activate selected row
 * - Esc: Clear selection
 * - Home/End: Jump to first/last row
 *
 * Features:
 * - Visual selection indicator
 * - Smooth scrolling to selected row
 * - Mouse and keyboard support
 * - Accessible (ARIA attributes)
 *
 * Best Practices:
 * - Use for data tables with many rows
 * - Provide clear onRowActivate action
 * - Works alongside mouse interactions
 *
 * @example
 * ```tsx
 * <NavigableTable
 *   rowCount={clients.length}
 *   onRowActivate={(index) => {
 *     router.push(`/clients/${clients[index].id}`);
 *   }}
 * >
 *   <TableHeader>...</TableHeader>
 *   <TableBody>
 *     {clients.map((client) => (
 *       <TableRow key={client.id}>...</TableRow>
 *     ))}
 *   </TableBody>
 * </NavigableTable>
 * ```
 */
export function NavigableTable({
  children,
  onRowActivate,
  rowCount,
  enableKeyboardNav = true,
  className,
  onSelectedRowChange,
}: NavigableTableProps) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectedRowChange?.(selectedRow);
  }, [selectedRow, onSelectedRowChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeyboardNav || rowCount === 0) return;

      // Don't interfere with input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'j': // Vim-style
          e.preventDefault();
          setSelectedRow((prev) => {
            if (prev === null) return 0;
            return Math.min(prev + 1, rowCount - 1);
          });
          break;

        case 'ArrowUp':
        case 'k': // Vim-style
          e.preventDefault();
          setSelectedRow((prev) => {
            if (prev === null) return rowCount - 1;
            return Math.max(prev - 1, 0);
          });
          break;

        case 'Home':
          e.preventDefault();
          setSelectedRow(0);
          break;

        case 'End':
          e.preventDefault();
          setSelectedRow(rowCount - 1);
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedRow !== null && onRowActivate) {
            onRowActivate(selectedRow);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setSelectedRow(null);
          break;
      }
    },
    [enableKeyboardNav, rowCount, selectedRow, onRowActivate]
  );

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedRow !== null && tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tbody tr');
      const selectedRowElement = rows[selectedRow] as HTMLElement;

      if (selectedRowElement) {
        selectedRowElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedRow]);

  // Apply selection styling to rows
  useEffect(() => {
    if (!tableRef.current) return;

    const rows = tableRef.current.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      if (index === selectedRow) {
        row.classList.add('bg-muted/50', 'border-l-4', 'border-l-primary');
        row.setAttribute('data-selected', 'true');
        row.setAttribute('aria-selected', 'true');
      } else {
        row.classList.remove('bg-muted/50', 'border-l-4', 'border-l-primary');
        row.removeAttribute('data-selected');
        row.setAttribute('aria-selected', 'false');
      }
    });
  }, [selectedRow]);

  // Handle row clicks
  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (!tableRef.current) return;

      const target = e.target as HTMLElement;
      const row = target.closest('tbody tr');

      if (row) {
        const rows = Array.from(tableRef.current.querySelectorAll('tbody tr'));
        const index = rows.indexOf(row);

        if (index !== -1) {
          setSelectedRow(index);
        }
      }
    },
    []
  );

  // Handle row double-click to activate
  const handleRowDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!tableRef.current || !onRowActivate) return;

      const target = e.target as HTMLElement;
      const row = target.closest('tbody tr');

      if (row) {
        const rows = Array.from(tableRef.current.querySelectorAll('tbody tr'));
        const index = rows.indexOf(row);

        if (index !== -1) {
          onRowActivate(index);
        }
      }
    },
    [onRowActivate]
  );

  return (
    <div
      className={cn('relative rounded-md border', className)}
      onClick={handleRowClick}
      onDoubleClick={handleRowDoubleClick}
    >
      <Table ref={tableRef} className="relative">
        {children}
      </Table>

      {/* Keyboard nav hint */}
      {enableKeyboardNav && rowCount > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded border">
          Use ↑↓ or J/K to navigate • Enter to open • Esc to deselect
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage navigable table state
 *
 * @example
 * ```tsx
 * const { selectedRow, setSelectedRow } = useNavigableTable();
 *
 * <NavigableTable
 *   rowCount={data.length}
 *   onSelectedRowChange={setSelectedRow}
 *   onRowActivate={(index) => console.log('Activated:', data[index])}
 * >
 *   ...
 * </NavigableTable>
 * ```
 */
export function useNavigableTable() {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  return {
    selectedRow,
    setSelectedRow,
    clearSelection: () => setSelectedRow(null),
  };
}

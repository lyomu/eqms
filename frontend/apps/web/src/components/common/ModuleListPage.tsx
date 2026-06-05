"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  /** Sort field sent to the backend (defaults to `key`). */
  sortField?: string;
  className?: string;
  /** Hide on small screens (responsive: keep only critical columns on mobile). */
  hideOnMobile?: boolean;
  render: (row: T) => React.ReactNode;
}

export type SortDirection = "asc" | "desc";

interface ModuleListPageProps<T> {
  title: string;
  /** Optional caller-provided filter controls (status/owner/date, etc.). */
  filterBar?: React.ReactNode;
  createLabel?: string;
  onCreate?: () => void;
  /** Optional extra actions next to Create (e.g. Bulk Actions). */
  toolbarExtra?: React.ReactNode;

  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  /** Trailing actions cell (View/Edit buttons). */
  rowActions?: (row: T) => React.ReactNode;

  isLoading: boolean;
  isError: boolean;
  emptyText: string;
  errorText: string;

  // sorting
  sortField?: string;
  sortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;

  // pagination
  page: number; // zero-based
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}

/**
 * Reusable module list template (Milestone 2): title + create button, a filter-bar slot, a sortable
 * responsive table, an actions column, pagination, and loading/empty/error states. Used by Document
 * Control and reused by every other module list.
 */
export function ModuleListPage<T>({
  title,
  filterBar,
  createLabel,
  onCreate,
  toolbarExtra,
  columns,
  rows,
  getRowId,
  onRowClick,
  rowActions,
  isLoading,
  isError,
  emptyText,
  errorText,
  sortField,
  sortDirection,
  onSortChange,
  page,
  totalPages,
  totalElements,
  onPageChange,
}: ModuleListPageProps<T>) {
  function toggleSort(col: Column<T>) {
    if (!col.sortable || !onSortChange) return;
    const field = col.sortField ?? col.key;
    const nextDir: SortDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";
    onSortChange(field, nextDir);
  }

  function sortIcon(col: Column<T>) {
    if (!col.sortable) return null;
    const field = col.sortField ?? col.key;
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1 text-brand-primary">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {toolbarExtra}
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {createLabel ?? "Create New"}
            </Button>
          )}
        </div>
      </div>

      {filterBar && <Card className="p-4">{filterBar}</Card>}

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingScreen label={`Loading ${title.toLowerCase()}…`} />
        ) : isError ? (
          <div className="p-4">
            <ErrorAlert title="Error" message={errorText} />
          </div>
        ) : !rows || rows.length === 0 ? (
          <p className="p-8 text-center text-body text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-2.5 text-label font-medium uppercase tracking-wide text-muted-foreground",
                        col.hideOnMobile && "hidden md:table-cell",
                        col.className
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {col.header}
                          {sortIcon(col)}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  ))}
                  {rowActions && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={getRowId(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border last:border-0",
                      onRowClick && "cursor-pointer hover:bg-accent/50"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle",
                          col.hideOnMobile && "hidden md:table-cell",
                          col.className
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && rows && rows.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <p className="text-label text-muted-foreground">
              Page {page + 1} of {Math.max(totalPages, 1)} · {totalElements} total
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page + 1 >= totalPages}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

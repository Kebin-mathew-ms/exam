import React from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  pagination = null, // { totalRecords, totalPages, currentPage, pageSize, onPageChange }
  sorting = null, // { sortBy, sortOrder, onSort }
}) {
  const handleSort = (key) => {
    if (sorting && sorting.onSort) {
      const isAsc = sorting.sortBy === key && sorting.sortOrder === 'asc'
      sorting.onSort(key, isAsc ? 'desc' : 'asc')
    }
  }

  const renderSortIcon = (key) => {
    if (!sorting || sorting.sortBy !== key) return null
    return sorting.sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 ml-1 text-primary inline" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1 text-primary inline" />
    )
  }

  if (loading) {
    // Render Loading Skeletons
    return (
      <div className="w-full space-y-4">
        <div className="animate-pulse bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="h-12 bg-muted/40 border-b" />
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card flex items-center px-6 gap-4">
                <div className="h-4 bg-muted/60 rounded w-1/4" />
                <div className="h-4 bg-muted/60 rounded w-1/3" />
                <div className="h-4 bg-muted/60 rounded w-1/6" />
                <div className="h-4 bg-muted/60 rounded w-1/12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-6 py-4 ${
                    col.sortable ? 'cursor-pointer hover:bg-muted/50 hover:text-foreground transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span>{col.label}</span>
                    {col.sortable && renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-muted/10 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 font-medium text-foreground max-w-xs truncate">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground/60" />
                    <span className="font-medium text-sm">No records found matching filters.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
          <div className="text-xs text-muted-foreground font-medium">
            Showing Page <span className="text-foreground">{pagination.currentPage}</span> of{' '}
            <span className="text-foreground">{pagination.totalPages}</span> ({pagination.totalRecords} records)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Simple page numbers */}
            {[...Array(pagination.totalPages)].map((_, index) => {
              const p = index + 1
              // Only render adjacent numbers to keep cleaner
              if (
                p === 1 ||
                p === pagination.totalPages ||
                Math.abs(p - pagination.currentPage) <= 1
              ) {
                return (
                  <button
                    key={p}
                    onClick={() => pagination.onPageChange(p)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                      pagination.currentPage === p
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                )
              }
              if (
                p === 2 ||
                p === pagination.totalPages - 1
              ) {
                return <span key={p} className="text-muted-foreground px-1 text-xs select-none">...</span>
              }
              return null
            })}

            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number          // 0-based
  totalPages: number
  onPageChange: (p: number) => void
  totalElements?: number
  pageSize?: number
}

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  const pages: (number | '...')[] = []
  const near = new Set([0, total - 1, current - 1, current, current + 1].filter(p => p >= 0 && p < total))

  let prev = -1
  for (let i = 0; i < total; i++) {
    if (near.has(i)) {
      if (prev !== -1 && i - prev > 1) pages.push('...')
      pages.push(i)
      prev = i
    }
  }
  return pages
}

export default function Pagination({ page, totalPages, onPageChange, totalElements, pageSize }: Props) {
  const effectiveTotal = Math.max(totalPages, 1)
  const pages = buildPages(page, effectiveTotal)

  const from = totalElements != null && pageSize != null ? page * pageSize + 1 : null
  const to   = totalElements != null && pageSize != null ? Math.min((page + 1) * pageSize, totalElements) : null

  const navText = "px-2 h-[30px] rounded-lg text-xs font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-white/5"
  const arrowBtn = "p-1.5 rounded-lg hover:bg-brand-600/15 text-slate-500 hover:text-brand-400 transition-colors"

  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs text-slate-500">
        {from != null && to != null && totalElements != null
          ? `${from}–${to} sur ${totalElements}`
          : `Page ${page + 1} / ${effectiveTotal}`}
      </span>

      <div className="flex items-center gap-1">
        {/* First */}
        <button onClick={() => onPageChange(0)} className={navText}>
          Premier
        </button>

        {/* Prev */}
        <button onClick={() => onPageChange(Math.max(0, page - 1))} className={arrowBtn}>
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-600 select-none">…</span>
            : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[30px] h-[30px] rounded-lg text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {p + 1}
              </button>
            )
        )}

        {/* Next */}
        <button onClick={() => onPageChange(Math.min(effectiveTotal - 1, page + 1))} className={arrowBtn}>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button onClick={() => onPageChange(effectiveTotal - 1)} className={navText}>
          Dernier
        </button>
      </div>
    </div>
  )
}

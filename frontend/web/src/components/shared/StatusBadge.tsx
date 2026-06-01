import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING_VALIDATION:            { label: 'En attente',     class: 'badge-pending' },
  VALIDATED:                     { label: 'Validé',         class: 'badge-validated' },
  REJECTED:                      { label: 'Rejeté',         class: 'badge-rejected' },
  PLANNED:                       { label: 'Planifié',       class: 'badge-transit' },
  IN_TRANSIT:                    { label: 'En transit',     class: 'badge-transit' },
  DELIVERED:                     { label: 'Livré',          class: 'badge-completed' },
  DRAFT:                         { label: 'Brouillon',      class: 'badge-pending' },
  ASSIGNED:                      { label: 'Assigné',        class: 'badge-transit' },
  PENDING_RESPONSABLE_VALIDATION:{ label: 'Validation RP',  class: 'badge-pending' },
  IN_PROGRESS:                   { label: 'En cours',       class: 'badge-progress' },
  COMPLETED:                     { label: 'Terminé',        class: 'badge-completed' },
  OPEN:                          { label: 'Ouvert',         class: 'badge-open' },
  RESOLVED:                      { label: 'Résolu',         class: 'badge-validated' },
  CLOSED:                        { label: 'Fermé',          class: 'badge-completed' },
  PENDING:                       { label: 'En attente',     class: 'badge-pending' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, class: 'badge-pending' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.class)}>
      {config.label}
    </span>
  )
}

import { X } from 'lucide-react';

// Tokens de marque, à titre de référence uniquement :
// navy profond #101F3C (déjà utilisé côté "classe spéciale"), accent or/bronze #B8863B.
// Ils sont écrits en dur dans les classes ci-dessous (Tailwind exige des chaînes
// littérales pour générer le CSS — une couleur interpolée via une variable JS
// dans un nom de classe ne serait jamais compilée).

const toneMap = {
  blue: 'bg-blue-500/10 text-blue-700 ring-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-700 ring-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-800 ring-amber-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-700 ring-cyan-500/20',
  rose: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
  slate: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const variants = {
    primary: 'bg-[#101F3C] text-white shadow-sm hover:bg-[#0B1730] hover:shadow-md focus:ring-[#101F3C]/20',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus:ring-slate-200',
    accent: 'bg-[#B8863B] text-white shadow-sm hover:bg-[#9C7333] focus:ring-[#B8863B]/25',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-200',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// text-base (16px) sur mobile pour éviter le zoom auto de Safari au focus,
// on repasse en text-sm à partir de sm: pour garder la densité desktop.
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#101F3C] focus:ring-4 focus:ring-[#101F3C]/10 sm:text-sm ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition focus:border-[#101F3C] focus:ring-4 focus:ring-[#101F3C]/10 sm:text-sm ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#101F3C] focus:ring-4 focus:ring-[#101F3C]/10 sm:text-sm ${className}`}
      {...props}
    />
  );
}

export function Badge({ tone = 'slate', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneMap[tone] || toneMap.slate}`}>
      {children}
    </span>
  );
}

export function Card({ className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,31,60,0.04),0_10px_30px_-16px_rgba(16,31,60,0.14)] ${className}`}
    >
      {children}
    </section>
  );
}

// Bottom sheet sur mobile (glisse depuis le bas, coins arrondis en haut seulement),
// dialogue centré classique à partir de sm:.
export function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4">
      <Card className="max-h-[92vh] w-full overflow-y-auto rounded-b-none rounded-t-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          <button
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-4">{footer}</div>}
      </Card>
    </div>
  );
}

// Coeur du correctif mobile : un vrai tableau à partir de md:, des cartes empilées en dessous.
// Même API (columns/rows/renderActions/rowClassName/onRowClick/emptyMessage) — rien à changer côté appelants.
export function Table({ columns, rows, renderActions, rowClassName, onRowClick, emptyMessage }) {
  if (rows.length === 0 && emptyMessage) {
    return <div className="px-5 py-12 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  const [primaryColumn, ...restColumns] = columns;

  return (
    <>
      {/* Desktop / tablette : tableau */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-[#101F3C]/[0.03]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
              {renderActions && (
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr
                key={row.id || row.name}
                className={`transition-colors ${rowClassName?.(row) || 'hover:bg-[#101F3C]/[0.025]'}${onRowClick ? ' cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes empilées — plus de scroll horizontal, plus de texte écrasé */}
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id || row.name}
            className={`p-4 ${rowClassName?.(row) || ''}${onRowClick ? ' cursor-pointer active:bg-slate-50' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-semibold text-slate-900">
                {primaryColumn.render ? primaryColumn.render(row) : row[primaryColumn.key]}
              </div>
              {renderActions && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {renderActions(row)}
                </div>
              )}
            </div>
            {restColumns.length > 0 && (
              <div className="mt-3 space-y-3">
                {restColumns.map((column) => (
                  <div key={column.key}>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {column.label}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700">
                      {column.render ? column.render(row) : row[column.key]}
                    </dd>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function DataTable({ title, description, actions, filters, columns, rows, renderActions, rowClassName, onRowClick, emptyMessage }) {
  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:gap-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {filters && <div className="border-b border-slate-100 p-4 sm:p-5">{filters}</div>}
      <Table
        columns={columns}
        rows={rows}
        renderActions={renderActions}
        rowClassName={rowClassName}
        onRowClick={onRowClick}
        emptyMessage={emptyMessage}
      />
    </Card>
  );
}

export function StatCard({ label, value, trend, tone = 'blue', icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums text-slate-950">{value}</p>
          {trend && <p className="mt-2 text-xs font-semibold text-emerald-600">{trend}</p>}
        </div>
        {Icon && (
          <span className={`shrink-0 rounded-xl p-3 ring-1 ${toneMap[tone] || toneMap.blue}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </Card>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#B8863B]">{breadcrumb}</p>
        )}
        <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name = 'Utilisateur' }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101F3C] text-sm font-bold text-white">
      {initials}
    </span>
  );
}

export function EmptyState({ title, description, icon: Icon }) {
  return (
    <Card className="p-10 text-center">
      {Icon && <Icon className="mx-auto text-slate-300" size={36} />}
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </Card>
  );
}

export function Loader() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#101F3C]" />;
}

export function ConfirmDialog(props) {
  return <Modal {...props} />;
}

export function Dropdown({ children }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">{children}</div>;
}

export function Breadcrumb({ items = [] }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{items.join(' / ')}</p>;
}
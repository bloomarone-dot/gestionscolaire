import { X } from 'lucide-react';

const toneMap = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:ring-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-200',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return <select className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`} {...props}>{children}</select>;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`} {...props} />;
}

export function Badge({ tone = 'slate', children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneMap[tone] || toneMap.slate}`}>{children}</span>;
}

export function Card({ className = '', children }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Card className="w-full max-w-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="border-t border-slate-200 px-5 py-4">{footer}</div>}
      </Card>
    </div>
  );
}

export function Table({ columns, rows, renderActions }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => <th key={column.key} className="px-4 py-3 text-left font-semibold text-slate-600">{column.label}</th>)}
            {renderActions && <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id || row.name} className="hover:bg-slate-50">
              {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key]}</td>)}
              {renderActions && <td className="px-4 py-3 text-right">{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable({ title, description, actions, filters, columns, rows, renderActions }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {filters && <div className="border-b border-slate-200 p-5">{filters}</div>}
      <Table columns={columns} rows={rows} renderActions={renderActions} />
    </Card>
  );
}

export function StatCard({ label, value, trend, tone = 'blue', icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {trend && <p className="mt-2 text-xs font-semibold text-emerald-600">{trend}</p>}
        </div>
        {Icon && <span className={`rounded-xl p-3 ring-1 ${toneMap[tone] || toneMap.blue}`}><Icon size={20} /></span>}
      </div>
    </Card>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {breadcrumb && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{breadcrumb}</p>}
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name = 'Utilisateur' }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{initials}</span>;
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
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />;
}

export function ConfirmDialog(props) {
  return <Modal {...props} />;
}

export function Dropdown({ children }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{children}</div>;
}

export function Breadcrumb({ items = [] }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{items.join(' / ')}</p>;
}

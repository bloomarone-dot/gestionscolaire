import { GraduationCap } from 'lucide-react';
import { APP_NAME } from '../utils/brand';
import { establishmentKindLabel } from '../utils/establishmentKind';

/**
 * En-tête latéral : nom de l'établissement en premier, BloomSchool en sous-titre.
 * Chaque type (primaire / lycée / centre) a sa propre identité via `kind`.
 */
export default function BrandMark({
  schoolName,
  kind,
  subtitle,
  icon: Icon = GraduationCap,
  iconClassName = 'bg-blue-600',
  collapsed = false,
}) {
  const kindLabel = kind ? establishmentKindLabel(kind) : '';
  const title = schoolName?.trim() || APP_NAME;
  const line2 = subtitle
    || (schoolName?.trim()
      ? `${APP_NAME}${kindLabel ? ` · ${kindLabel}` : ''}`
      : (kindLabel || APP_NAME));

  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${iconClassName}`}>
        <Icon size={22} />
      </span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-slate-900" title={title}>
            {title}
          </p>
          <p className="truncate text-xs text-slate-500" title={line2}>
            {line2}
          </p>
        </div>
      )}
    </div>
  );
}

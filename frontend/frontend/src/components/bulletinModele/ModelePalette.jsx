import { COMPONENT_META, CATEGORY_LABELS, PALETTE_CATEGORY_ORDER } from '../../utils/bulletinTemplateCatalog';

export default function ModelePalette({ onAdd, readOnly, catalogComponents }) {
  // Affiche le miroir registry ; le catalog API sert surtout aux default_props à l'ajout.
  void catalogComponents;
  const items = COMPONENT_META;
  const categories = [
    ...PALETTE_CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)),
    ...[...new Set(items.map((i) => i.category))].filter((c) => !PALETTE_CATEGORY_ORDER.includes(c)),
  ];

  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-slate-50" data-testid="modele-palette">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Composants
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {categories.map((cat) => (
          <div key={cat} data-testid={`palette-category-${cat}`}>
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase text-slate-400">
              {CATEGORY_LABELS[cat] || cat}
            </div>
            <div className="space-y-1">
              {items.filter((i) => i.category === cat).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  disabled={readOnly}
                  title={item.description}
                  onClick={() => onAdd?.(item.type)}
                  className="flex w-full items-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-sm text-slate-700 hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

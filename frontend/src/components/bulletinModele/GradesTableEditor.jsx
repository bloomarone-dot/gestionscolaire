import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '../ui';
import { GRADES_BIND_OPTIONS } from '../../utils/bulletinTemplateCatalog';

export default function GradesTableEditor({ props, onChange, readOnly }) {
  const columns = props?.columns || [];

  function updateCol(index, patch) {
    const next = columns.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...props, columns: next });
  }

  function moveCol(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[index], next[j]] = [next[j], next[index]];
    onChange({ ...props, columns: next });
  }

  function removeCol(index) {
    onChange({ ...props, columns: columns.filter((_, i) => i !== index) });
  }

  function addCol() {
    const n = columns.length + 1;
    onChange({
      ...props,
      columns: [
        ...columns,
        {
          id: `col_${n}`,
          label: `Colonne ${n}`,
          bind: 'subject.name',
          width: 0.1,
          align: 'left',
          visible: true,
        },
      ],
    });
  }

  return (
    <div className="space-y-3" data-testid="grades-table-editor">
      <div className="text-xs font-semibold uppercase text-slate-500">Colonnes</div>
      <div className="space-y-2">
        {columns.map((col, index) => (
          <div key={col.id || index} className="rounded-md border border-slate-200 bg-white p-2">
            <div className="mb-1 flex items-center gap-1">
              <button type="button" disabled={readOnly} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-40" onClick={() => moveCol(index, -1)} aria-label="Monter">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={readOnly} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-40" onClick={() => moveCol(index, 1)} aria-label="Descendre">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <input
                type="checkbox"
                checked={col.visible !== false}
                disabled={readOnly}
                onChange={(e) => updateCol(index, { visible: e.target.checked })}
                aria-label="Visible"
              />
              <Input
                className="h-7 flex-1 text-xs"
                value={col.label || ''}
                disabled={readOnly}
                onChange={(e) => updateCol(index, { label: e.target.value })}
              />
              <button type="button" disabled={readOnly} className="rounded p-0.5 text-red-600 hover:bg-red-50 disabled:opacity-40" onClick={() => removeCol(index)} aria-label="Supprimer colonne">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Select
                className="h-7 text-xs"
                value={col.bind || ''}
                disabled={readOnly}
                onChange={(e) => updateCol(index, { bind: e.target.value })}
              >
                {GRADES_BIND_OPTIONS.map((o) => (
                  <option key={o.bind} value={o.bind}>{o.label}</option>
                ))}
              </Select>
              <Input
                className="h-7 text-xs"
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={col.width ?? 0.1}
                disabled={readOnly}
                onChange={(e) => updateCol(index, { width: Number(e.target.value) })}
                title="Largeur relative"
              />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" size="sm" variant="secondary" disabled={readOnly} onClick={addCol}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une colonne
      </Button>

      <div className="space-y-1 border-t border-slate-100 pt-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={readOnly} checked={!!props.show_header} onChange={(e) => onChange({ ...props, show_header: e.target.checked })} />
          Afficher l&apos;en-tête
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={readOnly} checked={!!props.repeat_header_on_page_break} onChange={(e) => onChange({ ...props, repeat_header_on_page_break: e.target.checked })} />
          Répéter l&apos;en-tête
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={readOnly} checked={!!props.show_group_headers} onChange={(e) => onChange({ ...props, show_group_headers: e.target.checked })} />
          En-têtes de groupes
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={readOnly} checked={!!props.show_group_subtotals} onChange={(e) => onChange({ ...props, show_group_subtotals: e.target.checked })} />
          Afficher sous-total
        </label>
      </div>
    </div>
  );
}

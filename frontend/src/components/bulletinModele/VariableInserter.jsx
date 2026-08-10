import { VARIABLE_CATALOG } from '../../utils/bulletinTemplateCatalog';
import { Select } from '../ui';

export default function VariableInserter({ onInsert, variables, disabled }) {
  const list = (variables?.length
    ? variables.map((p) => ({ path: p, label: p }))
    : VARIABLE_CATALOG);

  return (
    <div className="flex items-center gap-2">
      <Select
        className="h-8 text-xs"
        disabled={disabled}
        defaultValue=""
        onChange={(e) => {
          const path = e.target.value;
          if (!path) return;
          onInsert?.(`{{${path}}}`);
          e.target.value = '';
        }}
        aria-label="Insérer une variable"
      >
        <option value="">Insérer une variable…</option>
        {list.map((v) => (
          <option key={v.path} value={v.path}>{v.label || v.path}</option>
        ))}
      </Select>
    </div>
  );
}

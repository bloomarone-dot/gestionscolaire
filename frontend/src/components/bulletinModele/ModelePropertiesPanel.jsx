import { Copy, Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from '../ui';
import { COMPONENT_META } from '../../utils/bulletinTemplateCatalog';
import GradesTableEditor from './GradesTableEditor';
import VariableInserter from './VariableInserter';

const LABEL = Object.fromEntries(COMPONENT_META.map((c) => [c.type, c.label]));

function FrameFields({ frame, onChange, readOnly }) {
  function set(key, value) {
    onChange({ ...frame, [key]: Number(value) });
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {['x_mm', 'y_mm', 'width_mm', 'height_mm'].map((key) => (
        <label key={key} className="text-xs text-slate-500">
          {key.replace('_mm', '')} (mm)
          <Input
            className="mt-0.5 h-8"
            type="number"
            step="0.1"
            disabled={readOnly}
            value={frame?.[key] ?? 0}
            onChange={(e) => set(key, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

const THEME_DEFAULTS = {
  theme_primary: '#000000',
  theme_secondary: '#333333',
  theme_table_header: '#F5F5F5',
  theme_group: '#FAFAFA',
  theme_title: '#000000',
  theme_summary: '#F5F5F5',
  theme_border: '#000000',
};

const THEME_FIELDS = [
  { key: 'theme_primary', label: 'Couleur principale' },
  { key: 'theme_secondary', label: 'Couleur secondaire' },
  { key: 'theme_table_header', label: 'Couleur du tableau' },
  { key: 'theme_group', label: 'Couleur des groupes' },
  { key: 'theme_title', label: 'Couleur des titres' },
  { key: 'theme_summary', label: 'Couleur du résumé' },
  { key: 'theme_border', label: 'Couleur des bordures' },
];

function AppearanceEditor({ definition, onChangeDefinition, readOnly }) {
  const meta = definition?.meta || {};

  function setTheme(key, value) {
    const nextMeta = { ...meta, [key]: value };
    let components = definition.components || [];
    // Propager bordure / fond tableau aux grades_table existants (optionnel, non bloquant).
    if (key === 'theme_border' || key === 'theme_table_header') {
      components = components.map((c) => {
        if (c.type !== 'grades_table') return c;
        const props = { ...(c.props || {}) };
        if (key === 'theme_border') props.border_color = value;
        if (key === 'theme_table_header') props.header_background = value;
        return { ...c, props };
      });
    }
    onChangeDefinition({ ...definition, meta: nextMeta, components });
  }

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3" data-testid="appearance-editor">
      <div className="text-xs font-semibold uppercase text-slate-500">Apparence</div>
      <p className="text-[11px] text-slate-500">Neutre par défaut — personnalisez les couleurs du modèle.</p>
      <div className="space-y-2">
        {THEME_FIELDS.map((field) => (
          <label key={field.key} className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>{field.label}</span>
            <Input
              type="color"
              className="h-8 w-14 p-0.5"
              disabled={readOnly}
              value={meta[field.key] || THEME_DEFAULTS[field.key]}
              onChange={(e) => setTheme(field.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

const HEADER_TEXT_FIELDS = [
  { id: 'header_fr_republic', label: 'FR — République' },
  { id: 'header_fr_motto', label: 'FR — Devise nationale' },
  { id: 'header_fr_ministry', label: 'FR — Ministère' },
  { id: 'header_fr_deleg_r', label: 'FR — Délégation régionale' },
  { id: 'header_fr_deleg_d', label: 'FR — Délégation départementale' },
  { id: 'header_fr_contact', label: 'FR — Adresse / téléphone' },
  { id: 'header_fr_school', label: 'FR — Nom établissement' },
  { id: 'header_en_republic', label: 'EN — Republic' },
  { id: 'header_en_motto', label: 'EN — Motto' },
  { id: 'header_en_ministry', label: 'EN — Ministry' },
  { id: 'header_en_deleg_r', label: 'EN — Regional delegation' },
  { id: 'header_en_deleg_d', label: 'EN — Divisional delegation' },
  { id: 'header_en_contact', label: 'EN — City / motto' },
  { id: 'header_en_school', label: 'EN — School name' },
];

function InstitutionHeaderEditor({ definition, onChangeDefinition, readOnly }) {
  const components = definition?.components || [];
  const present = HEADER_TEXT_FIELDS.filter((f) => components.some((c) => c.id === f.id));
  if (!present.length) return null;

  function setContent(id, value) {
    onChangeDefinition({
      ...definition,
      components: components.map((c) => (
        c.id === id ? { ...c, props: { ...(c.props || {}), content: value } } : c
      )),
    });
  }

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3" data-testid="institution-header-editor">
      <div className="text-xs font-semibold uppercase text-slate-500">En-tête établissement</div>
      <p className="text-[11px] text-slate-500">
        Textes FR / EN et variables école. Le logo se configure via le composant Logo.
      </p>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {present.map((field) => {
          const comp = components.find((c) => c.id === field.id);
          return (
            <label key={field.id} className="block text-[11px] text-slate-600">
              {field.label}
              <Input
                className="mt-0.5 h-7 text-xs"
                disabled={readOnly}
                value={comp?.props?.content || ''}
                onChange={(e) => setContent(field.id, e.target.value)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function DataBindingEditor({ definition, onChangeDefinition, readOnly }) {
  const db = definition.data_binding || {};
  const groups = db.groups || [];

  function patch(partial) {
    onChangeDefinition({
      ...definition,
      data_binding: { ...db, ...partial },
    });
  }

  function updateGroup(index, partial) {
    const next = groups.map((g, i) => (i === index ? { ...g, ...partial } : g));
    patch({ groups: next });
  }

  function addGroup() {
    const n = groups.length + 1;
    patch({
      groups: [
        ...groups,
        {
          id: `g${n}`,
          label: `Groupe ${n}`,
          order: n,
          groupe_numbers: [n],
          subject_ids: [],
          subject_name_contains: [],
          show_subtotal: true,
        },
      ],
    });
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3" data-testid="groups-editor">
      <div className="text-xs font-semibold uppercase text-slate-500">Groupes de matières</div>
      <Select
        className="h-8 text-xs"
        disabled={readOnly}
        value={db.groups_mode || 'from_classe_matiere'}
        onChange={(e) => patch({ groups_mode: e.target.value })}
      >
        <option value="from_classe_matiere">Depuis les matières (classe)</option>
        <option value="from_template">Configuration du modèle</option>
        <option value="legacy_infer">Liste simple</option>
      </Select>
      {groups.map((g, index) => (
        <div key={g.id || index} className="rounded border border-slate-200 p-2 text-xs">
          <Input
            className="mb-1 h-7"
            disabled={readOnly}
            value={g.label || ''}
            onChange={(e) => updateGroup(index, { label: e.target.value })}
            placeholder="Libellé du groupe"
          />
          <Input
            className="mb-1 h-7"
            disabled={readOnly}
            value={(g.groupe_numbers || []).join(',')}
            onChange={(e) => updateGroup(index, {
              groupe_numbers: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => n > 0),
            })}
            placeholder="N° groupes (ex. 1,2)"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={g.show_subtotal !== false}
              onChange={(e) => updateGroup(index, { show_subtotal: e.target.checked })}
            />
            Sous-total
          </label>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" disabled={readOnly} onClick={addGroup}>
        Ajouter un groupe
      </Button>
    </div>
  );
}

export default function ModelePropertiesPanel({
  component,
  definition,
  onChangeComponent,
  onChangeDefinition,
  onDuplicate,
  onDelete,
  readOnly,
  variables,
}) {
  if (!component) {
    return (
      <aside className="flex h-full flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Propriétés
        </div>
        <div className="space-y-3 p-3 text-sm text-slate-500">
          Sélectionnez un composant sur le canvas.
          <AppearanceEditor definition={definition} onChangeDefinition={onChangeDefinition} readOnly={readOnly} />
          <InstitutionHeaderEditor definition={definition} onChangeDefinition={onChangeDefinition} readOnly={readOnly} />
          <DataBindingEditor definition={definition} onChangeDefinition={onChangeDefinition} readOnly={readOnly} />
        </div>
      </aside>
    );
  }

  const props = component.props || {};

  function patchProps(partial) {
    onChangeComponent(component.id, { props: { ...props, ...partial } });
  }

  function patchStyle(partial) {
    patchProps({ style: { ...(props.style || {}), ...partial } });
  }

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white" data-testid="properties-panel">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {LABEL[component.type] || component.type}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={readOnly} onClick={() => onDuplicate?.(component.id)}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Dupliquer
          </Button>
          <Button type="button" size="sm" variant="danger" disabled={readOnly} onClick={() => onDelete?.(component.id)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
          </Button>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Position / taille</div>
          <FrameFields
            frame={component.frame}
            readOnly={readOnly}
            onChange={(frame) => onChangeComponent(component.id, { frame })}
          />
        </div>

        {component.type === 'text' && (
          <div className="space-y-2">
            <VariableInserter
              disabled={readOnly}
              variables={variables}
              onInsert={(token) => patchProps({ content: `${props.content || ''}${token}` })}
            />
            <Textarea
              rows={4}
              disabled={readOnly}
              value={props.content || ''}
              onChange={(e) => patchProps({ content: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select disabled={readOnly} value={props.style?.font_family || 'Helvetica'} onChange={(e) => patchStyle({ font_family: e.target.value })}>
                <option>Helvetica</option>
                <option>Times-Roman</option>
                <option>Courier</option>
              </Select>
              <Input type="number" disabled={readOnly} value={props.style?.font_size_pt ?? 10} onChange={(e) => patchStyle({ font_size_pt: Number(e.target.value) })} />
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" disabled={readOnly} checked={!!props.style?.bold} onChange={(e) => patchStyle({ bold: e.target.checked })} /> Gras</label>
              <label className="flex items-center gap-1"><input type="checkbox" disabled={readOnly} checked={!!props.style?.italic} onChange={(e) => patchStyle({ italic: e.target.checked })} /> Italique</label>
              <Select disabled={readOnly} value={props.style?.align || 'left'} onChange={(e) => patchStyle({ align: e.target.value })}>
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </Select>
              <Input type="color" disabled={readOnly} value={props.style?.color || '#000000'} onChange={(e) => patchStyle({ color: e.target.value })} />
            </div>
          </div>
        )}

        {component.type === 'image' && (
          <div className="space-y-2">
            <Select disabled={readOnly} value={props.source || 'school.logo'} onChange={(e) => patchProps({ source: e.target.value })}>
              <option value="school.logo">Logo établissement</option>
              <option value="student.photo">Photo élève</option>
              <option value="url">URL</option>
            </Select>
            {(props.source === 'url' || props.source === 'static') && (
              <Input disabled={readOnly} value={props.url || ''} onChange={(e) => patchProps({ url: e.target.value })} placeholder="https://…" />
            )}
            <Select disabled={readOnly} value={props.fit || 'contain'} onChange={(e) => patchProps({ fit: e.target.value })}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="stretch">Stretch</option>
            </Select>
          </div>
        )}

        {component.type === 'grades_table' && (
          <GradesTableEditor props={props} readOnly={readOnly} onChange={patchProps} />
        )}

        {component.type === 'student_block' && (
          <label className="flex items-center gap-2 text-sm">
            Colonnes
            <Input type="number" min={1} max={4} disabled={readOnly} value={props.columns ?? 2} onChange={(e) => patchProps({ columns: Number(e.target.value) })} />
          </label>
        )}

        {component.type === 'signatures_row' && (
          <div className="space-y-2 text-sm">
            {(props.slots || []).map((slot, i) => (
              <Input
                key={`${slot.slot}-${i}`}
                disabled={readOnly}
                value={slot.label || ''}
                onChange={(e) => {
                  const slots = (props.slots || []).map((s, idx) => (idx === i ? { ...s, label: e.target.value } : s));
                  patchProps({ slots });
                }}
              />
            ))}
          </div>
        )}

        {(component.type === 'institution_header' || component.type === 'qr_code') && (
          <div className="space-y-2">
            <VariableInserter
              disabled={readOnly}
              variables={variables}
              onInsert={(token) => {
                if (component.type === 'qr_code') patchProps({ content: token });
                else patchProps({ title: `${props.title || ''}${token}` });
              }}
            />
            {component.type === 'institution_header' && (
              <>
                <Input disabled={readOnly} value={props.title || ''} onChange={(e) => patchProps({ title: e.target.value })} placeholder="Titre" />
                <Input disabled={readOnly} value={props.subtitle || ''} onChange={(e) => patchProps({ subtitle: e.target.value })} placeholder="Sous-titre" />
              </>
            )}
            {component.type === 'qr_code' && (
              <Input disabled={readOnly} value={props.content || ''} onChange={(e) => patchProps({ content: e.target.value })} />
            )}
          </div>
        )}

        <AppearanceEditor definition={definition} onChangeDefinition={onChangeDefinition} readOnly={readOnly} />
        <InstitutionHeaderEditor definition={definition} onChangeDefinition={onChangeDefinition} readOnly={readOnly} />
        <DataBindingEditor definition={definition} onChangeDefinition={onChangeDefinition} readOnly={readOnly} />
      </div>
    </aside>
  );
}

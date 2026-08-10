import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ModelePalette from '../../components/bulletinModele/ModelePalette';
import ModeleCanvas from '../../components/bulletinModele/ModeleCanvas';
import GradesTableEditor from '../../components/bulletinModele/GradesTableEditor';
import VariableInserter from '../../components/bulletinModele/VariableInserter';
import {
  createComponent,
  defaultGradesColumns,
  emptyTemplateV1,
} from '../../utils/bulletinTemplateCatalog';

describe('ModelePalette', () => {
  it('affiche les composants et ajoute au clic', () => {
    const onAdd = vi.fn();
    render(<ModelePalette onAdd={onAdd} />);
    expect(screen.getByText('Tableau des notes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Logo'));
    expect(onAdd).toHaveBeenCalledWith('school_logo');
  });

  it('désactive en lecture seule', () => {
    const onAdd = vi.fn();
    render(<ModelePalette onAdd={onAdd} readOnly />);
    fireEvent.click(screen.getByText('Texte'));
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe('ModeleCanvas', () => {
  it('rend la page et sélectionne un composant', () => {
    const def = emptyTemplateV1();
    def.components = [createComponent('student_block')];
    const onSelect = vi.fn();
    render(
      <ModeleCanvas
        definition={def}
        selectedId={null}
        onSelect={onSelect}
        onChangeComponent={vi.fn()}
        zoom={1}
      />,
    );
    expect(screen.getByTestId('bulletin-canvas-page')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('canvas-component-student_block'));
    expect(onSelect).toHaveBeenCalledWith(def.components[0].id);
  });

  it('le zoom ne change pas les mm du template', () => {
    const def = emptyTemplateV1();
    const c = createComponent('text');
    def.components = [c];
    const { rerender } = render(
      <ModeleCanvas definition={def} selectedId={c.id} onSelect={vi.fn()} onChangeComponent={vi.fn()} zoom={0.75} />,
    );
    expect(def.components[0].frame.x_mm).toBe(c.frame.x_mm);
    rerender(
      <ModeleCanvas definition={def} selectedId={c.id} onSelect={vi.fn()} onChangeComponent={vi.fn()} zoom={1.5} />,
    );
    expect(def.components[0].frame.width_mm).toBe(c.frame.width_mm);
  });
});

describe('GradesTableEditor', () => {
  it('ajoute et réordonne des colonnes', () => {
    const onChange = vi.fn();
    const props = { columns: defaultGradesColumns(), show_header: true, show_group_subtotals: true, repeat_header_on_page_break: true };
    render(<GradesTableEditor props={props} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Ajouter une colonne/i));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)[0];
    expect(next.columns.length).toBe(props.columns.length + 1);
  });

  it('monte une colonne', () => {
    const onChange = vi.fn();
    const props = {
      columns: [
        { id: 'a', label: 'A', bind: 'subject.name', width: 0.5, visible: true },
        { id: 'b', label: 'B', bind: 'subject.average', width: 0.5, visible: true },
      ],
    };
    render(<GradesTableEditor props={props} onChange={onChange} />);
    fireEvent.click(screen.getAllByLabelText('Monter')[1]);
    const next = onChange.mock.calls.at(-1)[0];
    expect(next.columns[0].id).toBe('b');
  });
});

describe('VariableInserter', () => {
  it('insère une variable whitelist', () => {
    const onInsert = vi.fn();
    render(<VariableInserter onInsert={onInsert} />);
    fireEvent.change(screen.getByLabelText(/Insérer une variable/i), {
      target: { value: 'student.full_name' },
    });
    expect(onInsert).toHaveBeenCalledWith('{{student.full_name}}');
  });
});

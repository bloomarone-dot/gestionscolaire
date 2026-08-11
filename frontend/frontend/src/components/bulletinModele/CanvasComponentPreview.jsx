import {
  interpolateDemo,
  studentFieldLabel,
  studentFieldDemoValue,
  summaryFieldLabel,
  summaryFieldDemoValue,
  demoGradesRows,
  CANVAS_DEMO_VALUES,
} from '../../utils/canvasDemoContext';

function TextBlock({ content, style = {} }) {
  const text = interpolateDemo(content || '');
  const align = style.align || 'left';
  const size = Math.max(7, Number(style.font_size_pt) || 9);
  return (
    <div
      className="h-full w-full overflow-hidden whitespace-pre-wrap px-0.5"
      style={{
        fontFamily: style.font_family === 'Times-Roman' ? 'Times New Roman, serif' : 'Helvetica, Arial, sans-serif',
        fontSize: `${size}px`,
        fontWeight: style.bold ? 700 : 400,
        fontStyle: style.italic ? 'italic' : 'normal',
        color: style.color || '#000',
        textAlign: align,
        lineHeight: 1.25,
      }}
    >
      {text}
    </div>
  );
}

function LogoPreview() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-neutral-400 bg-neutral-50 text-[9px] text-neutral-600">
      <div className="font-semibold tracking-wide">LOGO</div>
      <div className="text-[8px] opacity-70">Établissement</div>
    </div>
  );
}

function InstitutionHeaderPreview({ props }) {
  const title = interpolateDemo(props?.title || '{{school.name}}');
  const subtitle = interpolateDemo(props?.subtitle || '');
  const motto = props?.show_motto !== false ? CANVAS_DEMO_VALUES['school.motto'] : '';
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center">
      <div className="text-[11px] font-bold leading-tight">{title}</div>
      {subtitle ? <div className="text-[9px] font-semibold uppercase tracking-wide">{subtitle}</div> : null}
      {motto ? <div className="mt-0.5 text-[8px] italic text-neutral-700">{motto}</div> : null}
    </div>
  );
}

function StudentBlockPreview({ props }) {
  const fields = props?.fields || ['full_name', 'matricule', 'class', 'gender'];
  const cols = Math.max(1, Math.min(4, Number(props?.columns) || 2));
  return (
    <div
      className="grid h-full w-full gap-x-2 gap-y-0.5 overflow-hidden border border-neutral-800 bg-white p-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {fields.map((field) => (
        <div key={field} className="min-w-0 text-[9px] leading-snug text-black">
          {props?.show_labels !== false && (
            <span className="font-semibold uppercase tracking-wide text-[8px] text-neutral-700">
              {studentFieldLabel(field)} :{' '}
            </span>
          )}
          <span>{studentFieldDemoValue(field)}</span>
        </div>
      ))}
    </div>
  );
}

function GradesTablePreview({ props, definition }) {
  const columns = (props?.columns || []).filter((c) => c.visible !== false);
  const border = props?.border_color || '#000000';
  const headerBg = props?.header_background || '#F5F5F5';
  const rows = demoGradesRows(definition);
  const colCount = Math.max(1, columns.length);

  return (
    <div className="h-full w-full overflow-hidden border bg-white" style={{ borderColor: border }}>
      <table className="w-full border-collapse text-[8px] leading-tight text-black" style={{ tableLayout: 'fixed' }}>
        {props?.show_header !== false && (
          <thead>
            <tr style={{ background: headerBg }}>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="border px-0.5 py-0.5 font-semibold"
                  style={{ borderColor: border, width: `${(col.width || 1 / colCount) * 100}%` }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, idx) => {
            if (row.kind === 'group') {
              return (
                <tr key={`g-${idx}`} style={{ background: definition?.meta?.theme_group || '#FAFAFA' }}>
                  <td
                    colSpan={colCount}
                    className="border px-1 py-0.5 text-left text-[8px] font-bold uppercase"
                    style={{ borderColor: border }}
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={`r-${idx}`}>
                {columns.map((col, ci) => (
                  <td key={col.id} className="border px-0.5 py-0.5 truncate" style={{ borderColor: border }}>
                    {row.cells[ci] ?? ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBlockPreview({ props, definition }) {
  const fields = props?.fields || ['general_average', 'rank', 'class_size', 'decision'];
  const bg = definition?.meta?.theme_summary || '#F5F5F5';
  const border = definition?.meta?.theme_border || '#000000';
  return (
    <div className="grid h-full w-full grid-cols-2 gap-1 overflow-hidden border p-1.5" style={{ background: bg, borderColor: border }}>
      {fields.map((field) => (
        <div key={field} className="text-[9px] leading-snug text-black">
          <span className="font-semibold uppercase text-[8px]">{summaryFieldLabel(field)} : </span>
          <span>{summaryFieldDemoValue(field)}</span>
        </div>
      ))}
    </div>
  );
}

function AttendancePreview({ props }) {
  return (
    <div className="flex h-full w-full items-center gap-4 border border-neutral-800 bg-white px-2 text-[9px]">
      {props?.show_absences !== false && (
        <span>
          <strong>Absences :</strong> {CANVAS_DEMO_VALUES['attendance.absences']}
        </span>
      )}
      {props?.show_sanctions !== false && (
        <span>
          <strong>Sanctions :</strong> {CANVAS_DEMO_VALUES['attendance.sanctions']}
        </span>
      )}
    </div>
  );
}

function SignaturesPreview({ props }) {
  const slots = props?.slots || [
    { label: 'Parents / Tuteurs' },
    { label: 'Professeur principal' },
    { label: "Le Chef d'établissement" },
  ];
  return (
    <div className="flex h-full w-full items-stretch justify-between gap-2 px-1 pt-1">
      {slots.map((slot, i) => (
        <div key={`${slot.slot || i}-${i}`} className="flex flex-1 flex-col items-center text-center">
          <div className="text-[8px] font-semibold uppercase tracking-wide">{slot.label}</div>
          <div className="mt-auto mb-1 w-full border-b border-neutral-800" style={{ minHeight: '18px' }} />
        </div>
      ))}
    </div>
  );
}

function ShapePreview({ props }) {
  if (props?.shape === 'line') {
    return <div className="h-full w-full border-t" style={{ borderColor: props.stroke_color || '#000' }} />;
  }
  return (
    <div
      className="h-full w-full"
      style={{
        border: `${props?.stroke_width_pt || 0.5}px solid ${props?.stroke_color || '#000'}`,
        background: props?.fill_color || 'transparent',
      }}
    />
  );
}

export default function CanvasComponentPreview({ component, definition }) {
  const props = component?.props || {};
  switch (component?.type) {
    case 'text':
      return <TextBlock content={props.content} style={props.style} />;
    case 'school_logo':
    case 'image':
    case 'student_photo':
      return <LogoPreview />;
    case 'institution_header':
      return <InstitutionHeaderPreview props={props} />;
    case 'student_block':
      return <StudentBlockPreview props={props} />;
    case 'grades_table':
      return <GradesTablePreview props={props} definition={definition} />;
    case 'summary_block':
      return <SummaryBlockPreview props={props} definition={definition} />;
    case 'attendance_block':
      return <AttendancePreview props={props} />;
    case 'signatures_row':
      return <SignaturesPreview props={props} />;
    case 'shape':
      return <ShapePreview props={props} />;
    case 'spacer':
      return <div className="h-full w-full" />;
    case 'qr_code':
      return (
        <div className="flex h-full w-full items-center justify-center border border-neutral-400 text-[8px]">
          QR
        </div>
      );
    case 'page_number':
      return (
        <div className="flex h-full w-full items-center justify-center text-[8px] text-neutral-600">
          {interpolateDemo(props.format || 'Page {{page}} / {{pages}}', { page: '1', pages: '1', ...CANVAS_DEMO_VALUES })}
        </div>
      );
    default:
      return (
        <div className="flex h-full w-full items-center justify-center text-[8px] text-neutral-500">
          {component?.type}
        </div>
      );
  }
}

import { COMPONENT_META, pageSizeMm } from '../../utils/bulletinTemplateCatalog';

const LABEL = Object.fromEntries(COMPONENT_META.map((c) => [c.type, c.label]));

/** 1 mm affichage de base = 3.2 CSS px à zoom 100 % (A4 portrait ~672×950). */
export const MM_TO_PX = 3.2;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function ModeleCanvas({
  definition,
  selectedId,
  onSelect,
  onChangeComponent,
  zoom = 1,
  readOnly = false,
}) {
  const page = pageSizeMm(definition);
  const margins = definition?.page?.margins || { top: 10, right: 10, bottom: 10, left: 10 };
  const scale = MM_TO_PX * zoom;
  const pageW = page.width_mm * scale;
  const pageH = page.height_mm * scale;
  const usableLeft = margins.left * scale;
  const usableTop = margins.top * scale;
  const usableW = (page.width_mm - margins.left - margins.right) * scale;
  const usableH = (page.height_mm - margins.top - margins.bottom) * scale;

  function startDrag(e, component, mode) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(component.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const frame = { ...component.frame };

    function onMove(ev) {
      const dxMm = (ev.clientX - startX) / scale;
      const dyMm = (ev.clientY - startY) / scale;
      const next = { ...frame };
      if (mode === 'move') {
        next.x_mm = Math.round((frame.x_mm + dxMm) * 10) / 10;
        next.y_mm = Math.round((frame.y_mm + dyMm) * 10) / 10;
      } else if (mode === 'resize') {
        next.width_mm = Math.round(clamp(frame.width_mm + dxMm, 5, 320) * 10) / 10;
        next.height_mm = Math.round(clamp(frame.height_mm + dyMm, 3, 450) * 10) / 10;
      }
      onChangeComponent?.(component.id, { frame: next });
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const components = [...(definition?.components || [])].sort(
    (a, b) => (a.z_index || 0) - (b.z_index || 0),
  );

  return (
    <div className="flex h-full flex-col bg-slate-200/70">
      <div className="flex-1 overflow-auto p-6" onClick={() => onSelect?.(null)}>
        <div
          className="relative mx-auto bg-white shadow-xl"
          style={{ width: pageW, height: pageH }}
          data-testid="bulletin-canvas-page"
        >
          <div
            className="absolute border border-dashed border-slate-300"
            style={{ left: usableLeft, top: usableTop, width: usableW, height: usableH }}
          />
          {components.filter((c) => c.visible !== false).map((c) => {
            const selected = c.id === selectedId;
            const left = usableLeft + (c.frame?.x_mm || 0) * scale;
            const top = usableTop + (c.frame?.y_mm || 0) * scale;
            const width = (c.frame?.width_mm || 10) * scale;
            const height = (c.frame?.height_mm || 10) * scale;
            return (
              <div
                key={c.id}
                data-testid={`canvas-component-${c.type}`}
                role="button"
                tabIndex={0}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect?.(c.id);
                }}
                onPointerDown={(ev) => startDrag(ev, c, 'move')}
                className={`absolute overflow-hidden rounded-sm border text-[10px] leading-tight ${
                  selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-400/70'
                } ${readOnly ? 'cursor-default' : 'cursor-move'}`}
                style={{
                  left,
                  top,
                  width,
                  height,
                  background: c.type === 'grades_table' ? '#f8fafc' : '#ffffffcc',
                  zIndex: (c.z_index || 0) + 1,
                }}
              >
                <div className="truncate bg-slate-100/90 px-1 py-0.5 font-medium text-slate-600">
                  {LABEL[c.type] || c.type}
                </div>
                <div className="px-1 text-slate-500">
                  {c.type === 'text' ? String(c.props?.content || '').slice(0, 40) : c.id}
                </div>
                {selected && !readOnly && (
                  <div
                    data-testid="canvas-resize-handle"
                    className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-blue-500"
                    onPointerDown={(ev) => startDrag(ev, c, 'resize')}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

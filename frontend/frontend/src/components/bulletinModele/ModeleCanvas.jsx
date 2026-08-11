import CanvasComponentPreview from './CanvasComponentPreview';
import { pageSizeMm, clampFrameToPage } from '../../utils/bulletinTemplateCatalog';

/** 1 mm affichage de base = 3.2 CSS px à zoom 100 % (A4 portrait ~672×950). */
export const MM_TO_PX = 3.2;

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
    // Snapshot : le zoom ne doit pas muter les mm de départ ; seuls les deltas pixels→mm comptent.
    const frame = { ...(component.frame || {}) };
    const dragScale = scale;

    function onMove(ev) {
      const dxMm = (ev.clientX - startX) / dragScale;
      const dyMm = (ev.clientY - startY) / dragScale;
      const next = { ...frame };
      if (mode === 'move') {
        next.x_mm = frame.x_mm + dxMm;
        next.y_mm = frame.y_mm + dyMm;
      } else if (mode === 'resize') {
        next.width_mm = frame.width_mm + dxMm;
        next.height_mm = frame.height_mm + dyMm;
      }
      onChangeComponent?.(component.id, {
        frame: clampFrameToPage(next, definition),
      });
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
    <div className="flex h-full flex-col bg-neutral-300/80">
      <div className="flex-1 overflow-auto p-6" onClick={() => onSelect?.(null)}>
        <div
          className="relative mx-auto bg-white shadow-2xl"
          style={{ width: pageW, height: pageH }}
          data-testid="bulletin-canvas-page"
        >
          <div
            className="pointer-events-none absolute"
            style={{ left: usableLeft, top: usableTop, width: usableW, height: usableH }}
            aria-hidden
          />
          {components.filter((c) => c.visible !== false).map((c) => {
            const selected = c.id === selectedId;
            const frame = clampFrameToPage(c.frame || {}, definition);
            const left = usableLeft + frame.x_mm * scale;
            const top = usableTop + frame.y_mm * scale;
            const width = frame.width_mm * scale;
            const height = frame.height_mm * scale;
            return (
              <div
                key={c.id}
                data-testid={`canvas-component-${c.type}`}
                data-component-id={c.id}
                role="button"
                tabIndex={0}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect?.(c.id);
                }}
                onPointerDown={(ev) => startDrag(ev, { ...c, frame }, 'move')}
                className={`absolute overflow-hidden ${
                  selected
                    ? 'outline outline-2 outline-offset-0 outline-sky-500 ring-0'
                    : 'outline outline-1 outline-transparent hover:outline-neutral-300'
                } ${readOnly ? 'cursor-default' : 'cursor-move'}`}
                style={{
                  left,
                  top,
                  width,
                  height,
                  background: 'transparent',
                  zIndex: (c.z_index || 0) + 1,
                }}
                title={selected ? `${c.type} · ${c.id}` : undefined}
              >
                <CanvasComponentPreview component={c} definition={definition} />
                {selected && !readOnly && (
                  <div
                    data-testid="canvas-resize-handle"
                    className="absolute bottom-0 right-0 z-10 h-3 w-3 cursor-se-resize bg-sky-500"
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      startDrag(ev, { ...c, frame }, 'resize');
                    }}
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

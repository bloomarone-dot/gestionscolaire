import { Modal, Button } from '../ui';

/** Affiche le RenderedDocument renvoyé par POST /bulletins/v2/preview (pas de rendu PDF JS). */
export default function ModelePreviewModal({ open, onClose, preview, loading, error }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aperçu bulletin V2"
      footer={<Button variant="secondary" onClick={onClose}>Fermer</Button>}
    >
      {loading && <p className="text-sm text-slate-500">Génération de l&apos;aperçu…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview && !loading && (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto" data-testid="preview-document">
          <div className="text-xs text-slate-500">
            {preview.template_name} — {preview.page_count} page(s)
            {preview.warnings?.length ? ` · ${preview.warnings.length} avertissement(s)` : ''}
          </div>
          {(preview.pages || []).map((page) => (
            <div key={page.index} className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-600">
                Page {page.index + 1} ({page.geometry?.width_mm}×{page.geometry?.height_mm} mm)
              </div>
              <div className="space-y-1">
                {(page.elements || []).map((el) => (
                  <div key={el.id} className="rounded bg-white px-2 py-1 text-xs text-slate-700">
                    <span className="font-medium text-slate-500">{el.component_type}</span>
                    {' · '}
                    {el.frame?.x_mm},{el.frame?.y_mm} {el.frame?.width_mm}×{el.frame?.height_mm} mm
                    {el.content?.kind ? ` · ${el.content.kind}` : ''}
                    {typeof el.content?.text === 'string' ? ` — ${el.content.text.slice(0, 80)}` : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

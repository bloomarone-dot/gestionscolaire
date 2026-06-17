import { X } from 'lucide-react';
import BulletinDetail from './BulletinDetail';

export default function BulletinPreviewModal({
  open,
  onClose,
  bulletin,
  onExportPdf,
  exporting,
}) {
  if (!open || !bulletin) return null;

  return (
    <div className="bulletin-preview-overlay" role="dialog" aria-modal="true" aria-label="Aperçu bulletin">
      <div className="bulletin-preview-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="bulletin-preview-panel">
        <div className="bulletin-preview-toolbar">
          <div>
            <div className="bulletin-preview-toolbar-label">Bulletin officiel</div>
            <div className="bulletin-preview-toolbar-title">
              {bulletin.eleve || `${bulletin.eleve_nom || ''} ${bulletin.eleve_prenom || ''}`.trim()}
              {bulletin.classe ? ` — ${bulletin.classe}` : ''}
            </div>
          </div>
          <button type="button" className="bulletin-preview-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="bulletin-preview-body">
          <BulletinDetail
            bulletin={bulletin}
            readOnly
            variant="official"
            onExportPdf={onExportPdf}
            exporting={exporting}
          />
        </div>
      </div>
    </div>
  );
}

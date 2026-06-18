import { X } from 'lucide-react';
import BulletinDetail from './BulletinDetail';
import { Badge } from './ui';
import { sectionBadgeTone } from '../utils/section';

export default function BulletinPreviewModal({
  open,
  onClose,
  bulletin,
  onExportPdf,
  exporting,
}) {
  if (!open || !bulletin) return null;

  const subsystemCode = bulletin.subsystem_code
    || (bulletin.lang === 'en' ? 'ANGLOPHONE' : bulletin.lang === 'fr' ? 'FRANCOPHONE' : null);
  const sectionLabel = subsystemCode === 'ANGLOPHONE'
    ? 'Section anglophone'
    : subsystemCode === 'FRANCOPHONE'
      ? 'Section francophone'
      : null;
  const bulletinLangLabel = bulletin.lang === 'en'
    ? 'Bulletin en anglais'
    : bulletin.lang === 'fr'
      ? 'Bulletin en français'
      : null;

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
            {(sectionLabel || bulletinLangLabel) && (
              <div className="bulletin-preview-toolbar-badges">
                {sectionLabel && (
                  <Badge tone={sectionBadgeTone(subsystemCode)}>{sectionLabel}</Badge>
                )}
                {bulletinLangLabel && (
                  <Badge tone="slate">{bulletinLangLabel}</Badge>
                )}
              </div>
            )}
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

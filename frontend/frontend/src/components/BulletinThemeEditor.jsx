import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui';
import {
  BULLETIN_THEME_PRESETS,
  BULLETIN_THEME_SECTIONS,
  DEFAULT_BULLETIN_THEME,
  applyPreset,
  normalizeBulletinTheme,
  presetLabel,
  themeToCssVars,
} from '../utils/bulletinTheme';
import '../styles/bulletin-theme-editor.css';

const PREVIEW_ZONES = [
  { key: 'national_header', label: 'En-tête', flex: 2 },
  { key: 'title_bar', label: 'Titre', flex: 1 },
  { key: 'identity_label', label: 'Identité', flex: 1 },
  { key: 'identity_row', label: 'Ligne grise', flex: 1 },
  { key: 'grades_header', label: 'Notes (tête)', flex: 1 },
  { key: 'group_row', label: 'Groupe', flex: 1 },
  { key: 'grade_row', label: 'Matières', flex: 2 },
  { key: 'summary', label: 'Synthèse', flex: 1.5 },
  { key: 'signatures', label: 'Signatures', flex: 1 },
];

export default function BulletinThemeEditor({ theme, onChange }) {
  const normalized = normalizeBulletinTheme(theme);
  const [activeKey, setActiveKey] = useState('national_header');

  function setColor(key, value) {
    onChange({ ...normalized, [key]: value, preset: undefined });
  }

  function loadPreset(presetKey) {
    onChange(applyPreset(presetKey));
  }

  function resetDefault() {
    onChange({ ...DEFAULT_BULLETIN_THEME, preset: 'royal_priesthood' });
  }

  const cssVars = themeToCssVars(normalized);

  return (
    <div className="bulletin-theme-editor">
      <div className="bulletin-theme-editor-intro">
        <p>
          Personnalisez les couleurs de chaque partie du bulletin.
          Cliquez une zone de l&apos;aperçu ou choisissez une section ci-dessous.
        </p>
        <div className="bulletin-theme-presets">
          <span className="text-sm font-semibold text-slate-600">Modèle :</span>
          {Object.keys(BULLETIN_THEME_PRESETS).map((key) => (
            <button
              key={key}
              type="button"
              className={`bulletin-theme-preset-btn${normalized.preset === key ? ' active' : ''}`}
              onClick={() => loadPreset(key)}
            >
              {presetLabel(key)}
            </button>
          ))}
          <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={resetDefault}>
            <RotateCcw size={14} /> Défaut
          </Button>
        </div>
      </div>

      <div className="bulletin-theme-layout">
        <div
          className="bulletin-theme-preview"
          style={cssVars}
          aria-label="Aperçu des couleurs du bulletin"
        >
          <p className="bulletin-theme-preview-hint">Cliquez une zone pour la modifier</p>
          <div className="bulletin-theme-preview-stack">
            {PREVIEW_ZONES.map((zone) => (
              <button
                key={zone.key}
                type="button"
                className={`bulletin-theme-zone zone-${zone.key}${activeKey === zone.key ? ' active' : ''}`}
                style={{ flex: zone.flex, background: normalized[zone.key] }}
                onClick={() => setActiveKey(zone.key)}
                title={BULLETIN_THEME_SECTIONS[zone.key]}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bulletin-theme-fields">
          <h3 className="text-sm font-bold text-slate-900">
            {BULLETIN_THEME_SECTIONS[activeKey]}
          </h3>
          <div className="bulletin-theme-color-row">
            <input
              type="color"
              value={normalized[activeKey]}
              onChange={(e) => setColor(activeKey, e.target.value)}
              aria-label={`Couleur ${BULLETIN_THEME_SECTIONS[activeKey]}`}
            />
            <input
              type="text"
              value={normalized[activeKey]}
              onChange={(e) => setColor(activeKey, e.target.value)}
              className="bulletin-theme-hex"
              maxLength={7}
            />
          </div>

          <ul className="bulletin-theme-section-list">
            {Object.entries(BULLETIN_THEME_SECTIONS).map(([key, label]) => (
              <li key={key}>
                <button
                  type="button"
                  className={`bulletin-theme-section-item${activeKey === key ? ' active' : ''}`}
                  onClick={() => setActiveKey(key)}
                >
                  <span className="bulletin-theme-swatch" style={{ background: normalized[key] }} />
                  <span>{label}</span>
                  <code>{normalized[key]}</code>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

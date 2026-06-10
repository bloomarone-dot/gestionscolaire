import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/api';
import '../styles/admin-bulletin-settings.css';

const MAX_LOGO_SIZE = 500 * 1024;

const DEFAULT_DELEGATION_EN = `REPUBLIC OF CAMEROON
Peace – Work – Fatherland
MINISTRY OF SECONDARY EDUCATION
REGIONAL DELEGATION FOR CENTER
DIVISIONAL DELEGATION FOR MEFOU AND AFAMBA`;

const DEFAULT_DELEGATION_FR = `RÉPUBLIQUE DU CAMEROUN
Paix – Travail – Patrie
MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES
DÉLÉGATION RÉGIONALE DU CENTRE
DÉLÉGATION DÉPARTEMENTALE DU MEFOU ET AFAMBA`;

export default function AdminBulletinSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMatiereId, setSavingMatiereId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    logo_url: '',
    bulletin_po_box: '',
    bulletin_motto: '',
    bulletin_delegation_en: DEFAULT_DELEGATION_EN,
    bulletin_delegation_fr: DEFAULT_DELEGATION_FR,
    bulletin_next_term_note: '',
    bulletin_template: 'cameroon_bilingual',
    bulletin_scope: 'trimestre',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [settingsData, matieresData] = await Promise.all([
        api.fetchBulletinSettings(),
        api.fetchMatieres(),
      ]);
      setSettings(settingsData);
      setMatieres(matieresData);
      setForm({
        logo_url: settingsData.logo_url || '',
        bulletin_po_box: settingsData.bulletin_po_box || '',
        bulletin_motto: settingsData.bulletin_motto || '',
        bulletin_delegation_en: settingsData.bulletin_delegation_en || DEFAULT_DELEGATION_EN,
        bulletin_delegation_fr: settingsData.bulletin_delegation_fr || DEFAULT_DELEGATION_FR,
        bulletin_next_term_note: settingsData.bulletin_next_term_note || '',
        bulletin_template: settingsData.bulletin_template || 'cameroon_bilingual',
        bulletin_scope: settingsData.bulletin_scope || 'trimestre',
      });
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_SIZE) {
      setError('Logo trop volumineux (max 500 Ko)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, logo_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const updated = await api.updateBulletinSettings(form);
      setSettings(updated);
      setSuccess('Configuration bulletin enregistrée');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMatiereFieldChange = (id, field, value) => {
    setMatieres((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const handleSaveMatiere = async (matiere) => {
    try {
      setSavingMatiereId(matiere.id);
      setError('');
      const updated = await api.updateMatiere(matiere.id, {
        groupe: parseInt(matiere.groupe, 10) || 1,
        coefficient_defaut: parseFloat(matiere.coefficient_defaut) || 1,
      });
      setMatieres((prev) => prev.map((m) => (m.id === matiere.id ? updated : m)));
      setSuccess(`Matière « ${matiere.nom} » mise à jour`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMatiereId(null);
    }
  };

  if (loading) {
    return <div className="page-loader"><div className="spinner" /></div>;
  }

  return (
    <div className="admin-bulletin-settings">
      <header className="section-header">
        <h2>Configuration des bulletins</h2>
        <p>
          Personnalisez l&apos;en-tête officiel, le modèle PDF et les groupes de matières
          pour {settings?.name || 'votre établissement'}.
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSaveSettings} className="bulletin-settings-card">
        <h3>En-tête officiel & logo</h3>
        <p className="section-hint">
          Ces informations apparaissent en haut du PDF (bilingue FR/EN comme Royal Priesthood).
        </p>

        <div className="bulletin-settings-grid">
          <div className="form-group full">
            <label>Logo de l&apos;établissement</label>
            <div className="logo-upload-row">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="bulletin-logo-preview" />
              ) : (
                <div className="bulletin-logo-placeholder">Aucun logo</div>
              )}
              <label className="btn btn-secondary bulletin-file-btn">
                Choisir une image
                <input type="file" accept="image/*" hidden onChange={handleLogoChange} />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bulletin_motto">Devise / motto</label>
            <input
              id="bulletin_motto"
              name="bulletin_motto"
              value={form.bulletin_motto}
              onChange={handleChange}
              placeholder="Ex: a chosen generation"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bulletin_po_box">Boîte postale</label>
            <input
              id="bulletin_po_box"
              name="bulletin_po_box"
              value={form.bulletin_po_box}
              onChange={handleChange}
              placeholder="Ex: P.O BOX 1234 YAOUNDE"
            />
          </div>

          <div className="form-group full">
            <label htmlFor="bulletin_delegation_en">En-tête anglophone</label>
            <textarea
              id="bulletin_delegation_en"
              name="bulletin_delegation_en"
              rows={5}
              value={form.bulletin_delegation_en}
              onChange={handleChange}
            />
          </div>

          <div className="form-group full">
            <label htmlFor="bulletin_delegation_fr">En-tête francophone</label>
            <textarea
              id="bulletin_delegation_fr"
              name="bulletin_delegation_fr"
              rows={5}
              value={form.bulletin_delegation_fr}
              onChange={handleChange}
            />
          </div>

          <div className="form-group full">
            <label htmlFor="bulletin_next_term_note">Note de rentrée (pied de page)</label>
            <input
              id="bulletin_next_term_note"
              name="bulletin_next_term_note"
              value={form.bulletin_next_term_note}
              onChange={handleChange}
              placeholder="Ex: rentrée du troisième trimestre: 20 Avril 2026"
            />
          </div>

          <div className="form-group full">
            <label htmlFor="bulletin_template">Format / modèle PDF</label>
            <select
              id="bulletin_template"
              name="bulletin_template"
              value={form.bulletin_template}
              onChange={handleChange}
            >
              {settings?.available_templates &&
                Object.entries(settings.available_templates).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
            </select>
            <small className="field-hint">
              Choisissez le modèle officiel Cameroun (bilingue ou auto selon section) ou le format standard simplifié.
            </small>
          </div>

          <div className="form-group full">
            <label htmlFor="bulletin_scope">Portée des séquences sur le bulletin</label>
            <select
              id="bulletin_scope"
              name="bulletin_scope"
              value={form.bulletin_scope}
              onChange={handleChange}
            >
              {settings?.available_scopes &&
                Object.entries(settings.available_scopes).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
            </select>
            <small className="field-hint">
              « Par trimestre » : 2 séquences du trimestre affichées. « Annuel » : les 6 séquences de l&apos;année sur un seul bulletin.
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
          </button>
        </div>
      </form>

      <section className="bulletin-settings-card">
        <h3>Groupes & coefficients des matières</h3>
        <p className="section-hint">
          Groupe 1 = Premier groupe, 2 = Deuxième, 3 = Troisième (comme sur le bulletin officiel).
        </p>

        {matieres.length === 0 ? (
          <p className="text-muted">Créez d&apos;abord des matières dans l&apos;onglet Matières.</p>
        ) : (
          <div className="bulletin-matieres-table-wrap">
            <table className="bulletin-matieres-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Code</th>
                  <th>Groupe</th>
                  <th>Coefficient</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nom}</td>
                    <td>{m.code}</td>
                    <td>
                      <select
                        value={m.groupe ?? 1}
                        onChange={(e) => handleMatiereFieldChange(m.id, 'groupe', e.target.value)}
                      >
                        <option value={1}>1 — Premier</option>
                        <option value={2}>2 — Deuxième</option>
                        <option value={3}>3 — Troisième</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={m.coefficient_defaut ?? 1}
                        onChange={(e) => handleMatiereFieldChange(m.id, 'coefficient_defaut', e.target.value)}
                        className="coef-input"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSaveMatiere(m)}
                        disabled={savingMatiereId === m.id}
                      >
                        {savingMatiereId === m.id ? '…' : 'OK'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bulletin-settings-card bulletin-settings-info">
        <h3>Sections francophone / anglophone</h3>
        <p>
          Définissez la <strong>section</strong> de chaque classe dans l&apos;onglet <strong>Classes</strong>
          (francophone ou anglophone). Le bulletin PDF s&apos;adapte automatiquement.
        </p>
      </section>
    </div>
  );
}

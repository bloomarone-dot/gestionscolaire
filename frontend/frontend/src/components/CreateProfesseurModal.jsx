import { useState, useEffect, useMemo } from 'react';
import * as api from '../api/api';
import '../styles/modal-forms.css';

export default function CreateProfesseurModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    sexe: 'M',
    email: '',
    phone: '',
    specialite: '',
    password: '',
  });
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedMatieresByClass, setSelectedMatieresByClass] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.fetchClasses(), api.fetchMatieres()])
      .then(([cls, mats]) => {
        if (!cancelled) {
          setClasses(cls || []);
          setMatieres(mats || []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Impossible de charger les classes/matières');
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassToggle = (classId) => {
    setSelectedClasses((prev) => {
      const next = prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId];
      setSelectedMatieresByClass((state) => {
        const updated = { ...state };
        if (!next.includes(classId)) delete updated[classId];
        return updated;
      });
      return next;
    });
  };

  const handleMatiereToggle = (classId, matiereId) => {
    setSelectedMatieresByClass((prev) => {
      const current = prev[classId] || [];
      const next = current.includes(matiereId)
        ? current.filter((id) => id !== matiereId)
        : [...current, matiereId];
      return { ...prev, [classId]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nom?.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (!formData.phone?.trim()) {
      setError('Le téléphone est obligatoire.');
      return;
    }
    if (!formData.password?.trim()) {
      setError('Le mot de passe initial est obligatoire.');
      return;
    }

    try {
      setLoading(true);
      const created = await api.createProfesseur(formData);
      const attributionPromises = [];
      selectedClasses.forEach((classId) => {
        const matiereIds = selectedMatieresByClass[classId] || [];
        matiereIds.forEach((matiereId) => {
          attributionPromises.push(
            api.createAttribution({
              professeur_id: created.id,
              classe_id: classId,
              matiere_id: matiereId,
            }),
          );
        });
      });

      if (attributionPromises.length > 0) {
        await Promise.all(attributionPromises);
      }

      onCreated?.();
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const visibleClasses = useMemo(() => classes, [classes]);

  const canSubmit = !loading && formData.nom?.trim() && formData.phone?.trim() && formData.password?.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Créer un professeur</h2>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <h3>Identité</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" name="nom" value={formData.nom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Téléphone 1 *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Ex: 6XX XX XX XX" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Sexe *</label>
                <select name="sexe" value={formData.sexe} onChange={handleChange} required>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Spécialité</label>
                <input type="text" name="specialite" value={formData.specialite} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Compte</h3>
            <div className="form-group">
              <label>Mot de passe initial *</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-section">
            <h3>Attribution classes / matières</h3>
            {visibleClasses.length === 0 ? (
              <div className="form-error">Aucune classe disponible. Créez d&apos;abord une classe.</div>
            ) : (
              <div className="attribution-grid">
                {visibleClasses.map((classe) => {
                  const classChecked = selectedClasses.includes(classe.id);
                  const classMatieres = selectedMatieresByClass[classe.id] || [];
                  return (
                    <div className={`attribution-card ${classChecked ? 'selected' : ''}`} key={classe.id}>
                      <label className="attribution-title">
                        <input
                          type="checkbox"
                          checked={classChecked}
                          onChange={() => handleClassToggle(classe.id)}
                        />
                        <span>{classe.nom} — {classe.section === 'anglophone' ? 'Anglophone' : 'Francophone'}</span>
                      </label>
                      {classChecked && (
                        <div className="matiere-chips">
                          {matieres
                            .filter((matiere) => matiere.classe_id === classe.id)
                            .map((matiere) => {
                            const checked = classMatieres.includes(matiere.id);
                            return (
                              <label key={matiere.id} className={`chip ${checked ? 'checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleMatiereToggle(classe.id, matiere.id)}
                                />
                                <span>{matiere.nom}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {loading ? 'Enregistrement...' : 'Créer le professeur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

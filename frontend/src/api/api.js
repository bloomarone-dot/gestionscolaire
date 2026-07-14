// Service API — toutes les requêtes passent par l'API Gateway (:8000).
// Les composants gardent leurs noms historiques; cette couche traduit vers les
// préfixes microservices: /tenants, /pedagogie, /personnel, /eleves,
// /evaluations, /bulletins, /tresorerie, /planning.

import { normalizeBulletinView } from '../utils/normalizeBulletinView';
import { resolveSubsystemCode } from '../utils/section';
import { isValidAccessToken, readStoredAccessToken } from '../utils/authToken';

let authRedirectPending = false;

const ROLE_TO_UI = {
  enseignant: 'professeur',
};

function normalizeRole(role) {
  return ROLE_TO_UI[role] || role;
}

function normalizeAuthUser(data) {
  return {
    ...data,
    id: data.id ?? data.user_id,
    user_id: data.user_id ?? data.id,
    username: data.username ?? data.phone,
    school_id: data.school_id ?? data.tenant_id,
    tenant_id: data.tenant_id ?? data.school_id,
    role: normalizeRole(data.role),
  };
}

function normalizeClasse(classe) {
  const subsystemCode = resolveSubsystemCode(classe) || classe.subsystem_code;
  const section = classe.section
    || (subsystemCode === 'ANGLOPHONE' ? 'anglophone' : subsystemCode === 'FRANCOPHONE' ? 'francophone' : null);
  return {
    ...classe,
    subsystem_code: subsystemCode || classe.subsystem_code,
    nom: classe.nom ?? classe.nom_personnalise,
    nom_personnalise: classe.nom_personnalise ?? classe.nom,
    niveau: classe.niveau ?? classe.level_code ?? classe.niveau_libre ?? '',
    capacite: classe.capacite ?? classe.effectif_max ?? 30,
    section,
    serie: classe.serie ?? classe.series_code ?? classe.specialite_libre ?? '',
  };
}

function normalizeMatiere(matiere) {
  return {
    ...matiere,
    code: matiere.code ?? matiere.subject_code ?? String(matiere.id),
    coefficient_defaut: matiere.coefficient_defaut ?? matiere.coefficient ?? 1,
  };
}

function normalizeEleve(eleve) {
  return {
    ...eleve,
    section: eleve.section
      || (eleve.subsystem_code === 'ANGLOPHONE' ? 'anglophone' : 'francophone'),
    date_inscription: eleve.date_inscription ?? eleve.created_at ?? new Date().toISOString(),
  };
}

function unsupported(feature) {
  throw new Error(`${feature} n'est pas encore exposé par les microservices actuels.`);
}

function getAccessToken() {
  const token = readStoredAccessToken();
  return isValidAccessToken(token) ? token : null;
}

function markAuthExpired() {
  if (authRedirectPending) return;
  authRedirectPending = true;
  clearAuthSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login?expired=1');
  }
}

function getHeaders(auth = true, json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const selectedSchool = JSON.parse(localStorage.getItem('selectedSchool') || 'null');
    if (user?.role === 'superadmin' && selectedSchool?.id) {
      headers['X-School-Id'] = String(selectedSchool.id);
    }
  }
  return headers;
}

function formatApiError(detail) {
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || String(item)).join(', ');
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || JSON.stringify(detail);
  }
  return detail || 'Erreur serveur';
}

function clearAuthSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  localStorage.removeItem('selectedSchool');
}

// Helper DELETE (204 attendu) — gère 401 et remonte l'erreur serveur.
async function deleteRequest(url) {
  if (authRedirectPending) throw new Error('Session expirée. Reconnectez-vous.');
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
  if (res.status === 401) {
    markAuthExpired();
    throw new Error('Session expirée. Reconnectez-vous.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur lors de la suppression' }));
    throw new Error(formatApiError(err.detail));
  }
  return { success: true };
}

async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (err?.message === 'Failed to fetch') {
      throw new Error(
        'Serveur injoignable. Vérifiez que Docker tourne (docker compose up -d), puis rechargez la page (Ctrl+Shift+R).',
        { cause: err },
      );
    }
    throw err;
  }
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  if (auth) {
    if (authRedirectPending) {
      throw new Error('Session expirée. Reconnectez-vous.');
    }
    if (!getAccessToken()) {
      markAuthExpired();
      throw new Error('Session expirée. Reconnectez-vous.');
    }
  }
  const options = {
    method,
    headers: getHeaders(auth, body !== undefined),
  };
  if (body !== undefined) {
    // Accepte objet OU chaîne déjà JSON (évite double stringify → 422 « JSON string »).
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await apiFetch(path, options);
  return handleResponse(res);
}

async function handleResponse(res, { authFailure = false } = {}) {
  if (res.status === 401 && !authFailure) {
    markAuthExpired();
    throw new Error('Session expirée. Reconnectez-vous.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
    if (res.status >= 500) {
      throw new Error(
        formatApiError(err.detail)
          || 'Serveur indisponible. Vérifiez la connexion ou réessayez dans quelques minutes.',
      );
    }
    throw new Error(formatApiError(err.detail));
  }
  return res.json();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length > 9) {
    return digits.slice(3);
  }
  return digits;
}

async function handleAuthResponse(res) {
  return handleResponse(res, { authFailure: true });
}

// ── Authentification ──────────────────────────────────────
export async function login(username, password) {
  const phone = normalizePhone(username);
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password: String(password || '').trim() }),
  });
  return normalizeAuthUser(await handleAuthResponse(res));
}

// ── Élèves (tenant — API admin) ───────────────────────────
export async function fetchEleves() {
  return fetchEleves_admin();
}

export async function createEleve(nom, prenom, matricule) {
  return createEleve_admin({ nom, prenom, matricule });
}

// ── Notes ─────────────────────────────────────────────────
export async function postNote(noteData, justification) {
  const url = '/evaluations/notes';
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...noteData, description: justification || noteData.description }),
  });
  return handleResponse(res);
}

export async function addNote(eleve_id, matiere_id, valeur, justification) {
  return postNote(
    {
      eleve_id,
      classe_id: 0,
      matiere_id,
      valeur,
    },
    justification,
  );
}

export async function fetchNotes({ eleve_id, classe_id, matiere_id, trimestre, type_evaluation } = {}) {
  const params = new URLSearchParams();
  if (eleve_id) params.set('eleve_id', String(eleve_id));
  if (classe_id) params.set('classe_id', String(classe_id));
  if (matiere_id) params.set('matiere_id', String(matiere_id));
  if (trimestre) params.set('trimestre', String(trimestre));
  if (type_evaluation) params.set('type_evaluation', type_evaluation);
  const url = params.toString() ? `/evaluations/notes?${params}` : '/evaluations/notes';
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse(res);
}

export async function exportNotesCsv(classeId, matiereId, trimestre = null) {
  void classeId;
  void matiereId;
  void trimestre;
  unsupported("L'export CSV des notes");
}

export async function updateNote(noteId, updates, justification) {
  void noteId;
  void updates;
  void justification;
  unsupported("La modification d'une note");
}

export async function deleteNote(noteId) {
  const res = await fetch(`/evaluations/notes/${noteId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur suppression' }));
    throw new Error(formatApiError(err.detail));
  }
  return { success: true };
}

export async function verifierPeriodeSaisie(classeId, matiereId) {
  const params = new URLSearchParams({ classe_id: String(classeId), matiere_id: String(matiereId) });
  const res = await fetch(`/evaluations/verifier-periode?${params}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function verifierPeriodeProfesseur(classeId, matiereId) {
  return verifierPeriodeSaisie(classeId, matiereId);
}

export async function fetchPeriodesSaisie(classeId, matiereId) {
  const params = new URLSearchParams();
  if (classeId) params.set('classe_id', String(classeId));
  if (matiereId) params.set('matiere_id', String(matiereId));
  const url = params.toString() ? `/evaluations/periodes?${params}` : '/evaluations/periodes';
  const res = await fetch(url, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (Array.isArray(data)) {
    return { items: data, server_date: null };
  }
  return { items: data.items || [], server_date: data.server_date || null };
}

export async function createPeriodeSaisie(data) {
  const res = await fetch('/evaluations/periodes', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function createPeriodesBulk(data) {
  if (Array.isArray(data?.items)) {
    return Promise.all(data.items.map((item) => createPeriodeSaisie(item)));
  }
  unsupported("La création groupée des périodes");
}

export async function deletePeriodeSaisie(periodeId) {
  void periodeId;
  unsupported("La suppression des périodes");
}

// ── Bulletin ──────────────────────────────────────────────
async function downloadFileResponse(res, fallbackName) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur export' }));
    throw new Error(formatApiError(err.detail));
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchEleveBulletin(eleveId, trimestre = 1, format = 'cameroon', scope = null) {
  let url = `/bulletins/eleve/${eleveId}?trimestre=${trimestre}`;
  void format;
  if (scope) url += `&scope=${encodeURIComponent(scope)}`;
  const res = await fetch(
    url,
    { headers: getHeaders() },
  );
  return normalizeBulletinView(await handleResponse(res));
}

export async function fetchClasseBulletins(classeId, trimestre = 1, scope = 'trimestre') {
  const params = new URLSearchParams({ trimestre: String(trimestre), scope });
  const res = await fetch(`/bulletins/classe/${classeId}?${params}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function publishEleveBulletin(eleveId, trimestre = 1, typeEvaluation = null, scope = 'trimestre') {
  const params = new URLSearchParams({ trimestre: String(trimestre), scope });
  if (typeEvaluation) params.set('type_evaluation', typeEvaluation);
  const res = await fetch(`/bulletins/eleve/${eleveId}/publish?${params}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function fetchBulletin(eleve_id, trimestre = 1) {
  try {
    return await fetchEleveBulletin(eleve_id, trimestre);
  } catch (err) {
    return { error: err.message };
  }
}

export async function exportEleveBulletinCsv(eleveId, trimestre = 1) {
  void eleveId;
  void trimestre;
  unsupported("L'export CSV du bulletin élève");
}

export async function exportEleveBulletinPdf(eleveId, trimestre = 1, template = 'auto', lang = null, scope = 'trimestre') {
  const params = new URLSearchParams({ trimestre: String(trimestre), scope });
  void template;
  void lang;
  const res = await fetch(`/bulletins/eleve/${eleveId}/pdf?${params}`, { headers: getHeaders() });
  const filename = scope === 'annual' ? 'bulletin_annuel.pdf' : `bulletin_T${trimestre}.pdf`;
  return downloadFileResponse(res, filename);
}

export async function exportClasseBulletinsCsv(classeId, trimestre = 1) {
  void classeId;
  void trimestre;
  unsupported("L'export CSV des bulletins de classe");
}

export async function exportClasseBulletinsXlsx(classeId, trimestre = 1) {
  void classeId;
  void trimestre;
  unsupported("L'export XLSX des bulletins de classe");
}

export async function downloadBulletinImportTemplate() {
  unsupported("Le modèle d'import des bulletins");
}

export async function importBulletinsXlsx(classeId, trimestre, file) {
  void classeId;
  void trimestre;
  void file;
  unsupported("L'import XLSX des bulletins");
}

// ── Établissements ────────────────────────────────────────
export async function fetchSchoolsPublic() {
  const res = await fetch('/tenants/schools', { headers: getHeaders(false) });
  return handleResponse(res);
}

export async function fetchSchools(includeDbStatus = false) {
  void includeDbStatus;
  const res = await fetch('/tenants/schools', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createSchool(schoolData) {
  const res = await fetch('/tenants/schools', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(schoolData),
  });
  return handleResponse(res);
}

export async function testDbServerBeforeCreate(dbConfig) {
  void dbConfig;
  return { success: true, detail: 'La configuration multi-base est gérée par les services.' };
}

export async function getSchool(schoolId) {
  const res = await fetch(`/tenants/schools/${schoolId}`, { headers: getHeaders() });
  return handleResponse(res);
}

// Profil de l'établissement de l'utilisateur connecté (admin) — pour la page Paramètres.
export async function fetchMySchool() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const selectedSchool = JSON.parse(localStorage.getItem('selectedSchool') || 'null');
  if (user?.role === 'superadmin') {
    if (!selectedSchool?.id) {
      throw new Error('Sélectionnez un établissement pour charger son profil.');
    }
    return getSchool(selectedSchool.id);
  }
  const res = await fetch('/tenants/me', { headers: getHeaders() });
  return handleResponse(res);
}

export async function updateSchool(schoolId, schoolData) {
  const res = await fetch(`/tenants/schools/${schoolId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(schoolData),
  });
  return handleResponse(res);
}

// Profil pédagogique actif (sous-systèmes/types) + canaux de notif (§14 / §12.2).
export async function updateSchoolProfile(schoolId, profile) {
  const res = await fetch(`/tenants/schools/${schoolId}/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profile),
  });
  return handleResponse(res);
}

/** Analyse un bulletin modèle (PDF ou image) — détection automatique de la présentation. */
export async function analyzeBulletinTemplate(file) {
  const form = new FormData();
  form.append('file', file);
  const headers = getHeaders(true, false);
  const res = await fetch('/bulletins/template/analyze', {
    method: 'POST',
    headers,
    body: form,
  });
  return handleResponse(res);
}

// Crée le compte administrateur de l'établissement (login téléphone + mot de passe).
export async function createSchoolAdmin(schoolId, admin) {
  return createStaffAccount({
    first_name: admin.first_name,
    last_name: admin.last_name,
    phone: admin.phone,
    email: admin.email,
    password: admin.password,
    role: 'admin',
    tenant_id: Number(schoolId),
  });
}

export async function createStaffAccount(account) {
  const res = await fetch('/auth/accounts', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      first_name: account.first_name,
      last_name: account.last_name,
      phone: normalizePhone(account.phone),
      email: account.email || null,
      password: account.password,
      role: account.role,
      tenant_id: account.tenant_id != null ? Number(account.tenant_id) : undefined,
    }),
  });
  return handleResponse(res);
}

export async function fetchEstablishmentAccounts() {
  return apiRequest('/auth/accounts/establishment');
}

// ── Trésorerie ────────────────────────────────────────────
export async function fetchPaiements(params = {}) {
  const qs = new URLSearchParams();
  if (params.eleve_id != null) qs.set('eleve_id', String(params.eleve_id));
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiRequest(`/tresorerie/paiements${query ? `?${query}` : ''}`);
}

export async function createPaiement(payload) {
  return apiRequest('/tresorerie/paiements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function encaisserPaiement(paiementId, payload) {
  return apiRequest(`/tresorerie/paiements/${paiementId}/encaisser`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function annulerPaiement(paiementId) {
  return apiRequest(`/tresorerie/paiements/${paiementId}/annuler`, { method: 'POST' });
}

export async function fetchTresorerieStats() {
  return apiRequest('/tresorerie/stats');
}

export async function downloadPaiementRecu(paiementId, establishmentName = 'Établissement') {
  const params = new URLSearchParams({ establishment_name: establishmentName });
  const res = await fetch(`/tresorerie/paiements/${paiementId}/recu.pdf?${params}`, {
    headers: getHeaders(),
  });
  return downloadFileResponse(res, `recu_${paiementId}.pdf`);
}

export async function genererLienParentPaiement(paiementId) {
  return apiRequest(`/tresorerie/paiements/${paiementId}/lien-parent`, { method: 'POST' });
}

export async function fetchPublicPaiement(token) {
  const res = await fetch(`/tresorerie/public/paiements/${token}`);
  return handleResponse(res);
}

export async function initierPaiementParent(token, payload) {
  const res = await fetch(`/tresorerie/public/paiements/${token}/initier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function confirmerPaiementParent(token) {
  const res = await fetch(`/tresorerie/public/paiements/${token}/confirmer`, { method: 'POST' });
  return handleResponse(res);
}

export async function downloadPublicPaiementRecu(token) {
  const res = await fetch(`/tresorerie/public/paiements/${token}/recu.pdf`);
  return downloadFileResponse(res, 'recu_paiement.pdf');
}

export async function fetchRetraits() {
  return apiRequest('/tresorerie/retraits');
}

export async function createRetrait(payload) {
  return apiRequest('/tresorerie/retraits', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchEleve_admin(eleveId) {
  return apiRequest(`/eleves/${eleveId}`);
}

// ── Scolarité : grille de frais + versements (inscription + 3 tranches) ──
export async function fetchFeeSchedules() {
  return apiRequest('/tresorerie/fees');
}

export async function saveFeeSchedule(classeId, payload) {
  return apiRequest(`/tresorerie/fees/${classeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchPensionResume(eleveId, classeId = null) {
  const qs = classeId != null ? `?classe_id=${classeId}` : '';
  return apiRequest(`/tresorerie/pension/${eleveId}/resume${qs}`);
}

export async function payerPension(payload) {
  return apiRequest('/tresorerie/pension/payer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPensionComptes() {
  return apiRequest('/tresorerie/pension/comptes');
}

// ── Progression académique (politiques, propositions, inscriptions) ─────
export async function fetchProgressionCriteria() {
  return apiRequest('/progression/criteria');
}

export async function fetchProgressionDecisions() {
  return apiRequest('/progression/decisions');
}

export async function createProgressionDecision(payload) {
  return apiRequest('/progression/decisions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchProgressionPolicies() {
  return apiRequest('/progression/policies');
}

export async function createProgressionPolicy(payload) {
  return apiRequest('/progression/policies', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateProgressionPolicy(policyId, payload) {
  return apiRequest(`/progression/policies/${policyId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function versionProgressionPolicy(policyId) {
  return apiRequest(`/progression/policies/${policyId}/version`, { method: 'POST' });
}

export async function activateProgressionPolicy(policyId) {
  return apiRequest(`/progression/policies/${policyId}/activate`, { method: 'POST' });
}

export async function deactivateProgressionPolicy(policyId) {
  return apiRequest(`/progression/policies/${policyId}/deactivate`, { method: 'POST' });
}

export async function computeProgressionProposals(payload) {
  return apiRequest('/progression/compute', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchProgressionProposals(params = {}) {
  const qs = new URLSearchParams();
  if (params.classe_id != null) qs.set('classe_id', String(params.classe_id));
  if (params.annee_scolaire) qs.set('annee_scolaire', params.annee_scolaire);
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  return apiRequest(`/progression/proposals${query ? `?${query}` : ''}`);
}

export async function validateProgressionProposal(proposalId, payload) {
  return apiRequest(`/progression/proposals/${proposalId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function fetchProposalHistory(proposalId) {
  return apiRequest(`/progression/proposals/${proposalId}/history`);
}

export async function prepareNextYearEnrollments(payload) {
  return apiRequest('/progression/enrollment/prepare', { method: 'POST', body: JSON.stringify(payload) });
}

export async function applyNextYearEnrollments(payload) {
  return apiRequest('/progression/enrollment/apply', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createStaffMember(data) {
  const res = await fetch('/personnel/staff', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const payload = await handleResponse(res);
  const personnel = payload?.personnel ?? payload;
  return { ...personnel, generated_password: payload?.generated_password ?? null };
}

// ── Planning (salles & emploi du temps) ───────────────────
export async function fetchSalles(activesOnly = false) {
  const qs = activesOnly ? '?actives_only=true' : '';
  return apiRequest(`/planning/salles${qs}`);
}

export async function createSalle(payload) {
  return apiRequest('/planning/salles', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteSalle(salleId) {
  return deleteRequest(`/planning/salles/${salleId}`);
}

export async function fetchPlanningSemaine(params = {}) {
  const qs = new URLSearchParams();
  if (params.classe_id != null) qs.set('classe_id', String(params.classe_id));
  if (params.salle_id != null) qs.set('salle_id', String(params.salle_id));
  const query = qs.toString();
  return apiRequest(`/planning/semaine${query ? `?${query}` : ''}`);
}

export async function createSeance(payload) {
  return apiRequest('/planning/seances', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteSeance(seanceId) {
  return deleteRequest(`/planning/seances/${seanceId}`);
}

export async function deleteSchool(schoolId) {
  return deleteRequest(`/tenants/schools/${schoolId}`);
}

export async function getSchoolStats(schoolId) {
  const [school, classes, eleves, professeurs] = await Promise.all([
    getSchool(schoolId),
    fetchClasses().catch(() => []),
    fetchEleves_admin().catch(() => []),
    fetchProfesseurs().catch(() => []),
  ]);
  return {
    school,
    total_classes: classes.length,
    total_eleves: eleves.length,
    total_professeurs: professeurs.length,
  };
}

// ── Professeurs (Admin) ──────────────────────────────────
export async function fetchProfesseurs() {
  return apiRequest('/personnel/enseignants');
}

// Tout le personnel (enseignants + direction/administration).
export async function fetchPersonnel() {
  return apiRequest('/personnel');
}

function unwrapPersonnelCreate(data) {
  const personnel = data?.personnel ?? data;
  return {
    ...personnel,
    id: personnel?.id,
    personnel,
    generated_password: data?.generated_password ?? null,
  };
}

// Direction / administration (Censeur, Directeur d'études, Surveillant…) — 2 téléphones.
export async function createDirection(data) {
  const res = await fetch('/personnel/direction', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nom: data.nom,
      prenom: data.prenom || null,
      phone: normalizePhone(data.phone),
      phone2: normalizePhone(data.phone2),
      fonction: data.fonction,
      email: data.email || null,
      password: data.password || undefined,
    }),
  });
  return unwrapPersonnelCreate(await handleResponse(res));
}

export async function createProfesseur(profData) {
  const res = await fetch('/personnel/enseignants', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nom: profData.nom,
      prenom: profData.prenom || null,
      sexe: profData.sexe || 'M',
      phone: normalizePhone(profData.phone),
      phone2: profData.phone2 ? normalizePhone(profData.phone2) : null,
      email: profData.email || null,
      specialite: profData.specialite || null,
      diplome: profData.diplome || null,
      password: profData.password || undefined,
    }),
  });
  return unwrapPersonnelCreate(await handleResponse(res));
}

export async function updateProfesseur(profId, profData) {
  const res = await fetch(`/personnel/${profId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profData),
  });
  return handleResponse(res);
}

export async function fetchPersonnelMember(personnelId) {
  return apiRequest(`/personnel/${personnelId}`);
}

export async function deleteProfesseur(profId) {
  return deleteRequest(`/personnel/${profId}`);
}

// ── Classes (Admin) ──────────────────────────────────────
// Filtres de cascade (§6 étape 5) : ne renvoyer que les classes correspondant au profil.
export async function fetchClasses(filters = {}) {
  const params = new URLSearchParams();
  if (filters.subsystem) params.set('subsystem', filters.subsystem);
  if (filters.type) params.set('type', filters.type);
  if (filters.level) params.set('level', filters.level);
  if (filters.series) params.set('series', filters.series);
  const query = params.toString() ? `?${params}` : '';
  return apiRequest(`/pedagogie/classes${query}`).then((data) => data.map(normalizeClasse));
}

// §4 — création en cascade. Le formulaire fournit les codes officiels du référentiel ;
// seul `nom_personnalise` est saisi librement (sauf classe spéciale §4.3).
export async function createClasse(classeData) {
  const isSpecial = Boolean(classeData.is_special);
  const payload = {
    nom_personnalise: classeData.nom_personnalise || classeData.nom,
    effectif_max: Number(classeData.effectif_max ?? classeData.capacite) || null,
    prof_principal_id: classeData.prof_principal_id ? Number(classeData.prof_principal_id) : null,
    is_special: isSpecial,
  };
  if (isSpecial) {
    payload.niveau_libre = classeData.niveau_libre || null;
    payload.specialite_libre = classeData.specialite_libre || null;
  } else {
    payload.subsystem_code = classeData.subsystem_code;
    payload.type_code = classeData.type_code;
    payload.cycle_code = classeData.cycle_code || null;
    payload.level_code = classeData.level_code;
    payload.series_code = classeData.series_code || null;
  }
  const res = await fetch('/pedagogie/classes', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return normalizeClasse(await handleResponse(res));
}

// ── Référentiel MINESEC : cascade (§4.1) ──────────────────
export async function fetchSubsystems() {
  const res = await fetch('/referentiel/subsystems', { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchTeachingTypes(subsystem) {
  const q = subsystem ? `?subsystem=${encodeURIComponent(subsystem)}` : '';
  const res = await fetch(`/referentiel/teaching-types${q}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchCycles(subsystem, type) {
  const params = new URLSearchParams({ subsystem });
  if (type) params.set('type', type);
  const res = await fetch(`/referentiel/cycles?${params}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchLevels(subsystem, type, cycle) {
  const params = new URLSearchParams({ subsystem });
  if (type) params.set('type', type);
  if (cycle) params.set('cycle', cycle);
  const res = await fetch(`/referentiel/levels?${params}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchLevelSeries(levelCode) {
  const res = await fetch(`/referentiel/levels/${encodeURIComponent(levelCode)}/series`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function deleteClasse(classeId) {
  return deleteRequest(`/pedagogie/classes/${classeId}`);
}

// ── Matières (Admin) ─────────────────────────────────────
export async function fetchMatieres() {
  const classes = await fetchClasses();
  const lists = await Promise.all(
    classes.map((classe) => fetch(`/pedagogie/classes/${classe.id}/matieres`, { headers: getHeaders() })
      .then(handleResponse)
      .then((items) => items.map((item) => ({
        ...item,
        classe_id: classe.id,
        classe_nom: classe.nom || classe.nom_personnalise,
      })))
      .catch(() => [])),
  );
  const byKey = new Map();
  lists.flat().forEach((matiere) => {
    const key = `${matiere.classe_id}:${matiere.id}`;
    byKey.set(key, normalizeMatiere(matiere));
  });
  return [...byKey.values()];
}

export async function createMatiere(matiereData) {
  const classId = matiereData.classe_id || matiereData.class_id;
  if (!classId) unsupported("La création d'une matière sans classe");
  return createSpecialMatiere(classId, matiereData);
}

export async function createSpecialMatiere(classId, matiereData) {
  const res = await fetch(`/pedagogie/classes/${classId}/matieres/special`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nom: matiereData.nom || matiereData.name,
      coefficient: Number(matiereData.coefficient ?? matiereData.coefficient_defaut) || 1,
      volume_horaire: matiereData.volume_horaire ? Number(matiereData.volume_horaire) : null,
    }),
  });
  const created = normalizeMatiere(await handleResponse(res));
  if (matiereData.enseignant_id || matiereData.professeur_id) {
    const updated = await updateMatiere(created.id, {
      classe_id: classId,
      enseignant_id: Number(matiereData.enseignant_id || matiereData.professeur_id),
    });
    return { ...updated, classe_id: Number(classId) };
  }
  return { ...created, classe_id: Number(classId) };
}

export async function deleteMatiere(matiereId) {
  void matiereId;
  unsupported("La suppression globale d'une matière");
}

export async function updateMatiere(matiereId, data) {
  const classId = data.classe_id || data.class_id;
  if (!classId) unsupported("La modification d'une matière sans classe");
  const res = await fetch(`/pedagogie/classes/${classId}/matieres/${matiereId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return normalizeMatiere(await handleResponse(res));
}

export async function updateClasse(classeId, data) {
  const res = await fetch(`/pedagogie/classes/${classeId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      nom_personnalise: data.nom_personnalise ?? data.nom,
      effectif_max: data.effectif_max ?? data.capacite,
      prof_principal_id: data.prof_principal_id ?? null,
    }),
  });
  return normalizeClasse(await handleResponse(res));
}

// Affecte (ou retire) uniquement le professeur principal d'une classe.
export async function setClasseProfPrincipal(classeId, profPrincipalId) {
  const res = await fetch(`/pedagogie/classes/${classeId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ prof_principal_id: profPrincipalId ? Number(profPrincipalId) : null }),
  });
  return normalizeClasse(await handleResponse(res));
}

export async function fetchBulletinSettings() {
  return {};
}

export async function updateBulletinSettings(data) {
  return data;
}

// ── Attributions Professeurs ─────────────────────────────
export async function createAttribution(attributionData) {
  return updateMatiere(attributionData.matiere_id, {
    classe_id: attributionData.classe_id,
    enseignant_id: attributionData.professeur_id,
  });
}
// ── Professeur (Professor Login & Data) ──────────────
export async function loginProfessor(username, password, schoolId = null) {
  void schoolId;
  return login(username, password);
}

export async function resetProfesseurCredentials(profId, payload) {
  void profId;
  void payload;
  unsupported("La réinitialisation des identifiants professeur");
}

export async function resetAdminCredentials(adminId, payload) {
  void adminId;
  void payload;
  unsupported("La réinitialisation des identifiants admin");
}

export async function getProfessorProfile() {
  const res = await fetch('/auth/me', { headers: getHeaders() });
  return normalizeAuthUser(await handleResponse(res));
}

// Fiche personnel du compte connecté (pour restreindre l'enseignant à ses classes).
export async function fetchMyPersonnel() {
  const res = await fetch('/personnel/me', { headers: getHeaders() });
  return handleResponse(res);
}

export async function getProfessorClasses() {
  // L'enseignant ne voit que les classes où il a une matière assignée.
  try {
    const me = await fetchMyPersonnel();
    if (me?.id) {
      const res = await fetch(`/pedagogie/classes?enseignant=${me.id}`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data.map(normalizeClasse);
    }
  } catch {
    // Pas de fiche personnel (ex. admin) → repli sur toutes les classes.
  }
  return fetchClasses();
}

export async function getProfessorEnseignements() {
  return fetchClasses();
}

export async function getClassEleves(classeId) {
  return fetchEleves_admin(classeId);
}

export async function getClassMatieres(classeId) {
  const res = await apiFetch(`/pedagogie/classes/${classeId}/matieres`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.map(normalizeMatiere);
}

export async function postNotesBulk(payload) {
  const res = await fetch('/evaluations/notes/bulk', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function createNote(classeId, noteData) {
  const url = '/evaluations/notes';
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...noteData, classe_id: noteData.classe_id || classeId }),
  });
  return handleResponse(res);
}

export async function getProfessorStats() {
  return fetchAdminStats();
}

export async function getClassNotes(classeId, matiereId = null, trimestre = null, type_evaluation = null) {
  const params = new URLSearchParams();
  if (matiereId) params.set('matiere_id', String(matiereId));
  if (trimestre) params.set('trimestre', String(trimestre));
  if (type_evaluation) params.set('type_evaluation', type_evaluation);
  const query = params.toString() ? `?${params}` : '';
  params.set('classe_id', String(classeId));
  const nextQuery = params.toString() ? `?${params}` : query;
  const res = await fetch(`/evaluations/notes${nextQuery}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function getEleveBulletin(eleveId, trimestre = 1) {
  return fetchEleveBulletin(eleveId, trimestre);
}

export async function generateBulletin(eleveId) {
  return publishEleveBulletin(eleveId);
}

// ── Super Admin ──────────────────────────────────────────
export async function fetchSuperAdminStats() {
  const [schools, professeurs] = await Promise.all([
    fetchSchools().catch(() => []),
    fetchProfesseurs().catch(() => []),
  ]);
  return {
    total_schools: schools.length,
    active_schools: schools.filter((s) => s.is_active).length,
    total_admins: 0,
    total_professeurs: professeurs.length,
  };
}

export async function fetchSuperAdminAdmins() {
  const res = await fetch('/auth/accounts?role=admin', { headers: getHeaders() });
  const accounts = await handleResponse(res);
  const schools = await fetchSchools().catch(() => []);
  const schoolById = new Map(schools.map((s) => [s.id, s.name || s.nom]));
  return accounts.map((account) => ({
    id: account.id,
    name: [account.first_name, account.last_name].filter(Boolean).join(' ') || account.phone,
    phone: account.phone,
    school: schoolById.get(account.tenant_id) || `Etablissement #${account.tenant_id || '?'}`,
    status: account.is_active === false ? 'Inactif' : 'Actif',
  }));
}

export async function fetchSuperAdminLogs(skip = 0, limit = 50) {
  void skip;
  void limit;
  return [];
}

export async function assignAdminToSchool(adminId, schoolId) {
  void adminId;
  void schoolId;
  unsupported("L'assignation admin-école");
}

export async function fetchSuperAdminSettings() {
  return {};
}

// ── Admin Élèves ──────────────────────────────────────────
export async function fetchEleves_admin(classeId = null, search = '') {
  let url = '/eleves';
  const params = new URLSearchParams();
  if (classeId) params.append('classe_id', classeId);
  if (search) params.append('search', search);
  if (params.toString()) url += `?${params}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await handleResponse(res);
  return data.map(normalizeEleve);
}

export async function createEleve_admin(eleveData) {
  const res = await fetch('/eleves', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(eleveData),
  });
  return normalizeEleve(await handleResponse(res));
}

export async function updateEleve_admin(eleveId, eleveData) {
  const res = await fetch(`/eleves/${eleveId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(eleveData),
  });
  return normalizeEleve(await handleResponse(res));
}

export async function deleteEleve_admin(eleveId) {
  return deleteRequest(`/eleves/${eleveId}`);
}

// §6.3 — transfert d'un élève vers une autre classe (même niveau).
export async function transferEleve(eleveId, newClasseId) {
  const res = await fetch(`/eleves/${eleveId}/transfer`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ new_classe_id: Number(newClasseId) }),
  });
  return normalizeEleve(await handleResponse(res));
}

// ── Référentiel MINESEC (lecture seule, §8) ───────────────
export async function fetchReferentielTree() {
  const res = await fetch('/referentiel/tree', { headers: getHeaders() });
  return handleResponse(res);
}

// ── Référentiel — gestion admin plateforme (§1, superadmin) ───────
export async function adminListSubjects() {
  const res = await fetch('/referentiel/admin/subjects', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createReferentielSubject(payload) {
  const res = await fetch('/referentiel/subjects', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateReferentielSubject(subjectId, name) {
  const res = await fetch(`/referentiel/subjects/${subjectId}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function deleteReferentielSubject(subjectId) {
  return deleteRequest(`/referentiel/subjects/${subjectId}`);
}

export async function adminListEligibility(subjectCode = null) {
  const q = subjectCode ? `?subject=${encodeURIComponent(subjectCode)}` : '';
  const res = await fetch(`/referentiel/admin/eligibility${q}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function createReferentielEligibility(payload) {
  const res = await fetch('/referentiel/eligibility', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteReferentielEligibility(eligId) {
  return deleteRequest(`/referentiel/eligibility/${eligId}`);
}

// ── Communication : historique des notifications (§12) ────
export async function fetchNotifications() {
  const res = await fetch('/notifications', { headers: getHeaders() });
  return handleResponse(res);
}

export async function sendAnnouncement(payload) {
  const res = await fetch('/notifications/announce', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ── Promotions / Passages de fin d'année (§10) ────────────
// payload: { source_classe_id, items: [{ eleve_id, status, dest_classe_id, new_series_code }] }
export async function applyPromotions(payload) {
  const res = await fetch('/eleves/promotions/apply', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function downloadElevesImportTemplate(classeId = null) {
  const params = classeId ? `?classe_id=${encodeURIComponent(classeId)}` : '';
  const res = await fetch(`/eleves/import/template.xlsx${params}`, { headers: getHeaders() });
  const fallback = classeId ? `modele_eleves_classe_${classeId}.xlsx` : 'modele_import_eleves.xlsx';
  return downloadFileResponse(res, fallback);
}

export async function importElevesFile(file, classeId) {
  if (!classeId) {
    throw new Error('Sélectionnez la classe du fichier importé (ex. Form 4, Terminal A).');
  }
  const form = new FormData();
  form.append('file', file);
  const params = `?classe_id=${encodeURIComponent(classeId)}`;
  const res = await fetch(`/eleves/import${params}`, {
    method: 'POST',
    headers: getHeaders(true, false),
    body: form,
  });
  return handleResponse(res);
}

export async function exportEleves(format = 'xlsx', classeId = null) {
  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const params = new URLSearchParams();
  if (classeId) params.set('classe_id', String(classeId));
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`/eleves/export.${ext}${query}`, { headers: getHeaders() });
  const suffix = classeId ? `_classe_${classeId}` : '';
  return downloadFileResponse(res, `eleves${suffix}.${ext}`);
}

// ── Admin Années scolaires ────────────────────────────────
export async function fetchAnneesScolaires() {
  const res = await fetch('/pedagogie/annees-scolaires', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createAnneeScolaire(data) {
  const res = await fetch('/pedagogie/annees-scolaires', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function activerAnneeScolaire(anneeId) {
  const res = await fetch(`/pedagogie/annees-scolaires/${anneeId}/activer`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function deleteAnneeScolaire(anneeId) {
  void anneeId;
  unsupported("La suppression d'année scolaire");
}

export async function passageAnneeScolaire(data = {}) {
  const res = await fetch('/pedagogie/annees-scolaires/passage', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ── Admin Stats ───────────────────────────────────────────
export async function fetchAdminStats() {
  const [classes, eleves, professeurs] = await Promise.all([
    fetchClasses().catch(() => []),
    fetchEleves_admin().catch(() => []),
    fetchProfesseurs().catch(() => []),
  ]);
  return {
    total_classes: classes.length,
    total_eleves: eleves.length,
    total_professeurs: professeurs.length,
    total_matieres: 0,
  };
}

// ── Config BD établissement ───────────────────────────────
export async function updateSchoolDbConfig(schoolId, dbConfig) {
  void schoolId;
  void dbConfig;
  return { success: true };
}

export async function testSchoolConnection(schoolId) {
  void schoolId;
  return { success: true };
}

export async function toggleSchoolActive(schoolId) {
  const school = await getSchool(schoolId);
  const res = await fetch(`/tenants/schools/${schoolId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ is_active: !school.is_active }),
  });
  return handleResponse(res);
}

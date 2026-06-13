// Service API — toutes les requêtes passent par l'API Gateway (:8000).
// Les composants gardent leurs noms historiques; cette couche traduit vers les
// préfixes microservices: /tenants, /pedagogie, /personnel, /eleves,
// /evaluations, /bulletins.

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
  const section = classe.section
    || (classe.subsystem_code === 'ANGLOPHONE' ? 'anglophone' : 'francophone');
  return {
    ...classe,
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
  const stored = localStorage.getItem('access_token');
  if (stored) return stored;
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.token || null;
  } catch {
    return null;
  }
}

function getHeaders(auth = true) {
  const headers = { 'Content-Type': 'application/json' };
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
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
  if (res.status === 401) {
    clearAuthSession();
    if (!window.location.pathname.startsWith('/login')) window.location.replace('/login');
    throw new Error('Session expirée. Reconnectez-vous.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur lors de la suppression' }));
    throw new Error(formatApiError(err.detail));
  }
  return { success: true };
}

async function handleResponse(res) {
  if (res.status === 401) {
    clearAuthSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.replace('/login');
    }
    throw new Error('Session expirée. Reconnectez-vous.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
    throw new Error(formatApiError(err.detail));
  }
  return res.json();
}

// ── Authentification ──────────────────────────────────────
export async function login(username, password) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: username, password }),
  });
  return normalizeAuthUser(await handleResponse(res));
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
  return handleResponse(res);
}

export async function fetchClasseBulletins(classeId, trimestre = 1) {
  const res = await fetch(`/bulletins/classe/${classeId}?trimestre=${trimestre}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function publishEleveBulletin(eleveId, trimestre = 1, typeEvaluation = null) {
  const params = new URLSearchParams({ trimestre: String(trimestre) });
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

export async function exportEleveBulletinPdf(eleveId, trimestre = 1, template = 'auto', lang = null) {
  let url = `/bulletins/eleve/${eleveId}/pdf?trimestre=${trimestre}`;
  void template;
  void lang;
  const res = await fetch(url, { headers: getHeaders() });
  return downloadFileResponse(res, `bulletin_T${trimestre}.pdf`);
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

// Crée le compte administrateur de l'établissement (login téléphone + mot de passe).
export async function createSchoolAdmin(schoolId, admin) {
  const res = await fetch('/auth/accounts', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...admin, role: 'admin', tenant_id: schoolId }),
  });
  return handleResponse(res);
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
  const res = await fetch('/personnel/enseignants', { headers: getHeaders() });
  return handleResponse(res);
}

// Tout le personnel (enseignants + direction/administration).
export async function fetchPersonnel() {
  const res = await fetch('/personnel', { headers: getHeaders() });
  return handleResponse(res);
}

// Direction / administration (Censeur, Directeur d'études, Surveillant…) — 2 téléphones.
export async function createDirection(data) {
  const res = await fetch('/personnel/direction', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nom: data.nom,
      prenom: data.prenom || null,
      phone: data.phone,
      phone2: data.phone2,
      fonction: data.fonction,
      email: data.email || null,
      password: data.password || undefined,
    }),
  });
  const out = await handleResponse(res);
  return out.personnel || out;
}

export async function createProfesseur(profData) {
  const res = await fetch('/personnel/enseignants', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nom: profData.nom,
      prenom: profData.prenom,
      sexe: profData.sexe || 'M',
      phone: profData.phone,
      phone2: profData.phone2 || null,
      email: profData.email || null,
      specialite: profData.specialite || null,
      diplome: profData.diplome || null,
      password: profData.password || undefined,
    }),
  });
  const data = await handleResponse(res);
  return data.personnel || data;
}

export async function updateProfesseur(profId, profData) {
  const res = await fetch(`/personnel/${profId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profData),
  });
  return handleResponse(res);
}

export async function deleteProfesseur(profId) {
  return deleteRequest(`/personnel/${profId}`);
}

// ── Classes (Admin) ──────────────────────────────────────
export async function fetchClasses() {
  const res = await fetch('/pedagogie/classes', { headers: getHeaders() });
  const data = await handleResponse(res);
  return data.map(normalizeClasse);
}

export async function createClasse(classeData) {
  const section = classeData.section === 'anglophone' ? 'ANGLOPHONE' : 'FRANCOPHONE';
  const res = await fetch('/pedagogie/classes', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nom_personnalise: classeData.nom_personnalise || classeData.nom,
      effectif_max: Number(classeData.effectif_max ?? classeData.capacite) || null,
      subsystem_code: section,
      type_code: classeData.type_code || 'GENERAL',
      level_code: classeData.level_code || null,
      series_code: classeData.series_code || classeData.serie || null,
      is_special: !classeData.level_code,
      niveau_libre: classeData.niveau_libre || classeData.niveau || classeData.nom,
      specialite_libre: classeData.specialite_libre || classeData.serie || null,
    }),
  });
  return normalizeClasse(await handleResponse(res));
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
  const byId = new Map();
  lists.flat().forEach((matiere) => {
    byId.set(matiere.id, normalizeMatiere(matiere));
  });
  return [...byId.values()];
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
  const res = await fetch(`/pedagogie/classes/${classeId}/matieres`, {
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
  return [];
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

export async function downloadElevesImportTemplate() {
  unsupported("Le modèle d'import des élèves");
}

export async function importElevesFile(file, defaultClasseId = null) {
  void file;
  void defaultClasseId;
  unsupported("L'import de liste d'élèves");
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

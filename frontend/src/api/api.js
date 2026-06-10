// Service API — toutes les requêtes vers le backend FastAPI (proxy Vite → :8000)

function getHeaders(auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('access_token');
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

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
    throw new Error(formatApiError(err.detail));
  }
  return res.json();
}

async function deleteResource(url) {
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur suppression' }));
    throw new Error(formatApiError(err.detail));
  }
  return { success: true };
}

// ── Authentification ──────────────────────────────────────
export async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  return handleResponse(res);
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
  let url = '/notes/';
  if (justification) {
    url += `?justification=${encodeURIComponent(justification)}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(noteData),
  });
  return handleResponse(res);
}

export async function addNote(eleve_id, matiere_id, valeur, justification) {
  return postNote(
    {
      eleve_id,
      matiere_id,
      valeur,
      coefficient: 1.0,
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
  const url = params.toString() ? `/notes/?${params}` : '/notes/';
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse(res);
}

export async function exportNotesCsv(classeId, matiereId, trimestre = null) {
  const params = new URLSearchParams({
    classe_id: String(classeId),
    matiere_id: String(matiereId),
  });
  if (trimestre) params.set('trimestre', String(trimestre));
  const res = await fetch(`/notes/export/csv?${params}`, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur export' }));
    throw new Error(formatApiError(err.detail));
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `notes_export.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function updateNote(noteId, updates, justification) {
  let url = `/notes/${noteId}`;
  if (justification) {
    url += `?justification=${encodeURIComponent(justification)}`;
  }
  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteNote(noteId) {
  const res = await fetch(`/notes/${noteId}`, {
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
  const res = await fetch(`/notes/verifier-periode?${params}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function verifierPeriodeProfesseur(classeId, matiereId) {
  const params = new URLSearchParams({ classe_id: String(classeId), matiere_id: String(matiereId) });
  const res = await fetch(`/professor/verifier-periode?${params}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchPeriodesSaisie(classeId, matiereId) {
  const params = new URLSearchParams();
  if (classeId) params.set('classe_id', String(classeId));
  if (matiereId) params.set('matiere_id', String(matiereId));
  const url = params.toString() ? `/notes/periode-saisie?${params}` : '/notes/periode-saisie';
  const res = await fetch(url, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (Array.isArray(data)) {
    return { items: data, server_date: null };
  }
  return { items: data.items || [], server_date: data.server_date || null };
}

export async function createPeriodeSaisie(data) {
  const res = await fetch('/notes/periode-saisie', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function createPeriodesBulk(data) {
  const res = await fetch('/notes/periode-saisie/bulk', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deletePeriodeSaisie(periodeId) {
  const res = await fetch(`/notes/periode-saisie/${periodeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return { success: true };
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
  let url = `/bulletins/eleve/${eleveId}?trimestre=${trimestre}&format=${format}`;
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

export async function fetchBulletin(eleve_id, trimestre = 1) {
  try {
    return await fetchEleveBulletin(eleve_id, trimestre);
  } catch (err) {
    return { error: err.message };
  }
}

export async function exportEleveBulletinCsv(eleveId, trimestre = 1) {
  const res = await fetch(`/bulletins/eleve/${eleveId}/export/csv?trimestre=${trimestre}`, {
    headers: getHeaders(),
  });
  return downloadFileResponse(res, `bulletin_T${trimestre}.csv`);
}

export async function exportEleveBulletinPdf(eleveId, trimestre = 1, template = 'auto', lang = null) {
  let url = `/bulletins/eleve/${eleveId}/export/pdf?trimestre=${trimestre}&template=${template}`;
  if (lang) url += `&lang=${lang}`;
  const res = await fetch(url, { headers: getHeaders() });
  return downloadFileResponse(res, `bulletin_T${trimestre}.pdf`);
}

export async function exportClasseBulletinsCsv(classeId, trimestre = 1) {
  const res = await fetch(`/bulletins/classe/${classeId}/export/csv?trimestre=${trimestre}`, {
    headers: getHeaders(),
  });
  return downloadFileResponse(res, `bulletins_T${trimestre}.csv`);
}

export async function exportClasseBulletinsXlsx(classeId, trimestre = 1) {
  const res = await fetch(`/bulletins/classe/${classeId}/export/xlsx?trimestre=${trimestre}`, {
    headers: getHeaders(),
  });
  return downloadFileResponse(res, `bulletins_T${trimestre}.xlsx`);
}

export async function downloadBulletinImportTemplate() {
  const res = await fetch('/bulletins/import/template.xlsx', {
    headers: getHeaders(),
  });
  return downloadFileResponse(res, 'modele_import_bulletins.xlsx');
}

export async function importBulletinsXlsx(classeId, trimestre, file) {
  const formData = new FormData();
  formData.append('file', file);
  const headers = {};
  const token = localStorage.getItem('access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const selectedSchool = JSON.parse(localStorage.getItem('selectedSchool') || 'null');
  if (user?.role === 'superadmin' && selectedSchool?.id) {
    headers['X-School-Id'] = String(selectedSchool.id);
  }
  const res = await fetch(
    `/bulletins/import/xlsx?classe_id=${classeId}&trimestre=${trimestre}`,
    { method: 'POST', headers, body: formData },
  );
  return handleResponse(res);
}

// ── Établissements ────────────────────────────────────────
export async function fetchSchoolsPublic() {
  const res = await fetch('/schools/public', { headers: getHeaders(false) });
  return handleResponse(res);
}

export async function fetchSchools(includeDbStatus = false) {
  const query = includeDbStatus ? '?include_db_status=true' : '';
  const res = await fetch(`/schools/${query}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function createSchool(schoolData) {
  const res = await fetch('/schools/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(schoolData),
  });
  return handleResponse(res);
}

export async function testDbServerBeforeCreate(dbConfig) {
  const res = await fetch('/schools/test-db-server', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dbConfig),
  });
  return handleResponse(res);
}

export async function getSchool(schoolId) {
  const res = await fetch(`/schools/${schoolId}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function updateSchool(schoolId, schoolData) {
  const res = await fetch(`/schools/${schoolId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(schoolData),
  });
  return handleResponse(res);
}

export async function deleteSchool(schoolId) {
  const res = await fetch(`/schools/${schoolId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }));
    throw new Error(err.detail || 'Erreur serveur');
  }
  return { success: true };
}

export async function getSchoolStats(schoolId) {
  const res = await fetch(`/schools/${schoolId}/stats`, { headers: getHeaders() });
  return handleResponse(res);
}

// ── Professeurs (Admin) ──────────────────────────────────
export async function fetchProfesseurs() {
  const res = await fetch('/admin/professeurs/', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createProfesseur(profData) {
  const res = await fetch('/admin/professeurs/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(profData),
  });
  return handleResponse(res);
}

export async function deleteProfesseur(profId) {
  return deleteResource(`/admin/professeurs/${profId}`);
}

// ── Classes (Admin) ──────────────────────────────────────
export async function fetchClasses() {
  const res = await fetch('/admin/classes/', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createClasse(classeData) {
  const res = await fetch('/admin/classes/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(classeData),
  });
  return handleResponse(res);
}

export async function deleteClasse(classeId) {
  return deleteResource(`/admin/classes/${classeId}`);
}

// ── Matières (Admin) ─────────────────────────────────────
export async function fetchMatieres() {
  const res = await fetch('/admin/matieres/', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createMatiere(matiereData) {
  const res = await fetch('/admin/matieres/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(matiereData),
  });
  return handleResponse(res);
}

export async function deleteMatiere(matiereId) {
  return deleteResource(`/admin/matieres/${matiereId}`);
}

export async function updateMatiere(matiereId, data) {
  const res = await fetch(`/admin/matieres/${matiereId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateClasse(classeId, data) {
  const res = await fetch(`/admin/classes/${classeId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchBulletinSettings() {
  const res = await fetch('/admin/bulletin-settings', { headers: getHeaders() });
  return handleResponse(res);
}

export async function updateBulletinSettings(data) {
  const res = await fetch('/admin/bulletin-settings', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ── Attributions Professeurs ─────────────────────────────
export async function createAttribution(attributionData) {
  const res = await fetch('/admin/attributions-professeurs/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(attributionData),
  });
  return handleResponse(res);
}
// ── Professeur (Professor Login & Data) ──────────────
export async function loginProfessor(username, password, schoolId) {
  const res = await fetch('/auth/login-professor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      school_id: schoolId
    })
  });
  return handleResponse(res);
}

export async function getProfessorProfile() {
  const res = await fetch('/professor/me', { headers: getHeaders() });
  return handleResponse(res);
}

export async function getProfessorClasses() {
  const res = await fetch('/professor/classes', { headers: getHeaders() });
  return handleResponse(res);
}

export async function getProfessorEnseignements() {
  const res = await fetch('/professor/enseignements', { headers: getHeaders() });
  return handleResponse(res);
}

export async function getClassEleves(classeId) {
  const res = await fetch(`/professor/classes/${classeId}/eleves`, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function getClassMatieres(classeId) {
  const res = await fetch(`/professor/classes/${classeId}/matieres`, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function createNote(classeId, noteData) {
  const url = `/professor/classes/${classeId}/notes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(noteData),
  });
  return handleResponse(res);
}

export async function getProfessorStats() {
  const res = await fetch('/professor/stats', { headers: getHeaders() });
  return handleResponse(res);
}

export async function getClassNotes(classeId, matiereId = null, trimestre = null, type_evaluation = null) {
  const params = new URLSearchParams();
  if (matiereId) params.set('matiere_id', String(matiereId));
  if (trimestre) params.set('trimestre', String(trimestre));
  if (type_evaluation) params.set('type_evaluation', type_evaluation);
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`/professor/classes/${classeId}/notes${query}`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function getEleveBulletin(eleveId, trimestre = 1) {
  return fetchEleveBulletin(eleveId, trimestre);
}

export async function generateBulletin(eleveId) {
  const res = await fetch(`/professor/bulletins/${eleveId}/generate`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

// ── Super Admin ──────────────────────────────────────────
export async function fetchSuperAdminStats() {
  const res = await fetch('/superadmin/stats', { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchSuperAdminAdmins() {
  const res = await fetch('/superadmin/admins', { headers: getHeaders() });
  return handleResponse(res);
}

export async function fetchSuperAdminLogs(skip = 0, limit = 50) {
  const res = await fetch(`/superadmin/logs?skip=${skip}&limit=${limit}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function assignAdminToSchool(adminId, schoolId) {
  const res = await fetch(`/superadmin/admins/${adminId}/assign-school`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ school_id: schoolId }),
  });
  return handleResponse(res);
}

export async function fetchSuperAdminSettings() {
  const res = await fetch('/superadmin/settings', { headers: getHeaders() });
  return handleResponse(res);
}

// ── Admin Élèves ──────────────────────────────────────────
export async function fetchEleves_admin(classeId = null, search = '') {
  let url = '/admin/eleves/';
  const params = new URLSearchParams();
  if (classeId) params.append('classe_id', classeId);
  if (search) params.append('search', search);
  if (params.toString()) url += `?${params}`;
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse(res);
}

export async function createEleve_admin(eleveData) {
  const res = await fetch('/admin/eleves/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(eleveData),
  });
  return handleResponse(res);
}

export async function updateEleve_admin(eleveId, eleveData) {
  const res = await fetch(`/admin/eleves/${eleveId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(eleveData),
  });
  return handleResponse(res);
}

export async function deleteEleve_admin(eleveId) {
  return deleteResource(`/admin/eleves/${eleveId}`);
}

export async function downloadElevesImportTemplate() {
  const res = await fetch('/admin/eleves/import/template.xlsx', { headers: getHeaders() });
  return downloadFileResponse(res, 'modele_import_eleves.xlsx');
}

export async function importElevesFile(file, defaultClasseId = null) {
  const formData = new FormData();
  formData.append('file', file);
  const headers = {};
  const token = localStorage.getItem('access_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const selectedSchool = JSON.parse(localStorage.getItem('selectedSchool') || 'null');
  if (user?.role === 'superadmin' && selectedSchool?.id) {
    headers['X-School-Id'] = String(selectedSchool.id);
  }
  let url = '/admin/eleves/import';
  if (defaultClasseId) url += `?default_classe_id=${defaultClasseId}`;
  const res = await fetch(url, { method: 'POST', headers, body: formData });
  return handleResponse(res);
}

// ── Admin Années scolaires ────────────────────────────────
export async function fetchAnneesScolaires() {
  const res = await fetch('/admin/annees-scolaires/', { headers: getHeaders() });
  return handleResponse(res);
}

export async function createAnneeScolaire(data) {
  const res = await fetch('/admin/annees-scolaires/', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function activerAnneeScolaire(anneeId) {
  const res = await fetch(`/admin/annees-scolaires/${anneeId}/activer`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function deleteAnneeScolaire(anneeId) {
  const res = await fetch(`/admin/annees-scolaires/${anneeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return { success: true };
}

// ── Admin Stats ───────────────────────────────────────────
export async function fetchAdminStats() {
  const res = await fetch('/admin/stats', { headers: getHeaders() });
  return handleResponse(res);
}

// ── Config BD établissement ───────────────────────────────
export async function updateSchoolDbConfig(schoolId, dbConfig) {
  const res = await fetch(`/schools/${schoolId}/db-config`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(dbConfig),
  });
  return handleResponse(res);
}

export async function testSchoolConnection(schoolId) {
  const res = await fetch(`/schools/${schoolId}/test-connection`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function toggleSchoolActive(schoolId) {
  const res = await fetch(`/schools/${schoolId}/toggle-active`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

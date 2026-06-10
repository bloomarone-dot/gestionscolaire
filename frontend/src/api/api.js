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

export async function fetchNotes({ eleve_id, classe_id, matiere_id } = {}) {
  const params = new URLSearchParams();
  if (eleve_id) params.set('eleve_id', String(eleve_id));
  if (classe_id) params.set('classe_id', String(classe_id));
  if (matiere_id) params.set('matiere_id', String(matiere_id));
  const url = params.toString() ? `/notes/?${params}` : '/notes/';
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse(res);
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

export async function fetchPeriodesSaisie(classeId, matiereId) {
  const params = new URLSearchParams();
  if (classeId) params.set('classe_id', String(classeId));
  if (matiereId) params.set('matiere_id', String(matiereId));
  const url = params.toString() ? `/notes/periode-saisie?${params}` : '/notes/periode-saisie';
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse(res);
}

export async function createPeriodeSaisie(data) {
  const res = await fetch('/notes/periode-saisie', {
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
export async function fetchBulletin(eleve_id) {
  const [eleves, notes, matieres] = await Promise.all([
    fetchEleves_admin(),
    fetchNotes({ eleve_id }),
    fetchMatieres(),
  ]);

  const eleve = eleves.find((e) => e.id === eleve_id);
  if (!eleve) {
    return { error: 'Élève non trouvé' };
  }

  const matiereMap = Object.fromEntries(matieres.map((m) => [m.id, m.nom]));
  const details_notes = notes.map((n) => ({
    matiere: matiereMap[n.matiere_id] || '—',
    note: n.valeur,
  }));

  const moyenne_generale = details_notes.length
    ? Math.round(
        (details_notes.reduce((sum, item) => sum + item.note, 0) / details_notes.length) * 100,
      ) / 100
    : 0;

  return {
    eleve: `${eleve.nom} ${eleve.prenom}`,
    moyenne_generale,
    details_notes,
  };
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
  const res = await fetch(`/admin/professeurs/${profId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return { success: true };
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
  const res = await fetch(`/admin/classes/${classeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return { success: true };
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
  const res = await fetch(`/admin/matieres/${matiereId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return { success: true };
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

export async function getClassNotes(classeId, matiereId = null) {
  let url = `/professor/classes/${classeId}/notes`;
  if (matiereId) {
    url += `?matiere_id=${matiereId}`;
  }
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse(res);
}

export async function getEleveBulletin(eleveId) {
  const res = await fetch(`/professor/bulletins/${eleveId}`, {
    headers: getHeaders()
  });
  return handleResponse(res);
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
  const res = await fetch(`/admin/eleves/${eleveId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return { success: true };
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

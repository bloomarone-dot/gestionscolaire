const NOTES_DRAFT_PREFIX = 'edusaas_notes_draft_';
const PROF_WORKSPACE_KEY = 'edusaas_prof_workspace';
const ADMIN_WORKSPACE_KEY = 'edusaas_admin_workspace';

export function notesDraftKey(classeId, matiereId, trimestre, typeEval) {
  return `${NOTES_DRAFT_PREFIX}${classeId}_${matiereId}_${trimestre}_${typeEval}`;
}

export function saveNotesDraft(key, notesMap) {
  try {
    localStorage.setItem(key, JSON.stringify({
      notesMap,
      savedAt: Date.now(),
    }));
  } catch {
    /* quota dépassé — ignorer */
  }
}

export function loadNotesDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.notesMap || null;
  } catch {
    return null;
  }
}

export function clearNotesDraft(key) {
  localStorage.removeItem(key);
}

export function saveProfessorWorkspace(state) {
  try {
    sessionStorage.setItem(PROF_WORKSPACE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function loadProfessorWorkspace() {
  try {
    const raw = sessionStorage.getItem(PROF_WORKSPACE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAdminWorkspace(activeTab) {
  try {
    sessionStorage.setItem(ADMIN_WORKSPACE_KEY, JSON.stringify({ activeTab }));
  } catch {
    /* ignore */
  }
}

export function loadAdminWorkspace() {
  try {
    const raw = sessionStorage.getItem(ADMIN_WORKSPACE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1200;

/**
 * Compresse une image côté navigateur (canvas) avant stockage base64.
 * Accepte les fichiers lourds et réduit automatiquement la taille.
 */
export async function compressImageFile(file, maxBytes = MAX_OUTPUT_BYTES) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Veuillez sélectionner une image (PNG, JPG, WebP…).');
  }

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let width = img.width;
  let height = img.height;
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.92;
  let output = canvas.toDataURL('image/jpeg', quality);

  while (output.length > maxBytes * 1.37 && quality > 0.35) {
    quality -= 0.08;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > maxBytes * 1.37 && (width > 400 || height > 400)) {
    canvas.width = Math.round(width * 0.75);
    canvas.height = Math.round(height * 0.75);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    output = canvas.toDataURL('image/jpeg', 0.8);
  }

  return output;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image invalide'));
    img.src = src;
  });
}

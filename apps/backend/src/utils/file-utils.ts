export function sanitizeFilename(input: string, fallback = 'documento'): string {
  const base = (input || '').trim();
  const withoutControls = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  const withoutTrailingDots = withoutControls.replace(/[. ]+$/g, '');
  const withHyphens = withoutTrailingDots.replace(/\s+/g, '-');
  const collapsed = withHyphens.replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (!collapsed) {
    return fallback;
  }

  return collapsed.slice(0, 120);
}

export function buildTempFilename(titulo: string, extension: string): string {
  const safeTitle = sanitizeFilename(titulo);
  const safeExtension = extension.replace(/^\./, '').toLowerCase();
  return `${Date.now()}-${safeTitle}.${safeExtension}`;
}

export function buildDownloadFilename(titulo: string, extension: string): string {
  const safeTitle = sanitizeFilename(titulo);
  const safeExtension = extension.replace(/^\./, '').toLowerCase();
  return `${safeTitle}.${safeExtension}`;
}

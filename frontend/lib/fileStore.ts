/**
 * ClearSign v1.0 — Global File Store
 *
 * Simple module-level store for passing a File object between
 * the upload page (/) and the analyse page (/analyse).
 *
 * ClearSign v1.0 is fully stateless — no localStorage, no sessionStorage,
 * no IndexedDB (TRD §2.2). This in-memory ref is the only mechanism
 * for cross-page file transfer within a single browser session.
 */

let _pendingFile: File | null = null;

/**
 * Store a file for the analyse page to pick up.
 */
export function setPendingFile(file: File): void {
  _pendingFile = file;
}

/**
 * Retrieve and clear the pending file.
 * Returns null if no file is pending.
 */
export function getPendingFile(): File | null {
  const file = _pendingFile;
  _pendingFile = null;
  return file;
}

/**
 * Check if there's a pending file without consuming it.
 */
export function hasPendingFile(): boolean {
  return _pendingFile !== null;
}

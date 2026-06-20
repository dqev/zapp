/**
 * Formats a number of bytes into a human-readable string (e.g. "1.5 MB").
 */
export function formatBytes(bytes: number, decimals = 2): string {
  // BUG-11 fix: guard against negative, NaN, or non-finite values
  if (!bytes || bytes <= 0 || !isFinite(bytes)) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats a number of seconds into a human-readable duration (e.g. "2m 14s").
 */
export function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds < 0) return 'Calculating...';
  seconds = Math.round(seconds);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

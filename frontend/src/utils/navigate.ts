/** SPA navigation without reload (pathname routing for / and /text). */
export function navigate(path: string) {
  const hash = window.location.hash || '';
  window.history.pushState({}, '', path + hash);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateWithHash(path: string, hash: string) {
  window.history.pushState({}, '', path + (hash ? `#${hash}` : ''));
  window.dispatchEvent(new PopStateEvent('popstate'));
  // hashchange doesn't fire on pushState — sync room state manually via storage event fallback
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

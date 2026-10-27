export async function reloadAppWithoutCache(): Promise<void> {
  try {
    window.sessionStorage.removeItem('moa.vitePreloadRecovery');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* private mode */
  }
  window.location.reload();
}

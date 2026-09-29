export function useLegalNavigation() {
  const goBack = () => {
    if (window.location.hash) {
      window.location.hash = '';
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/';
  };

  return { goBack };
}

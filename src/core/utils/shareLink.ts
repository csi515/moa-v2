/**
 * Moa v2 Share Link Utility
 *
 * Implements W3C Web Share API with fallback to Clipboard copy.
 * Zero external cost, cross-platform friendly.
 */

export interface ShareLinkOptions {
  title?: string;
  text?: string;
  url: string;
  onFeedback?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface ShareLinkResult {
  shared: boolean;
  method: 'native' | 'clipboard' | 'none';
  error?: string;
}

export async function shareLink(options: ShareLinkOptions): Promise<ShareLinkResult> {
  const { title, text, url, onFeedback } = options;

  // 1. Check Web Share API (mobile browsers / supported desktop)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // If navigator.canShare is available, test url sharing capability
      const shareData = { title, text, url };
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        onFeedback?.('공유되었습니다.', 'success');
        return { shared: true, method: 'native' };
      }
    } catch (err: unknown) {
      // User cancelled share via native dialog (AbortError)
      if (err instanceof Error && err.name === 'AbortError') {
        return { shared: false, method: 'native', error: 'User aborted share' };
      }
      // If native share failed for another reason, fallback to clipboard
    }
  }

  // 2. Clipboard API Fallback (Desktop / unsupported browsers)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(url);
      onFeedback?.('링크가 클립보드에 복사되었습니다.', 'success');
      return { shared: true, method: 'clipboard' };
    } catch {
      // Fallback further to execCommand
    }
  }

  // 3. Legacy execCommand Fallback (Older browsers or insecure contexts)
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        onFeedback?.('링크가 클립보드에 복사되었습니다.', 'success');
        return { shared: true, method: 'clipboard' };
      }
    } catch {
      // Failed legacy copy
    }
  }

  const failureMsg = '공유 또는 링크 복사를 지원하지 않는 환경입니다.';
  onFeedback?.(failureMsg, 'error');
  return { shared: false, method: 'none', error: failureMsg };
}

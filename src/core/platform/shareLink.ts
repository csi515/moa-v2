import { Share } from '@capacitor/share';
import { isNativeApp } from './capacitorPlatform';

export type ShareLinkResult = 'shared' | 'copied' | 'cancelled';

/** 웹: Web Share API / 클립보드, 네이티브: Capacitor Share */
export async function shareLink(params: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareLinkResult> {
  if (isNativeApp()) {
    try {
      await Share.share({
        title: params.title,
        text: params.text,
        url: params.url,
        dialogTitle: params.title,
      });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
        url: params.url,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  await navigator.clipboard.writeText(`${params.text}\n${params.url}`);
  return 'copied';
}

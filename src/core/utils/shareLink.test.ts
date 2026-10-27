import assert from 'node:assert/strict';
import { shareLink } from './shareLink';

console.log('[TEST] shareLink running...');

// 1. Mock native navigator.share success
{
  let sharedPayload: any = null;
  let feedbackMessage = '';
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      share: async (data: any) => {
        sharedPayload = data;
      },
      canShare: () => true,
    },
    configurable: true,
    writable: true,
  });

  await (async () => {
    const result = await shareLink({
      title: '테스트 초대',
      url: 'https://moa.app/join/123',
      onFeedback: (msg) => {
        feedbackMessage = msg;
      },
    });

    assert.equal(result.shared, true);
    assert.equal(result.method, 'native');
    assert.equal(sharedPayload.url, 'https://moa.app/join/123');
    assert.equal(feedbackMessage, '공유되었습니다.');
  })();
}

// 2. Mock native share fails -> clipboard fallback
{
  let clipboardText = '';
  let feedbackMessage = '';
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      share: async () => {
        throw new Error('NotSupported');
      },
      clipboard: {
        writeText: async (text: string) => {
          clipboardText = text;
        },
      },
    },
    configurable: true,
    writable: true,
  });

  await (async () => {
    const result = await shareLink({
      url: 'https://moa.app/join/456',
      onFeedback: (msg) => {
        feedbackMessage = msg;
      },
    });

    assert.equal(result.shared, true);
    assert.equal(result.method, 'clipboard');
    assert.equal(clipboardText, 'https://moa.app/join/456');
    assert.equal(feedbackMessage, '링크가 클립보드에 복사되었습니다.');
  })();
}

// 3. User aborts native share
{
  const abortErr = new Error('Abort');
  abortErr.name = 'AbortError';
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      share: async () => {
        throw abortErr;
      },
    },
    configurable: true,
    writable: true,
  });

  await (async () => {
    const result = await shareLink({
      url: 'https://moa.app/join/abort',
    });

    assert.equal(result.shared, false);
    assert.equal(result.method, 'native');
    assert.equal(result.error, 'User aborted share');
  })();
}

console.log('[TEST] shareLink ALL PASSED!');

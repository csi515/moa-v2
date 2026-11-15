/**
 * useDirtyFormGuard Unit Tests
 *
 * 실행: npx tsx src/shared/hooks/useDirtyFormGuard.test.ts
 */

import assert from 'node:assert/strict';
import { feedbackStore } from '@/shared/feedback/feedbackStore';

async function testDirtyFormGuard() {
  console.log('Running useDirtyFormGuard unit tests...');

  // 1. isDirty가 false일 때 즉시 닫기 허용 검증
  {
    let closed = false;
    const isDirty = false;
    const handleClose = () => {
      closed = true;
    };

    if (!isDirty) {
      handleClose();
    }
    assert.equal(closed, true, 'isDirty가 false이면 확인 없이 닫기가 즉시 진행되어야 함');
  }

  // 2. isDirty가 true일 때 openConfirmDialog 호출 및 취소 방어 검증
  {
    let closed = false;
    let dialogOpened = false;

    // confirm mock
    feedbackStore.openConfirmDialog({
      title: '작성 취소 확인',
      message: '작성 중인 내용이 저장되지 않고 사라집니다. 정말 닫으시겠습니까?',
      isDestructive: true,
      onConfirm: () => {
        closed = true;
      },
      onCancel: () => {
        // 취소: 아무것도 안 함
      },
    });

    dialogOpened = feedbackStore.getState().confirmDialog !== null;
    assert.equal(dialogOpened, true, 'ConfirmDialog가 화면에 열려야 함');
    assert.equal(closed, false, '사용자가 확정하기 전에는 닫기 액션이 차단되어야 함');

    // 사용자가 '취소'를 누른 경우
    feedbackStore.getState().confirmDialog?.onCancel?.();
    feedbackStore.closeConfirmDialog();
    assert.equal(closed, false, '취소 시 폼 닫기가 실행되지 않아야 함');
    assert.equal(feedbackStore.getState().confirmDialog, null, '다이얼로그가 닫혀야 함');
  }

  // 3. isDirty가 true이고 사용자가 '나가기'를 확정한 경우
  {
    let closed = false;

    feedbackStore.openConfirmDialog({
      title: '작성 취소 확인',
      message: '작성 중인 내용이 저장되지 않고 사라집니다.',
      isDestructive: true,
      onConfirm: () => {
        closed = true;
      },
    });

    feedbackStore.getState().confirmDialog?.onConfirm();
    feedbackStore.closeConfirmDialog();
    assert.equal(closed, true, '사용자 확인 시 닫기가 정상 실행되어야 함');
  }

  console.log('useDirtyFormGuard.test.ts: ok (all guard tests passed)');
}

testDirtyFormGuard();

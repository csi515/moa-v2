import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldAutoCreateTuitionInvoice,
  formatAutoInvoiceNotice,
} from './studentTuitionAutoInvoice';

describe('studentTuitionAutoInvoice', () => {
  it('신규 등록이고 체크되어 있으며 수강료가 0보다 클 때만 true를 반환해야 한다', () => {
    assert.equal(
      shouldAutoCreateTuitionInvoice({
        isEdit: false,
        autoCreateInvoice: true,
        tuitionFee: 250000,
      }),
      true
    );
  });

  it('기존 원생 수정(isEdit: true)일 때는 false를 반환해야 한다', () => {
    assert.equal(
      shouldAutoCreateTuitionInvoice({
        isEdit: true,
        autoCreateInvoice: true,
        tuitionFee: 250000,
      }),
      false
    );
  });

  it('체크박스가 해제된 경우(autoCreateInvoice: false)에는 false를 반환해야 한다', () => {
    assert.equal(
      shouldAutoCreateTuitionInvoice({
        isEdit: false,
        autoCreateInvoice: false,
        tuitionFee: 250000,
      }),
      false
    );
  });

  it('수강료가 0원이거나 음수인 경우 false를 반환해야 한다', () => {
    assert.equal(
      shouldAutoCreateTuitionInvoice({
        isEdit: false,
        autoCreateInvoice: true,
        tuitionFee: 0,
      }),
      false
    );
  });

  it('formatAutoInvoiceNotice는 학생명과 금액을 포맷한 안내 문구를 반환해야 한다', () => {
    const notice = formatAutoInvoiceNotice('김민지', 280000);
    assert.equal(notice, '김민지 학생의 첫 달 수강료(280,000원) 청구서가 발행되었습니다.');
  });
});

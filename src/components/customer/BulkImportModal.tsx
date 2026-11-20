import React, { useState } from 'react';
import { sanitizeImportPhone } from '@/core/utils/phoneSanitizer';
import { bulkImportCustomers } from '@/core/customers/bulkImportService';
import { parseCsvToMatrix } from '@/shared/utils/excelAdapter';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';

type Row = { name: string; phone: string; memo?: string; line: number; error?: boolean };

type Props = { organizationId: string; onClose: () => void };

export function BulkImportModal({ organizationId, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('');

  function parse(text: string) {
    if (!text.trim()) {
      setRows([]);
      return;
    }

    // PapaParse 기반 RFC 4180 표준 파싱
    const matrix = parseCsvToMatrix(text);
    if (!matrix.length) {
      setRows([]);
      return;
    }

    // 첫 행이 헤더(name/phone/이름/연락처)인 경우 건너뜀
    const firstCol = String(matrix[0][0] || '').toLowerCase();
    const hasHeader = firstCol.includes('name') || firstCol.includes('이름');
    const dataRows = hasHeader ? matrix.slice(1) : matrix;

    const next: Row[] = [];
    dataRows.forEach((cols, index) => {
      const name = cols[0] ?? '';
      const phone = cols[1] ?? '';
      const memo = cols[2];
      if (!name.trim() && !phone.trim()) return;

      try {
        next.push({
          name: name.trim(),
          phone: sanitizeImportPhone(phone),
          memo,
          line: index + (hasHeader ? 2 : 1),
        });
      } catch {
        next.push({
          name: name.trim(),
          phone,
          memo,
          line: index + (hasHeader ? 2 : 1),
          error: true,
        });
      }
    });
    setRows(next);
  }

  async function submit() {
    if (rows.some((row) => row.error)) {
      setMessage('전화번호 형식이 틀린 행이 있습니다.');
      return;
    }
    try {
      const body = await bulkImportCustomers(
        organizationId,
        rows.map(({ name, phone, memo }) => ({ name, phone, memo }))
      );
      if (body.success === false) {
        const index = body.failed_row_index ?? -1;
        setRows((current) => current.map((row, rowIndex) => ({ ...row, error: rowIndex === index })));
        setMessage(`행 ${index + 2}: ${body.error_code ?? '실패'}`);
        return;
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '등록에 실패했습니다.');
      return;
    }
    setMessage('등록되었습니다.');
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="고객 일괄 등록"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" onClick={() => void submit()}>
            등록
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-3">
        <textarea
          className="min-h-32 w-full rounded-lg border p-2 text-sm"
          placeholder="name,phone,memo (예: 홍길동,01012345678,상담예정)"
          onChange={(event) => parse(event.target.value)}
        />
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.line} className={row.error ? 'rounded bg-rose-100 px-2 py-1' : 'px-2 py-1'}>
              {row.line}행 {row.name} {row.phone}
            </li>
          ))}
        </ul>
        {message ? <p className="text-sm font-medium text-slate-700">{message}</p> : null}
      </div>
    </Modal>
  );
}

import type { CapabilitySetupSchema } from '@/core/presets/types';

export const electronicLabNotebookSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'electronic_lab_notebook',
  title: '전자 연구노트 (ELN) 관리 설정',
  description: '연구윤리 및 국가 R&D 감사를 위한 작성자 전자서명, 제3자 목격자(Witness) 검증, 위변조 방지 해시 체이닝 설정을 관리합니다.',
  fields: [
    {
      id: 'require_witness_for_freeze',
      label: '동료 목격자(Witness) 확인 서명 필수화',
      type: 'boolean',
      defaultValue: true,
      description: '연구노트 최종 확정 및 위변조 방지 잠금(Freeze) 전 동료 연구원 또는 PI의 검증 서명을 요구합니다.',
    },
    {
      id: 'prevent_self_witness',
      label: '작성자 본인의 셀프 목격 서명 원천 차단',
      type: 'boolean',
      defaultValue: true,
      description: '연구 부정행위 및 특허 분쟁 방지를 위해 작성자와 목격자가 동일인일 경우 서명을 거부합니다.',
    },
    {
      id: 'auto_integrity_hash',
      label: '전자서명 시 무결성 해시(SHA-256) 자동 생성 및 체이닝',
      type: 'boolean',
      defaultValue: true,
      description: '서명 시점의 본문 내용과 원본 데이터 첨부파일의 SHA-256 해시값을 영구 결합합니다.',
    },
  ],
};

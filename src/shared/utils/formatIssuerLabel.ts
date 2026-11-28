/**
 * 납입증명서 발행인 문구 정규화 — `대표 대표` 중복 제거
 */

const TITLE_TOKENS = ['대표', '원장', '원장님', '사업주', '점주', '대표이사', '이사장'] as const;

export function formatIssuerLabel(params: {
  organizationName: string;
  representative?: string | null;
  title?: string | null;
}): string {
  const org = (params.organizationName || '').trim() || '사업장';
  const title = (params.title || '대표').trim() || '대표';
  let person = (params.representative || '').trim();

  // 대표/원장 등 직책만 들어온 경우 → 이름 없음으로 취급
  if (!person || TITLE_TOKENS.some((t) => person === t)) {
    return `${org} ${title}`;
  }

  // "대표 홍길동" / "원장 홍길동" 형태면 이름만 추출
  for (const t of TITLE_TOKENS) {
    const prefix = `${t} `;
    if (person.startsWith(prefix)) {
      person = person.slice(prefix.length).trim();
      break;
    }
  }

  // 이름 끝이 직책과 같으면 제거 (예: "홍길동 대표")
  for (const t of TITLE_TOKENS) {
    if (person.endsWith(` ${t}`)) {
      person = person.slice(0, -(t.length + 1)).trim();
    }
  }

  if (!person || TITLE_TOKENS.some((t) => person === t)) {
    return `${org} ${title}`;
  }

  return `${org} ${title} ${person}`;
}

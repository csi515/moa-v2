import { legalPageHref } from './legalPaths';
import { legalConfig } from './config';

export const legalHeadingClass = 'text-base font-bold text-slate-900 mt-6 mb-2';
export const legalListClass = 'list-disc pl-5 space-y-1';

export function PrivacyContent() {
  const { serviceName, legalEntityName, contactEmail, privacyEffectiveDate } = legalConfig;
  return (
    <>
      <p className="text-xs text-slate-500">시행일: {privacyEffectiveDate}</p>
      <p>
        {legalEntityName}(이하 &quot;회사&quot;)는 {serviceName} 서비스(이하 &quot;서비스&quot;) 이용과
        관련하여 개인정보보호법 등 관련 법령을 준수하며, 이용자의 개인정보를 보호합니다.
      </p>

      <h2 className={legalHeadingClass}>1. 수집하는 개인정보 항목</h2>
      <ul className={legalListClass}>
        <li>회원가입: 이메일, 비밀번호(암호화 저장), 이름</li>
        <li>사업장 운영: 고객·보호자·강사 연락처, 출결·수납·일정 정보</li>
        <li>학부모 포털: 자녀 연결 코드, 보호자-고객 관계 정보</li>
        <li>자동 수집: 접속 로그, 기기 정보, 서비스 이용 기록(보안·품질 개선 목적)</li>
      </ul>

      <h2 className={legalHeadingClass}>2. 이용 목적</h2>
      <ul className={legalListClass}>
        <li>회원 식별, 로그인, 조직(사업장)별 접근 제어</li>
        <li>고객·출결·수납·강사·학부모 포털 등 핵심 기능 제공</li>
        <li>고객 문의 응대, 서비스 개선, 법령 준수</li>
      </ul>

      <h2 className={legalHeadingClass}>3. 보관 기간</h2>
      <p>
        원칙적으로 서비스 이용 기간 동안 보관하며, 회원 탈퇴 또는 수집 목적 달성 시 지체 없이
        파기합니다. 다만 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관할 수
        있습니다.
      </p>

      <h2 className={legalHeadingClass}>4. 제3자 제공</h2>
      <p>
        회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 이용자의 동의가
        있거나 법령에 따른 경우에 한해 제공할 수 있습니다.
      </p>

      <h2 className={legalHeadingClass}>5. 처리 위탁</h2>
      <p>
        서비스 운영을 위해 클라우드 인프라(Supabase 등)에 데이터를 저장·처리할 수 있으며, 위탁
        시 관련 법령에 따른 보호 조치를 시행합니다.
      </p>

      <h2 className={legalHeadingClass}>6. 이용자 권리</h2>
      <p>
        이용자는 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 앱 내{' '}
        <strong>더보기 → 내 계정 → 계정 탈퇴</strong>(학부모는 포털 하단)를 통해 로그인
        계정을 삭제할 수 있습니다. 사업주(owner) 계정은 사업장 소유권 이전 후 가능합니다.
      </p>

      <h2 className={legalHeadingClass}>7. 아동·청소년 정보</h2>
      <p>
        본 서비스는 사업장·보호자가 고객(미성년자 포함) 정보를 운영 목적으로 입력·관리합니다.
        미성년자 본인의 직접 가입이 아닌, 사업장·보호자 계정을 통한 관리 구조이며, 보호자는
        자녀 관련 정보만 열람할 수 있습니다.
      </p>

      <h2 className={legalHeadingClass}>8. 문의</h2>
      <p>
        개인정보 보호 책임자: {legalEntityName}
        <br />
        이메일:{' '}
        <a href={`mailto:${contactEmail}`} className="text-indigo-600 underline">
          {contactEmail}
        </a>
      </p>
    </>
  );
}

export function TermsContent() {
  const { serviceName, legalEntityName, contactEmail, termsEffectiveDate } = legalConfig;
  return (
    <>
      <p className="text-xs text-slate-500">시행일: {termsEffectiveDate}</p>
      <p>
        본 약관은 {legalEntityName}(이하 &quot;회사&quot;)가 제공하는 {serviceName} 서비스(이하
        &quot;서비스&quot;)의 이용 조건을 정합니다.
      </p>

      <h2 className={legalHeadingClass}>1. 서비스 내용</h2>
      <p>
        MOA(관리하고, 정리하고, 돕다)는 「사업과 고객을 하나로 모으다」는 슬로건 아래,
        학원·체육관·어린이집·뷰티 등 교육·서비스 사업장의 운영과 고객(원생·회원·보호자) 경험을
        한곳에서 모으는 클라우드 SaaS입니다.
      </p>

      <h2 className={legalHeadingClass}>2. 회원 가입 및 계정</h2>
      <p>
        이용자는 정확한 정보로 가입해야 하며, 계정 보안(비밀번호 관리)에 대한 책임은 이용자에게
        있습니다. 조직(사업장) 관리자는 소속 멤버에게 적절한 권한만 부여해야 합니다.
      </p>

      <h2 className={legalHeadingClass}>3. 이용자 의무</h2>
      <ul className={legalListClass}>
        <li>타인의 개인정보를 무단 수집·유출하지 않을 것</li>
        <li>서비스를 불법 목적이나 타인의 권리를 침해하는 방식으로 사용하지 않을 것</li>
        <li>고객·보호자 등 민감 정보를 관련 법령과 사업장 내부 규정에 맞게 처리할 것</li>
      </ul>

      <h2 className={legalHeadingClass}>4. 서비스 변경·중단</h2>
      <p>
        회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있으며, 중요한
        변경 시 사전에 공지합니다.
      </p>

      <h2 className={legalHeadingClass}>5. 계정 탈퇴</h2>
      <p>
        이용자는 앱 설정에서 계정 탈퇴를 요청할 수 있습니다. 사업주(owner) 계정은 사업장 데이터
        연속성을 위해 소유권 이전 후 탈퇴해야 할 수 있습니다.
      </p>

      <h2 className={legalHeadingClass}>6. 면책</h2>
      <p>
        회사는 천재지변, 불가항력, 이용자 귀책 사유로 인한 손해에 대해 법령이 허용하는 범위 내에서
        책임을 제한합니다.
      </p>

      <h2 className={legalHeadingClass}>7. 문의</h2>
      <p>
        서비스 문의:{' '}
        <a href={`mailto:${contactEmail}`} className="text-indigo-600 underline">
          {contactEmail}
        </a>
      </p>
    </>
  );
}

export function SupportContent() {
  const { serviceName, legalEntityName, contactEmail } = legalConfig;
  return (
    <>
      <p>
        {serviceName} 앱·웹 서비스 이용 중 문의사항이 있으시면 아래 채널로 연락해 주세요.
      </p>

      <h2 className={legalHeadingClass}>이메일 문의</h2>
      <p>
        <a href={`mailto:${contactEmail}`} className="text-indigo-600 underline font-bold">
          {contactEmail}
        </a>
      </p>
      <p className="text-xs text-slate-500">영업일 기준 1~2일 내 답변을 드립니다.</p>

      <h2 className={legalHeadingClass}>계정·데이터 관련</h2>
      <ul className={legalListClass}>
        <li>
          <strong>계정 탈퇴</strong>: 앱 로그인 후 더보기 → 내 계정, 또는 학부모 포털 하단에서
          진행할 수 있습니다.
        </li>
        <li>
          <strong>개인정보</strong>:{' '}
          <a href={legalPageHref('privacy')} className="text-indigo-600 underline">
            개인정보처리방침
          </a>
          을 참고해 주세요.
        </li>
      </ul>

      <h2 className={legalHeadingClass}>운영 주체</h2>
      <p>{legalEntityName}</p>
    </>
  );
}

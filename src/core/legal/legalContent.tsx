import React from 'react';
import { legalConfig } from './config';

export const legalHeadingClass = 'text-base font-bold text-slate-900 mt-6 mb-2 border-b border-slate-100 pb-1.5';
export const legalSubHeadingClass = 'text-sm font-semibold text-slate-800 mt-4 mb-1.5';
export const legalListClass = 'list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm';
export const legalParagraphClass = 'text-xs sm:text-sm text-slate-600 leading-relaxed mt-1 mb-2';

/**
 * 개인정보처리방침 전문
 * 대한민국 개인정보보호법 및 표준 개인정보보호지침 준수
 */
export function PrivacyContent() {
  const { serviceName, legalEntityName, contactEmail, privacyEffectiveDate } = legalConfig;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-4 mb-4">
        <p className="text-xs font-bold text-indigo-900">개인정보처리방침 시행 안내</p>
        <p className="text-xs text-indigo-700 mt-0.5">
          본 방침은 {privacyEffectiveDate}부터 적용되며, {legalEntityName}가 제공하는 {serviceName} 서비스의 모든 이용자에게 적용됩니다.
        </p>
      </div>

      <p className={legalParagraphClass}>
        {legalEntityName}(이하 &quot;회사&quot;)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <h2 className={legalHeadingClass}>제1조 (개인정보의 수집 및 이용 목적)</h2>
      <p className={legalParagraphClass}>
        회사는 다음의 목적을 위하여 최소한의 개인정보를 수집·이용합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 관련 법령에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.
      </p>
      <ul className={legalListClass}>
        <li><strong>회원 가입 및 본인 식별:</strong> 회원제 서비스 이용에 따른 본인확인, 가입의사 확인, 회원자격 유지·관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보 처리 시 법정대리인의 동의여부 확인.</li>
        <li><strong>사업장(조직) 운영 관리:</strong> 테넌트 사업장 개설, 직원 초대 및 권한 부여, 매장 내 회원(원생/고객)의 등록·출결·수강권·회원권 관리, 라커/좌석 배정, 전자계약 체결, 학부모 알림 발송 등 SaaS 기능의 원활한 제공.</li>
        <li><strong>재화 또는 서비스 제공 및 결제:</strong> 서비스 이용료 청구 및 결제, 유료 구독 플랜 처리, 세금계산서·현금영수증 발행, 환불 처리, 물품 배송 또는 계약서 전달.</li>
        <li><strong>고충 처리 및 고객 지원:</strong> 이용자의 신원 확인, 문의사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보, 서비스 장애 대응.</li>
        <li><strong>서비스 품질 개선 및 신규 서비스 개발:</strong> 통계학적 특성에 따른 서비스 제공, 접속 빈도 파악, 서비스 이용 통계 분석, 보안 및 시스템 안정성 확보.</li>
      </ul>

      <h2 className={legalHeadingClass}>제2조 (수집하는 개인정보의 항목 및 수집방법)</h2>
      <p className={legalParagraphClass}>
        회사는 서비스 제공을 위해 아래와 같은 개인정보 항목을 수집하고 있습니다.
      </p>
      <div className="space-y-2 mt-2">
        <h3 className={legalSubHeadingClass}>1. 수집 항목</h3>
        <ul className={legalListClass}>
          <li><strong>공통 회원가입(필수):</strong> 이메일 주소, 비밀번호(단방향 암호화), 이름(성명), 휴대폰 번호.</li>
          <li><strong>사업장(관리자/직원) 등록 시(선택/필수):</strong> 사업장 상호명, 사업자등록번호, 대표자명, 사업장 주소, 대표 유선전화번호, 정산 계좌정보.</li>
          <li><strong>매장 고객/수강생 등록 시(사업주 입력 또는 본인 가입):</strong> 고객명, 생년월일/성별, 연락처, 보호자 성명 및 연락처(미성년자의 경우), 주소(선택), 키오스크 출결 PIN 번호(암호화 해시), 수강/이용 내역.</li>
          <li><strong>서비스 이용 과정에서 자동 생성·수집되는 항목:</strong> 접속 IP 주소, 쿠키(Cookie), 접속 일시, 서비스 이용 기록, 기기 식별정보(OS 버전, 브라우저 정보), 불량 이용 기록.</li>
        </ul>
        <h3 className={legalSubHeadingClass}>2. 수집 방법</h3>
        <p className={legalParagraphClass}>
          홈페이지 및 모바일 웹/앱을 통한 회원가입, 사업장 관리자의 고객 대장 등록, 공개 매장 랜딩페이지 신청서 작성, 고객센터 문의 접수, 생성정보 수집 툴을 통한 자동 수집.
        </p>
      </div>

      <h2 className={legalHeadingClass}>제3조 (개인정보의 보유 및 이용 기간)</h2>
      <p className={legalParagraphClass}>
        회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 수집 시에 동의받은 기간 내에서 개인정보를 처리·보유합니다.
      </p>
      <ul className={legalListClass}>
        <li><strong>회원 탈퇴 시:</strong> 원칙적으로 지체 없이 파기 (부정 이용 방지 목적의 이메일 식별값은 탈퇴 후 30일간 보관 후 완전 삭제).</li>
        <li><strong>전자상거래 등에서의 소비자보호에 관한 법률:</strong>
          <ul className="list-circle pl-5 mt-1 space-y-0.5 text-xs">
            <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
            <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
          </ul>
        </li>
        <li><strong>통신비밀보호법:</strong> 웹사이트 접속 로그 및 로그인 기록: 3개월.</li>
        <li><strong>국세기본법 / 부가가치세법:</strong> 세법이 규정하는 모든 거래에 관한 장부 및 증빙서류: 5년.</li>
      </ul>

      <h2 className={legalHeadingClass}>제4조 (개인정보의 파기절차 및 방법)</h2>
      <p className={legalParagraphClass}>
        회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
      </p>
      <ul className={legalListClass}>
        <li><strong>파기절차:</strong> 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의 승인을 거쳐 개인정보를 파기합니다.</li>
        <li><strong>파기방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법(영구 삭제)을 사용하여 파기하며, 종이 문서는 분쇄기로 분쇄하거나 소각합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제5조 (개인정보의 제3자 제공)</h2>
      <p className={legalParagraphClass}>
        회사는 정보주체의 개인정보를 제1조(개인정보의 수집 및 이용 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
      </p>

      <h2 className={legalHeadingClass}>제6조 (개인정보처리의 위탁)</h2>
      <p className={legalParagraphClass}>
        회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
      </p>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
          <thead className="bg-slate-100 text-slate-700 font-bold">
            <tr>
              <th className="p-2 border-b border-slate-200">수탁업체</th>
              <th className="p-2 border-b border-slate-200">위탁 업무 내용</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            <tr>
              <td className="p-2 font-medium">Supabase Inc. / AWS Cloud</td>
              <td className="p-2">클라우드 서버 인프라 호스팅 및 데이터베이스 보관·백업</td>
            </tr>
            <tr>
              <td className="p-2 font-medium">PG 결제대행사 (토스페이먼츠 등)</td>
              <td className="p-2">유료 요금제 결제 및 본인인증 처리</td>
            </tr>
            <tr>
              <td className="p-2 font-medium">알림톡 및 SMS 발송 대행사</td>
              <td className="p-2">출결 안내, 청구서 도착, 가입 승인 알림톡/문자 발송</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className={legalHeadingClass}>제7조 (정보주체와 법정대리인의 권리·의무 및 행사방법)</h2>
      <ul className={legalListClass}>
        <li>정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
        <li>권리 행사는 앱 내 <strong>[내 계정 설정]</strong> 또는 고객센터 이메일({contactEmail})을 통하여 서면, 전자우편을 통해 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.</li>
        <li>만 14세 미만 아동의 법정대리인은 그 아동의 개인정보에 대한 열람, 정정·삭제, 처리정지를 요구할 권리를 가집니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제8조 (개인정보의 안전성 확보 조치)</h2>
      <p className={legalParagraphClass}>
        회사는 개인정보의 안전성 확보를 위해 다음과 같은 기술적·관리적 및 물리적 조치를 취하고 있습니다.
      </p>
      <ul className={legalListClass}>
        <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 개인정보 취급 직원의 최소화 및 정기적 보안 교육.</li>
        <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, Row Level Security(RLS)를 통한 테넌트별 엄격한 데이터 격리, 비밀번호 및 고유식별정보의 일방향/양방향 암호화, 보안프로그램(SSL/TLS 암호화 통신) 설치 및 주기적 점검.</li>
        <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제.</li>
      </ul>

      <h2 className={legalHeadingClass}>제9조 (개인정보 보호책임자 및 고충처리 부서)</h2>
      <p className={legalParagraphClass}>
        회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2 text-xs space-y-1">
        <p><strong>개인정보 보호책임자:</strong> {legalEntityName} CPO</p>
        <p><strong>문의 이메일:</strong> <a href={`mailto:${contactEmail}`} className="text-indigo-600 underline font-bold">{contactEmail}</a></p>
        <p><strong>응대 시간:</strong> 평일 10:00 ~ 18:00 (주말 및 공휴일 제외)</p>
      </div>

      <h2 className={legalHeadingClass}>제10조 (권익침해 구제방법)</h2>
      <p className={legalParagraphClass}>
        정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
      </p>
      <ul className={legalListClass}>
        <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
        <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
        <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
        <li>경찰청: (국번없이) 182 (ecrm.police.go.kr)</li>
      </ul>
    </div>
  );
}

/**
 * 서비스 이용약관 전문
 * 대한민국 공정거래위원회 표준약관 및 전자상거래법 준수
 */
export function TermsContent() {
  const { serviceName, legalEntityName, contactEmail, termsEffectiveDate } = legalConfig;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-100 p-4 mb-4">
        <p className="text-xs font-bold text-slate-800">MOA 서비스 이용약관</p>
        <p className="text-xs text-slate-600 mt-0.5">
          본 약관은 {termsEffectiveDate}부터 효력이 발생합니다.
        </p>
      </div>

      <h2 className={legalHeadingClass}>제1조 (목적)</h2>
      <p className={legalParagraphClass}>
        본 약관은 {legalEntityName}(이하 &quot;회사&quot;)가 운영하는 {serviceName} 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 제반 사항을 규정함을 목적으로 합니다.
      </p>

      <h2 className={legalHeadingClass}>제2조 (용어의 정의)</h2>
      <p className={legalParagraphClass}>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
      <ul className={legalListClass}>
        <li><strong>&quot;서비스&quot;라 함은:</strong> 회사가 제공하는 교육·학원·체육시설·뷰티·서비스 업종 특화 올인원 사업장 관리 소프트웨어(SaaS), 키오스크, 학부모 및 고객 포털 등 일체의 제반 서비스를 의미합니다.</li>
        <li><strong>&quot;이용자&quot;라 함은:</strong> 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 통칭합니다.</li>
        <li><strong>&quot;회원&quot;이라 함은:</strong> 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
        <li><strong>&quot;사업장(조직/테넌트)&quot;이라 함은:</strong> 회원이 서비스를 이용하여 고객 및 매장을 관리하기 위해 개설한 독립된 운영 단위를 의미합니다.</li>
        <li><strong>&quot;관리자(Owner/Staff)&quot;라 함은:</strong> 사업장의 운영 권한을 보유하여 서비스 기능을 관리·사용하는 회원을 의미합니다.</li>
        <li><strong>&quot;고객/수강생&quot;이라 함은:</strong> 사업장 관리자에게 등록되거나 공개 매장 신청을 통해 사업장 서비스를 이용하는 최종 이용자(원생, 회원, 보호자 등)를 의미합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제3조 (약관의 명시와 개정)</h2>
      <ul className={legalListClass}>
        <li>회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면 또는 연결화면에 게시합니다.</li>
        <li>회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
        <li>약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행 약관과 함께 개정약관의 적용일자 7일 전부터 공지합니다. 다만, 이용자에게 불리한 중요한 변경의 경우에는 최소 30일 이상의 유예기간을 두고 공지 및 이메일 등으로 개별 통지합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제4조 (이용계약의 성립 및 회원가입)</h2>
      <ul className={legalListClass}>
        <li>이용계약은 회원이 되고자 하는 자(이하 &quot;가입신청자&quot;)가 약관의 내용에 동의를 하고, 회사가 정한 양식에 따라 회원정보를 기입하여 가입을 신청한 후 회사가 이를 승낙함으로써 체결됩니다.</li>
        <li>회사는 다음 각 호의 어느 하나에 해당하는 경우 회원가입 신청에 대한 승낙을 거부하거나 유보할 수 있습니다.
          <ul className="list-circle pl-5 mt-1 space-y-0.5 text-xs">
            <li>실명이 아니거나 타인의 명의를 도용한 경우</li>
            <li>허위의 정보를 기재하거나 회사가 제시하는 내용을 기재하지 않은 경우</li>
            <li>부정한 용도나 영리 추구 목적으로 본 서비스를 악용하고자 하는 경우</li>
            <li>법령 또는 사회의 안녕질서, 미풍양속을 저해할 목적으로 신청한 경우</li>
          </ul>
        </li>
      </ul>

      <h2 className={legalHeadingClass}>제5조 (회원 계정 및 비밀번호의 관리)</h2>
      <ul className={legalListClass}>
        <li>회원의 이메일 계정 및 비밀번호에 대한 관리책임은 회원 본인에게 있으며, 이를 제3자에게 양도·대여할 수 없습니다.</li>
        <li>회원은 계정 도용이나 제3자의 무단 사용을 인지한 경우 즉시 회사에 통보하고 회사의 안내에 따라야 합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제6조 (서비스의 제공, 변경 및 중단)</h2>
      <ul className={legalListClass}>
        <li>회사는 연중무휴, 1일 24시간 서비스 제공을 원칙으로 합니다.</li>
        <li>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체, 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스 제공을 일시 중단할 수 있습니다. 이 경우 회사는 사전에 회원에게 통지합니다. 단, 불가피한 사유가 있는 경우 사후에 통지할 수 있습니다.</li>
        <li>회사는 안정적인 서비스 제공을 위해 서비스의 일부 또는 전부를 수정, 변경하거나 종료할 수 있으며, 이에 대하여 관련 법령에 특별한 규정이 없는 한 회원에게 별도의 보상을 하지 않습니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제7조 (이용자의 의무 및 금지행위)</h2>
      <p className={legalParagraphClass}>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
      <ul className={legalListClass}>
        <li>가입 신청 또는 정보 변경 시 허위 내용을 등록하는 행위</li>
        <li>타인의 정보(이메일, 연락처, 카드/계좌정보 등)를 도용하는 행위</li>
        <li>회사의 지식재산권을 침해하거나 회사의 동의 없이 서비스의 소스코드, 리버스 엔지니어링, 크롤링 등을 시도하는 행위</li>
        <li>회사 또는 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
        <li>외설 또는 폭력적인 메시지, 화상, 음성 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
        <li>사업장 내 고객의 동의 없이 무단으로 개인정보를 수집·유출하거나 마케팅에 오남용하는 행위</li>
      </ul>

      <h2 className={legalHeadingClass}>제8조 (사업장 운영자의 특별 의무)</h2>
      <ul className={legalListClass}>
        <li>사업장 관리자는 서비스를 이용하여 관리하는 고객(원생, 수강생, 보호자, 강사)의 개인정보를 수집·이용할 때 반드시 당사자로부터 적법한 동의를 획득해야 하며, 관련 법령(개인정보보호법 등)을 철저히 준수해야 합니다.</li>
        <li>사업장 내에서 체결되는 수강계약, 이용권 판매, 환불 정책 등은 사업주와 고객 간의 직접적인 계약이며, 공정거래위원회 표준약관 및 관련 법령에 따라 사업장 관리자가 전적인 책임을 부담합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제9조 (유료 서비스, 이용 요금 및 환불)</h2>
      <ul className={legalListClass}>
        <li>회사가 제공하는 유료 SaaS 요금제의 결제 방식, 결제 주기, 이용 요금은 서비스 내 요금제 안내 페이지에 따릅니다.</li>
        <li>회원은 유료 서비스 이용 중 언제든지 구독 해지를 신청할 수 있으며, 해지 신청 시 다음 결제 주기부터 자동 결제가 중단됩니다.</li>
        <li>회사의 귀책 사유로 인하여 서비스를 이용하지 못한 경우, 회사는 서비스 이용 중단 시간에 상응하는 기간을 연장하거나 환불 규정에 따라 잔여 금액을 환불합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제10조 (계약 해지 및 이용 제한)</h2>
      <ul className={legalListClass}>
        <li>회원은 언제든지 서비스 내 [내 계정] 메뉴를 통하여 이용계약 해지(회원 탈퇴)를 신청할 수 있으며, 회사는 관련 법령이 정하는 바에 따라 신속히 처리합니다.</li>
        <li>회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 회사는 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제11조 (손해배상 및 면책사항)</h2>
      <ul className={legalListClass}>
        <li>회사 또는 회원이 본 약관을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상할 책임이 있습니다. 단, 고의 또는 과실이 없는 경우에는 그러하지 아니합니다.</li>
        <li>회사는 천재지변, 전쟁, 기간통신사업자의 회선 장애 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
        <li>회사는 회원 상호 간 또는 회원과 제3자 상호 간에 서비스를 매개로 발생한 거래나 분쟁에 대해서는 개입할 의무가 없으며 이로 인한 손해를 배상할 책임이 없습니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>제12조 (준거법 및 재판관할)</h2>
      <ul className={legalListClass}>
        <li>회사와 이용자 간에 제기된 소송은 대한민국 법을 준거법으로 합니다.</li>
        <li>회사와 이용자 간 발생한 분쟁에 관한 소송은 민사소송법 상의 관할법원에 제기합니다.</li>
      </ul>
    </div>
  );
}

/**
 * 고객 지원 및 고객센터 안내
 */
export function SupportContent() {
  const { serviceName, legalEntityName, contactEmail } = legalConfig;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-100 p-4 mb-4">
        <p className="text-xs font-bold text-slate-800">{serviceName} 고객지원 센터</p>
        <p className="text-xs text-slate-600 mt-0.5">
          서비스 이용 중 궁금하신 점이나 불편한 점을 언제든 알려주세요.
        </p>
      </div>

      <h2 className={legalHeadingClass}>1. 온라인 고객센터 접수</h2>
      <p className={legalParagraphClass}>
        공식 지원 이메일:{' '}
        <a href={`mailto:${contactEmail}`} className="text-indigo-600 font-bold underline">
          {contactEmail}
        </a>
      </p>
      <p className="text-xs text-slate-500">
        접수된 문의는 영업일 기준 24시간 이내에 전담 매니저가 신속하게 검토 후 회신해 드립니다.
      </p>

      <h2 className={legalHeadingClass}>2. 주요 안내 및 자주 묻는 질문</h2>
      <ul className={legalListClass}>
        <li><strong>회원 탈퇴 및 계정 삭제:</strong> 로그인 후 [우측 상단 프로필/더보기] → [내 계정] 메뉴에서 즉시 신청하실 수 있습니다.</li>
        <li><strong>사업장(테넌트) 데이터 백업:</strong> 관리자 설정의 [데이터 관리] 메뉴에서 회원 대장 및 수납 내역을 엑셀로 다운로드받으실 수 있습니다.</li>
        <li><strong>보안 및 권한 문의:</strong> 사업장 직원의 권한 변경은 [사업장 설정] → [역할 및 권한 관리]에서 세부 제어가 가능합니다.</li>
      </ul>

      <h2 className={legalHeadingClass}>3. 운영 주체 정보</h2>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5 text-slate-700 mt-3">
        <p><strong>상호명:</strong> {legalEntityName}</p>
        <p><strong>서비스명:</strong> {serviceName} (모아 SaaS)</p>
        <p><strong>대표 이메일:</strong> {contactEmail}</p>
        <p><strong>운영시간:</strong> 평일 10:00 ~ 18:00 (점심시간 12:30 ~ 13:30, 주말·공휴일 휴무)</p>
      </div>
    </div>
  );
}

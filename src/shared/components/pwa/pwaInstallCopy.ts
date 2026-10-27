/** PWA 홈 화면 추가 안내 문구 */
export const PWA_INSTALL_COPY = {
  title: (shortName: string) => `${shortName}를 홈 화면에 추가`,
  body: (shortName: string) =>
    `${shortName}(Moa)를 홈 화면에 추가하면 수업 및 등하원 알림을 무료로 받아보실 수 있습니다.`,
  installCta: '홈 화면에 추가',
  laterCta: '나중에',
  gotItCta: '확인했어요',
  guideToggle: '설치 방법 보기',
  guideHide: '설치 방법 닫기',
  iosTitle: 'iPhone · Safari',
  androidTitle: 'Android · Chrome',
  otherTitle: '브라우저에서 추가',
  iosSteps: [
    'Safari 하단(또는 상단)의 공유 버튼을 탭합니다.',
    '목록에서 「홈 화면에 추가」를 선택합니다.',
    '「추가」를 눌러 완료합니다.',
  ],
  androidSteps: [
    'Chrome 오른쪽 위 ⋮ 메뉴를 엽니다.',
    '「앱 설치」또는 「홈 화면에 추가」를 선택합니다.',
    '안내에 따라 설치를 완료합니다.',
  ],
  otherSteps: [
    '브라우저 주소창 옆 설치 아이콘이 있으면 눌러 설치합니다.',
    '또는 메뉴에서 「앱 설치」·「홈 화면에 추가」를 선택합니다.',
  ],
} as const;

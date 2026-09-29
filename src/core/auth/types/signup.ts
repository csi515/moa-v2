/**
 * 회원가입은 MOA User 계정 생성만 담당한다.
 * Owner / Instructor / Customer / Parent 역할은
 * OrganizationMembership(사업장 개설·초대·연결)에서 결정한다.
 */
export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
}

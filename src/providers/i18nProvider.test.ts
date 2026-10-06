import assert from "node:assert/strict";
import { createI18nProvider, i18nProvider } from "./i18nProvider";

async function runTests() {
  // Test 1: 기본 업종(교육/학원) 번역
  {
    const provider = createI18nProvider({ defaultIndustry: "piano" });

    // 도메인 키
    assert.equal(provider.translate("customer.singular"), "학생");
    assert.equal(provider.translate("service.singular"), "반");
    assert.equal(provider.translate("billing.fee"), "수강료");

    // Refine 리소스 키
    assert.equal(provider.translate("resources.customers.name"), "학생");
    assert.equal(provider.translate("resources.customers.titles.list"), "학생 목록");
    assert.equal(provider.translate("resources.customers.titles.create"), "학생 등록");
    assert.equal(provider.translate("resources.schedules.name"), "일정 관리");
    assert.equal(provider.translate("resources.tuition_invoices.name"), "수강료 관리");
    assert.equal(provider.translate("resources.dashboard.name"), "대시보드");
  }

  // Test 2: 피트니스/필라테스 업종 전환 시 동적 반영
  {
    const provider = createI18nProvider({ defaultIndustry: "pilates" });

    assert.equal(provider.translate("customer.singular"), "회원");
    assert.equal(provider.translate("service.singular"), "수업");
    assert.equal(provider.translate("resources.customers.name"), "회원");
    assert.equal(provider.translate("resources.customers.titles.list"), "회원 목록");
    assert.equal(provider.translate("resources.customers.titles.create"), "회원 등록");
    assert.equal(provider.translate("facility.room"), "스튜디오");

    // setIndustry를 통한 런타임 업종 변경
    provider.setIndustry("skin");
    assert.equal(provider.translate("customer.singular"), "고객");
    assert.equal(provider.translate("service.singular"), "시술");
    assert.equal(provider.translate("billing.fee"), "시술비");
    assert.equal(provider.translate("resources.customers.name"), "고객");
  }

  // Test 3: 어린이집(daycare) 업종 동적 반영
  {
    const provider = createI18nProvider({ defaultIndustry: "daycare" });

    assert.equal(provider.translate("customer.singular"), "원아");
    assert.equal(provider.translate("staff.singular"), "교사");
    assert.equal(provider.translate("facility.place"), "어린이집");
    assert.equal(provider.translate("resources.customers.name"), "원아");
    assert.equal(provider.translate("resources.customers.titles.list"), "원아 목록");
  }

  // Test 4: dynamic getIndustry 콜백 지원
  {
    let currentInd = "taekwondo";
    const provider = createI18nProvider({
      getIndustry: () => currentInd,
    });

    assert.equal(provider.translate("customer.singular"), "회원");
    assert.equal(provider.translate("service.singular"), "수업반");
    assert.equal(provider.translate("customer.statusActive"), "수련중");

    currentInd = "gym";
    assert.equal(provider.translate("customer.singular"), "회원");
    assert.equal(provider.translate("staff.singular"), "강사");
    assert.equal(provider.translate("staff.section"), "지도진");
  }

  // Test 5: Refine 표준 버튼 및 알림 텍스트 번역
  {
    const provider = createI18nProvider();

    assert.equal(provider.translate("buttons.create"), "등록");
    assert.equal(provider.translate("buttons.save"), "저장");
    assert.equal(provider.translate("buttons.delete"), "삭제");
    assert.equal(provider.translate("buttons.cancel"), "취소");
    assert.equal(provider.translate("notifications.createSuccess"), "성공적으로 등록되었습니다.");
    assert.equal(provider.translate("pages.error.404"), "페이지를 찾을 수 없습니다.");
  }

  // Test 6: 옵션 보간(interpolation) 지원 ({{key}} 및 {key})
  {
    const provider = createI18nProvider();

    const withDoubleBraces = provider.translate(
      "welcome",
      { name: "홍길동" },
      "환영합니다, {{name}}님"
    );
    assert.equal(withDoubleBraces, "환영합니다, 홍길동님");

    const withSingleBrace = provider.translate(
      "welcome",
      { name: "김철수" },
      "환영합니다, {name}님"
    );
    assert.equal(withSingleBrace, "환영합니다, 김철수님");
  }

  // Test 7: 기본 메시지(defaultMessage) 및 알 수 없는 키 처리
  {
    const provider = createI18nProvider();

    // 2인자 형태 (key, defaultMessage)
    assert.equal(provider.translate("unknown.test", "대체 메시지"), "대체 메시지");

    // 3인자 형태 (key, options, defaultMessage)
    assert.equal(
      provider.translate("unknown.test2", { count: 5 }, "남은 수량: {count}개"),
      "남은 수량: 5개"
    );

    // defaultMessage 없는 경우 key 반환
    assert.equal(provider.translate("completely.unknown.key"), "completely.unknown.key");
  }

  // Test 8: getLocale & changeLocale (다국어 영어 모드 지원)
  {
    const provider = createI18nProvider();

    assert.equal(provider.getLocale(), "ko");
    await provider.changeLocale("en");
    assert.equal(provider.getLocale(), "en");

    // 영어 모드에서 버튼 텍스트
    assert.equal(provider.translate("buttons.create"), "Create");
    assert.equal(provider.translate("buttons.save"), "Save");
    assert.equal(provider.translate("buttons.delete"), "Delete");
    assert.equal(provider.translate("notifications.createSuccess"), "Successfully created.");
  }

  // Test 9: 싱글톤 인스턴스 i18nProvider 검증
  {
    assert.ok(i18nProvider);
    assert.equal(typeof i18nProvider.translate, "function");
    assert.equal(typeof i18nProvider.changeLocale, "function");
    assert.equal(typeof i18nProvider.getLocale, "function");
    assert.equal(i18nProvider.translate("buttons.create"), "등록");
  }

  console.log("i18nProvider.test.ts: all tests passed! (100% OK)");
}

runTests().catch((err) => {
  console.error("i18nProvider.test.ts failed:", err);
  process.exit(1);
});

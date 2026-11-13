# 5. Moa-v2 외부 서비스 연동 규칙 (External Integration Rules)

> **문서 버전:** 1.0.0  
> **상위 헌법:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md)  
> **관련 문서:** [docs/rules/3_COMMERCIAL_UX.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/rules/3_COMMERCIAL_UX.md)

---

## 1. 포트 & 어댑터 패턴 (Port & Adapter) 의무화

Moa-v2는 특정 외부 벤더(PG사, 카카오 알림톡, SMS 통신사, 국세청 등)에 도메인 로직이 종속되지 않도록 **포트-어댑터 패턴(Hexagonal Architecture)**을 의무화한다.

```
┌────────────────────────────────────────────────────────┐
│  Capability Domain Logic                               │
│  (billing_invoicing, attendance, passes 등)            │
└──────────────────────────┬─────────────────────────────┘
                           │  호출 (추상 Port에만 의존)
┌──────────────────────────▼─────────────────────────────┐
│  Port Interface (예: PaymentGatewayPort, SmsPort)     │
└──────────────────────────┬─────────────────────────────┘
                           │  구현 (DI / Adapter)
┌──────────────────────────▼─────────────────────────────┐
│  External Adapters (src/services/external/)            │
│  ├── TossPaymentsAdapter / InicisAdapter              │
│  ├── KakaoBizMessageAdapter / CoolSmsAdapter          │
│  └── HometaxReceiptAdapter                            │
└────────────────────────────────────────────────────────┘
```

---

## 2. 외부 연동 4대 핵심 규칙

### 2.1 도메인 계층 내 외부 벤더 SDK 직접 Import 영구 금지
- Core나 개별 Capability 도메인 컴포넌트(`src/capabilities/*`, `src/core/*`) 내부에서 특정 PG사 SDK(토스, 이니시스 등)나 알림톡 API 클라이언트를 직접 `import`하는 것을 엄격히 금지한다.
- 도메인은 오직 추상 포트 인터페이스(`PaymentGatewayPort`, `NotificationPort`)만 바라본다.

### 2.2 어댑터 교체 무영향 원칙 (Plug-and-Play)
- 외부 공급사가 변경되더라도(예: 카카오 알림톡 공급사 변경 또는 PG사 변경) Capability 도메인 코드나 DB 스키마는 단 한 줄도 수정되지 않아야 한다.

### 2.3 외부 장애 격리 및 복원력 (Graceful Degradation)
- 외부 결제망, 통신사 서버, 국세청 시스템이 장애를 일으키더라도 앱 전체가 크래시되지 않도록 타임아웃(Timeout)과 에러 격리를 필수로 적용한다.
- 외부 발송 실패 시 도메인의 내부 데이터(출결, 수납 내역 등)는 안전하게 저장되고, "외부 발송 실패: 재전송 필요" 상태로 격리 기록되어야 한다.

### 2.4 안전한 시크릿 관리 (Zero-Exposure)
- 외부 API 키, 시크릿 토큰, 인증서 등은 클라이언트 코드나 브라우저 번들에 절대 포함되어서는 안 되며, 반드시 Supabase Edge Functions 또는 백엔드 보안 환경변수를 경유한다.

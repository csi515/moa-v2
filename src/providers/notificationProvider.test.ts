import { strict as assert } from "node:assert";
import { createNotificationProvider } from "./notificationProvider";

type ToastCall = {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  title?: string;
};

function setupTest() {
  const calls: ToastCall[] = [];
  const mockShowToast = (
    message: string,
    type?: "success" | "error" | "info" | "warning",
    title?: string
  ) => {
    calls.push({ message, type, title });
  };

  const provider = createNotificationProvider({ showToast: mockShowToast });
  return { provider, calls };
}

// 1. Success notification without description
{
  const { provider, calls } = setupTest();
  provider.open({
    key: "test-1",
    message: "고객 정보가 저장되었습니다.",
    type: "success",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].message, "고객 정보가 저장되었습니다.");
  assert.equal(calls[0].type, "success");
  assert.equal(calls[0].title, undefined);
}

// 2. Success notification with description (message as title, description as body)
{
  const { provider, calls } = setupTest();
  provider.open({
    key: "test-2",
    message: "등록 완료",
    type: "success",
    description: "홍길동 원생이 정상적으로 등록되었습니다.",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].title, "등록 완료");
  assert.equal(calls[0].message, "홍길동 원생이 정상적으로 등록되었습니다.");
  assert.equal(calls[0].type, "success");
}

// 3. Error notification
{
  const { provider, calls } = setupTest();
  provider.open({
    key: "test-3",
    message: "저장 실패",
    type: "error",
    description: "네트워크 오류가 발생했습니다.",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].title, "저장 실패");
  assert.equal(calls[0].message, "네트워크 오류가 발생했습니다.");
  assert.equal(calls[0].type, "error");
}

// 4. Progress notification maps to 'info'
{
  const { provider, calls } = setupTest();
  provider.open({
    key: "test-4",
    message: "처리 중입니다...",
    type: "progress",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].message, "처리 중입니다...");
  assert.equal(calls[0].type, "info");
}

// 5. Close does not throw
{
  const { provider } = setupTest();
  assert.doesNotThrow(() => {
    provider.close("test-key");
  });
}

console.log("notificationProvider.test.ts: all tests passed! (100% OK)");

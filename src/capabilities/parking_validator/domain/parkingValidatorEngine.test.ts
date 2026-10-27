import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVehicleNumber,
  calculateRequiredTickets,
  getBatchRemainingQuantity,
  renderParkingPassSvg,
  formatParkingNotificationText,
  type ParkingRegistrationItem,
} from './parkingValidatorEngine';

describe('parking_validator - domain engine', () => {
  it('차량 번호 공백을 정규화한다', () => {
    assert.equal(normalizeVehicleNumber(' 12가 3456 '), '12가3456');
    assert.equal(normalizeVehicleNumber('3456'), '3456');
  });

  it('체류 시간에 따른 소요 주차권 수량을 올림 계산한다', () => {
    // 90분 체류, 60분권 -> 2장 필요
    assert.equal(calculateRequiredTickets(90, 60), 2);
    // 60분 체류, 60분권 -> 1장 필요
    assert.equal(calculateRequiredTickets(60, 60), 1);
    // 0분 -> 0장
    assert.equal(calculateRequiredTickets(0, 60), 0);
    // 음수 체류 또는 0분 권종 -> 0장 (0으로 나누기 방어)
    assert.equal(calculateRequiredTickets(-10, 60), 0);
    assert.equal(calculateRequiredTickets(60, 0), 0);
  });

  it('주차권 잔여 재고를 정확히 계산한다', () => {
    const remaining = getBatchRemainingQuantity({
      purchasedQuantity: 100,
      usedQuantity: 35,
    });
    assert.equal(remaining, 65);

    // 초과 사용 시 음수 방어
    const overUsed = getBatchRemainingQuantity({
      purchasedQuantity: 10,
      usedQuantity: 20,
    });
    assert.equal(overUsed, 0);
  });

  it('W3C SVG 주차 확인증 및 안내 텍스트가 정상 생성된다', () => {
    const reg: ParkingRegistrationItem = {
      id: 'reg-1',
      organizationId: 'org-1',
      vehicleNumber: '12가 3456',
      visitorName: '홍길동',
      visitorRole: '학부모',
      purpose: '원생 픽업/상담',
      registeredAt: '2026-10-17T15:00:00Z',
      freeMinutes: 60,
      ticketsUsed: 1,
      status: 'active',
      createdAt: '2026-10-17T15:00:00Z',
    };

    const svg = renderParkingPassSvg(reg, 60);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('12가3456'));
    assert.ok(svg.includes('60분 무료'));
    assert.ok(svg.includes('홍길동'));

    const text = formatParkingNotificationText(reg, 60);
    assert.ok(text.includes('12가 3456'));
    assert.ok(text.includes('60분 무료'));
    assert.ok(text.includes('홍길동'));
  });
});

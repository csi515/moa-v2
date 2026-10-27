import assert from 'node:assert/strict';
import {
  type ArtExhibitionPiece,
  calculateMonthlyRentalTotal,
  calculateTotalInsuredValue,
  filterExpiringExhibitions,
} from './exhibitionCurationEngine';

function run() {
  const samplePieces: ArtExhibitionPiece[] = [
    {
      id: '1',
      artworkCode: 'ART-001',
      title: '새벽의 선율',
      artistName: '김화백',
      medium: '캔버스에 유채',
      dimensions: '120x90cm',
      zoneLocation: '1층 로비',
      insuranceValue: 15000000,
      rentalFeeMonthly: 300000,
      status: 'on_display',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
    },
    {
      id: '2',
      artworkCode: 'ART-002',
      title: '청동 무용수',
      artistName: '이조각',
      medium: '청동 브론즈',
      dimensions: '40x40x80cm',
      zoneLocation: '원장실 입구',
      insuranceValue: 20000000,
      rentalFeeMonthly: 500000,
      status: 'on_display',
      startDate: '2026-02-01',
      endDate: '2026-03-10',
    },
    {
      id: '3',
      artworkCode: 'ART-003',
      title: '숲의 기억',
      artistName: '박사진',
      medium: '파인아트 프린트',
      dimensions: '80x60cm',
      zoneLocation: '지하 수장고',
      insuranceValue: 5000000,
      rentalFeeMonthly: 100000,
      status: 'in_storage',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    },
    {
      id: '4',
      artworkCode: 'ART-004',
      title: '귀환된 작품',
      artistName: '최작가',
      medium: '수채화',
      dimensions: '50x50cm',
      zoneLocation: '반납 완료',
      insuranceValue: 3000000,
      rentalFeeMonthly: 80000,
      status: 'returned',
      startDate: '2025-01-01',
      endDate: '2025-05-01',
    },
  ];

  // 1. calculateMonthlyRentalTotal
  assert.equal(calculateMonthlyRentalTotal(samplePieces), 800000);

  // 2. calculateTotalInsuredValue
  assert.equal(calculateTotalInsuredValue(samplePieces), 40000000);

  // 3. filterExpiringExhibitions
  const expiring = filterExpiringExhibitions(samplePieces, '2026-03-01', 14);
  assert.equal(expiring.length, 1);
  assert.equal(expiring[0].artworkCode, 'ART-002');

  console.log('exhibitionCurationEngine tests passed!');
}

run();

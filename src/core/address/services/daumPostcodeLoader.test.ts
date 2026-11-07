import assert from 'node:assert/strict';
import {
  mapDaumPostcodeToSearchResult,
  type DaumPostcodeData,
} from './daumPostcodeLoader';

console.log('[test:daumPostcodeLoader] Testing Kakao Postcode data mapper...');

// 1. 기본 도로명 주소 매핑 (건물명 포함)
{
  const mockData: Partial<DaumPostcodeData> = {
    roadAddress: '서울특별시 강남구 테헤란로 123',
    jibunAddress: '서울특별시 강남구 역삼동 736-1',
    zonecode: '06234',
    sido: '서울',
    sigungu: '강남구',
    bname: '역삼동',
    buildingName: '여삼빌딩',
  };

  const result = mapDaumPostcodeToSearchResult(mockData as DaumPostcodeData);

  assert.equal(result.roadAddress, '서울특별시 강남구 테헤란로 123');
  assert.equal(result.fullAddress, '서울특별시 강남구 테헤란로 123 (역삼동, 여삼빌딩)');
  assert.equal(result.postal, '06234');
  assert.equal(result.sido, '서울');
  assert.equal(result.sigungu, '강남구');
  assert.equal(result.dong, '역삼동');
  assert.equal(result.buildingName, '여삼빌딩');
  assert.equal(result.jibun, '서울특별시 강남구 역삼동 736-1');
}

// 2. 도로명 주소 없고 autoRoadAddress 만 있는 경우
{
  const mockData: Partial<DaumPostcodeData> = {
    roadAddress: '',
    autoRoadAddress: '경기도 성남시 분당구 판교역로 235',
    jibunAddress: '경기도 성남시 분당구 삼평동 681',
    zonecode: '13494',
    sido: '경기',
    sigungu: '성남시 분당구',
    bname: '삼평동',
    buildingName: '에이치스퀘어 N동',
  };

  const result = mapDaumPostcodeToSearchResult(mockData as DaumPostcodeData);

  assert.equal(result.roadAddress, '경기도 성남시 분당구 판교역로 235');
  assert.equal(result.fullAddress, '경기도 성남시 분당구 판교역로 235 (삼평동, 에이치스퀘어 N동)');
  assert.equal(result.postal, '13494');
}

// 3. 건물명 없이 도로명만 있는 경우
{
  const mockData: Partial<DaumPostcodeData> = {
    roadAddress: '제주특별자치도 제주시 첨단로 242',
    zonecode: '63309',
    sido: '제주',
    sigungu: '제주시',
    bname: '영평동',
    buildingName: '',
  };

  const result = mapDaumPostcodeToSearchResult(mockData as DaumPostcodeData);

  assert.equal(result.roadAddress, '제주특별자치도 제주시 첨단로 242');
  assert.equal(result.fullAddress, '제주특별자치도 제주시 첨단로 242 (영평동)');
  assert.equal(result.buildingName, null);
}

console.log('daumPostcodeLoader.test.ts: all assertions passed!');

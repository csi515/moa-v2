import assert from 'node:assert/strict';
import {
  isMarketingUsagePermitted,
  filterMediaByTags,
  validateMediaAssetInput,
  type MediaAssetRecord,
} from './mediaDamEngine';

function run() {
  // 1. 마케팅 활용 적격성 검증
  assert.equal(isMarketingUsagePermitted('CONSENT_OBTAINED', true), true);
  assert.equal(isMarketingUsagePermitted('ANONYMIZED_MOSAIC', true), true);
  assert.equal(isMarketingUsagePermitted('CONSENT_PENDING', true), false); // 동의 미완료 대외 노출 차단

  // 2. 태그 기반 필터링
  const assets: MediaAssetRecord[] = [
    {
      id: 'm1',
      tenant_id: 't1',
      title: '봄 발표회 단체사진',
      media_type: 'PHOTO',
      file_url: 'https://cdn.example.com/p1.jpg',
      tags: ['발표회', '피아노', '2026봄'],
      portrait_consent_status: 'CONSENT_OBTAINED',
      is_marketing_ready: true,
      uploaded_at: '2026-10-01',
    },
    {
      id: 'm2',
      tenant_id: 't1',
      title: '개인 레슨 영상',
      media_type: 'VIDEO',
      file_url: 'https://cdn.example.com/v1.mp4',
      tags: ['개인레슨', '바이올린'],
      portrait_consent_status: 'CONSENT_PENDING',
      is_marketing_ready: false,
      uploaded_at: '2026-10-02',
    },
  ];

  const filtered = filterMediaByTags(assets, '피아노');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'm1');

  // 3. 유효성 검증
  assert.equal(validateMediaAssetInput('학원 인테리어 사진', ['시설', '인테리어']).isValid, true);
  assert.equal(validateMediaAssetInput('', ['시설']).isValid, false);
  assert.equal(validateMediaAssetInput('인테리어', []).isValid, false);

  console.log('mediaDamEngine.test.ts: ok');
}

run();

import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type MediaAssetRecord,
  type MediaType,
  type PortraitConsentStatus,
  isMarketingUsagePermitted,
  filterMediaByTags,
  validateMediaAssetInput,
} from '../domain/mediaDamEngine';

export const MediaDamListPage: React.FC = () => {
  const { query } = useList<MediaAssetRecord>({
    resource: 'media_assets',
  });
  const items = (query?.data?.data as MediaAssetRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createAsset } = useCreate();

  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('PHOTO');
  const [consentStatus, setConsentStatus] = useState<PortraitConsentStatus>('CONSENT_PENDING');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const filteredItems = selectedTag ? filterMediaByTags(items, selectedTag) : items;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const validation = validateMediaAssetInput(title, tags);
    if (!validation.isValid) {
      showToast(validation.error || '입력값을 확인해주세요.', 'error');
      return;
    }

    createAsset(
      {
        resource: 'media_assets',
        values: {
          tenant_id: 'default',
          title,
          media_type: mediaType,
          file_url: `local://storage/media/${Date.now()}_asset.bin`,
          tags,
          portrait_consent_status: consentStatus,
          is_marketing_ready: isMarketingUsagePermitted(consentStatus, true),
          uploaded_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast('미디어 자산이 아카이빙 대장에 등록되었습니다.', 'success');
          setTitle('');
          setTagsInput('');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>시설 홍보용 미디어 자산 및 초상권 동의 대장</h2>
      <p style={{ color: '#666' }}>
        수업, 공연, 시술 결과물 원본 사진/영상을 아카이빙하고 피사체의 초상권 동의 여부를 추적합니다.
      </p>

      <form
        onSubmit={handleRegister}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          padding: 16,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>자산 명칭 / 촬영 주제</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2026 여름 정기 연주회 하이라이트"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>미디어 유형</label>
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as MediaType)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="PHOTO">사진 (PHOTO)</option>
            <option value="VIDEO">동영상 (VIDEO)</option>
            <option value="BANNER_DESIGN">홍보물/디자인 (BANNER_DESIGN)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>초상권/이용 동의 상태</label>
          <select
            value={consentStatus}
            onChange={(e) => setConsentStatus(e.target.value as PortraitConsentStatus)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="CONSENT_PENDING">동의 대기 (PENDING)</option>
            <option value="CONSENT_OBTAINED">동의 완료 (OBTAINED - 홍보 가능)</option>
            <option value="ANONYMIZED_MOSAIC">모자이크/익명 처리 (MOSAIC - 홍보 가능)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>태그 (쉼표 구분)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="예: 정기공연, 바이올린, 무대"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            자산 등록
          </button>
        </div>
      </form>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 'bold' }}>태그 필터:</span>
        <button
          onClick={() => setSelectedTag('')}
          style={{
            padding: '4px 8px',
            backgroundColor: selectedTag === '' ? '#4f46e5' : '#e5e7eb',
            color: selectedTag === '' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          전체 보기
        </button>
        {['정기공연', '바이올린', '수업현장', '시술비포애프터'].map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            style={{
              padding: '4px 8px',
              backgroundColor: selectedTag === tag ? '#4f46e5' : '#e5e7eb',
              color: selectedTag === tag ? '#fff' : '#000',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            #{tag}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>파일명/주제</th>
              <th style={{ padding: 8 }}>유형</th>
              <th style={{ padding: 8 }}>초상권 상태</th>
              <th style={{ padding: 8 }}>마케팅 활용 자격</th>
              <th style={{ padding: 8 }}>태그</th>
              <th style={{ padding: 8 }}>등록일시</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((asset) => {
              const eligible = isMarketingUsagePermitted(asset.portrait_consent_status, true);
              return (
                <tr key={asset.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontWeight: 500 }}>{asset.title}</td>
                  <td style={{ padding: 8 }}>{asset.media_type}</td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor:
                          asset.portrait_consent_status === 'CONSENT_OBTAINED'
                            ? '#d1fae5'
                            : asset.portrait_consent_status === 'ANONYMIZED_MOSAIC'
                            ? '#e0e7ff'
                            : '#fef3c7',
                        color:
                          asset.portrait_consent_status === 'CONSENT_OBTAINED'
                            ? '#065f46'
                            : asset.portrait_consent_status === 'ANONYMIZED_MOSAIC'
                            ? '#3730a3'
                            : '#92400e',
                      }}
                    >
                      {asset.portrait_consent_status}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>
                    {eligible ? (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ 홍보 가능</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>✗ 대외 사용 금지</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    {asset.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#e5e7eb',
                          borderRadius: 12,
                          padding: '2px 8px',
                          fontSize: 11,
                          marginRight: 4,
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: 8, fontSize: 12, color: '#666' }}>
                    {new Date(asset.uploaded_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 미디어 자산이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type VipConciergeProfile,
  getRecommendedBeverage,
  hasAllergyRisk,
} from '../domain/vipConciergeEngine';

export const VipConciergeListPage: React.FC = () => {
  const { query } = useList<VipConciergeProfile>({
    resource: 'vip_profiles',
  });
  const items = (query?.data?.data as VipConciergeProfile[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createProfile } = useCreate();

  const [customerName, setCustomerName] = useState('');
  const [vipTier, setVipTier] = useState<VipConciergeProfile['vipTier']>('black');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [dietaryInput, setDietaryInput] = useState('');
  const [roomTemp, setRoomTemp] = useState(22);
  const [music, setMusic] = useState('조용한 클래식 피아노');
  const [doNotDiscuss, setDoNotDiscuss] = useState('');
  const [protocolNotes, setProtocolNotes] = useState('');

  const [allergyCheckInput, setAllergyCheckInput] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast('고객명을 입력해주세요.', 'error');
      return;
    }

    const allergies = allergiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const dietaryPreferences = dietaryInput.split(',').map((s) => s.trim()).filter(Boolean);
    const doNotDiscussTopics = doNotDiscuss.split(',').map((s) => s.trim()).filter(Boolean);

    createProfile(
      {
        resource: 'vip_profiles',
        values: {
          customerId: `cust_${Date.now()}`,
          customerName,
          vipTier,
          allergies,
          dietaryPreferences,
          roomTemperaturePreference: Number(roomTemp),
          musicGenrePreference: music,
          doNotDiscussTopics,
          protocolNotes,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast('VIP 의전 프로필이 등록되었습니다.', 'success');
          setCustomerName('');
          setAllergiesInput('');
          setDietaryInput('');
          setDoNotDiscuss('');
          setProtocolNotes('');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>VIP 고객 성향·알러지·의전 노트 대장</h2>
      <p style={{ color: '#666' }}>
        최상위 VIP 고객의 알러지 주의물질, 식음료 선호, 최적 실내온도, 사적 금지 화제 및 맞춤 의전 지침을 관리합니다.
      </p>

      {/* 알러지 빠른 사전 검색창 */}
      <div style={{ padding: 16, backgroundColor: '#fef2f2', borderRadius: 8, marginBottom: 24, border: '1px solid #fecaca' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#991b1b' }}>🚨 알러지 유발 성분 빠른 현장 대조</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={allergyCheckInput}
            onChange={(e) => setAllergyCheckInput(e.target.value)}
            placeholder="제공할 식음료 재료나 도포제 성분 입력 (예: 견과류, 라텍스, 복숭아)"
            style={{ flex: 1, padding: 8 }}
          />
          {allergyCheckInput && (
            <div style={{ alignSelf: 'center', fontSize: 13, color: '#b91c1c' }}>
              위험 고객:{' '}
              {items
                .filter((p) => hasAllergyRisk(p, allergyCheckInput))
                .map((p) => p.customerName)
                .join(', ') || '없음 (안전)'}
            </div>
          )}
        </div>
      </div>

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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>고객명</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="예: 홍길동 회장님"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>VIP 등급</label>
          <select
            value={vipTier}
            onChange={(e) => setVipTier(e.target.value as any)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="vvd">VVD (최고등급 의전)</option>
            <option value="diamond">Diamond</option>
            <option value="black">Black</option>
            <option value="standard_vip">일반 VIP</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>알러지 성분 (쉼표 구분)</label>
          <input
            type="text"
            value={allergiesInput}
            onChange={(e) => setAllergiesInput(e.target.value)}
            placeholder="예: 견과류, 라텍스, 꽃가루"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>식음료 선호 (쉼표 구분)</label>
          <input
            type="text"
            value={dietaryInput}
            onChange={(e) => setDietaryInput(e.target.value)}
            placeholder="예: 디카페인, 비건, 온음료"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>희망 실내온도 (℃)</label>
          <input
            type="number"
            value={roomTemp}
            onChange={(e) => setRoomTemp(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>선호 BGM / 음악</label>
          <input
            type="text"
            value={music}
            onChange={(e) => setMusic(e.target.value)}
            placeholder="예: 조용한 피아노 재즈"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>금지 대화 화제</label>
          <input
            type="text"
            value={doNotDiscuss}
            onChange={(e) => setDoNotDiscuss(e.target.value)}
            placeholder="예: 자녀 입시, 정치, 주식"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>전담 의전 지침 (Protocol Notes)</label>
          <input
            type="text"
            value={protocolNotes}
            onChange={(e) => setProtocolNotes(e.target.value)}
            placeholder="예: 도착 전 전용 룸 환기 및 실온수 비치, 점장 직접 인사"
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
            의전 노트 등록
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>고객명 / 등급</th>
              <th style={{ padding: 8 }}>알러지 주의</th>
              <th style={{ padding: 8 }}>추천 웰컴 드링크</th>
              <th style={{ padding: 8 }}>환경 설정(온도/음악)</th>
              <th style={{ padding: 8 }}>금지 화제</th>
              <th style={{ padding: 8 }}>의전 특이사항</th>
            </tr>
          </thead>
          <tbody>
            {items.map((profile) => (
              <tr key={profile.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, fontWeight: 500 }}>
                  {profile.customerName}{' '}
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                    }}
                  >
                    {profile.vipTier.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: 8 }}>
                  {profile.allergies.length > 0 ? (
                    profile.allergies.map((a) => (
                      <span
                        key={a}
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontSize: 11,
                          marginRight: 4,
                        }}
                      >
                        ⚠️ {a}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#999', fontSize: 12 }}>특이사항 없음</span>
                  )}
                </td>
                <td style={{ padding: 8, fontSize: 13, color: '#047857' }}>
                  🍵 {getRecommendedBeverage(profile)}
                </td>
                <td style={{ padding: 8, fontSize: 12 }}>
                  {profile.roomTemperaturePreference}℃ / {profile.musicGenrePreference}
                </td>
                <td style={{ padding: 8, fontSize: 12, color: '#dc2626' }}>
                  {profile.doNotDiscussTopics.join(', ') || '-'}
                </td>
                <td style={{ padding: 8, fontSize: 12 }}>{profile.protocolNotes}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 VIP 프로필이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

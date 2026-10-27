import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySentiment,
  calculateNpsSummary,
  filterUrgentFollowUps,
  renderNpsGaugeSvg,
  formatSurveyInvitationText,
  type SurveyResponseItem,
} from './npsSurveyEngine';

describe('nps_survey_collector - domain engine', () => {
  it('0~10점 점수에 따라 감정 카테고리를 정확히 분류한다', () => {
    assert.equal(classifySentiment(10), 'promoter');
    assert.equal(classifySentiment(9), 'promoter');
    assert.equal(classifySentiment(8), 'passive');
    assert.equal(classifySentiment(7), 'passive');
    assert.equal(classifySentiment(6), 'detractor');
    assert.equal(classifySentiment(0), 'detractor');
  });

  it('NPS 점수 및 세부 평점이 정확히 계산된다', () => {
    const responses: SurveyResponseItem[] = [
      {
        id: 'res-1',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 10,
        sentimentCategory: 'promoter',
        instructorRating: 5,
        facilityRating: 4,
        curriculumRating: 5,
        isAnonymous: true,
        actionStatus: 'unreviewed',
        createdAt: '2026-10-17T10:00:00Z',
      },
      {
        id: 'res-2',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 9,
        sentimentCategory: 'promoter',
        instructorRating: 5,
        facilityRating: 5,
        curriculumRating: 4,
        isAnonymous: true,
        actionStatus: 'unreviewed',
        createdAt: '2026-10-17T10:05:00Z',
      },
      {
        id: 'res-3',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 8,
        sentimentCategory: 'passive',
        instructorRating: 4,
        facilityRating: 3,
        curriculumRating: 4,
        isAnonymous: true,
        actionStatus: 'unreviewed',
        createdAt: '2026-10-17T10:10:00Z',
      },
      {
        id: 'res-4',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 4,
        sentimentCategory: 'detractor',
        instructorRating: 2,
        facilityRating: 2,
        curriculumRating: 3,
        isAnonymous: false,
        respondentName: '이영희',
        actionStatus: 'unreviewed',
        createdAt: '2026-10-17T10:15:00Z',
      },
    ];

    // total: 4, promoter: 2 (50%), passive: 1 (25%), detractor: 1 (25%) -> NPS = 50 - 25 = +25
    const summary = calculateNpsSummary(responses);
    assert.equal(summary.totalResponses, 4);
    assert.equal(summary.promoterCount, 2);
    assert.equal(summary.promoterPct, 50);
    assert.equal(summary.detractorCount, 1);
    assert.equal(summary.detractorPct, 25);
    assert.equal(summary.npsScore, 25);
    assert.equal(summary.avgInstructorRating, 4.0); // (5+5+4+2)/4 = 4.0
  });

  it('불만 고객(Detractor) 긴급 팔로업 대상만 정확히 추출한다', () => {
    const responses: SurveyResponseItem[] = [
      {
        id: 'res-1',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 4,
        sentimentCategory: 'detractor',
        isAnonymous: false,
        respondentName: '박철수',
        actionStatus: 'unreviewed',
        createdAt: '2026-10-17T10:00:00Z',
      },
      {
        id: 'res-2',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 3,
        sentimentCategory: 'detractor',
        isAnonymous: true, // 익명은 팔로업 불가
        actionStatus: 'unreviewed',
        createdAt: '2026-10-17T10:00:00Z',
      },
      {
        id: 'res-3',
        organizationId: 'org-1',
        campaignId: 'camp-1',
        npsScore: 4,
        sentimentCategory: 'detractor',
        isAnonymous: false,
        respondentName: '김영수',
        actionStatus: 'contacted', // 이미 상담 완료
        createdAt: '2026-10-17T10:00:00Z',
      },
    ];

    const urgent = filterUrgentFollowUps(responses);
    assert.equal(urgent.length, 1);
    assert.equal(urgent[0].respondentName, '박철수');
  });

  it('W3C SVG 차트 및 초대 텍스트 템플릿이 정상 생성된다', () => {
    const summary = calculateNpsSummary([]);
    const svg = renderNpsGaugeSvg(summary);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('NPS'));

    const invitation = formatSurveyInvitationText('2026년 가을학기 수업 만족도 설문', '모아 음악학원', 'camp-123');
    assert.ok(invitation.includes('모아 음악학원'));
    assert.ok(invitation.includes('https://moa.app/survey/camp-123'));
  });
});

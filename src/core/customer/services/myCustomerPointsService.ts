import { normalizeIndustryType } from '@/core/industry/types';
import { pointQueryService } from '@/core/loyalty';
import type { PointTransaction } from '@/core/loyalty';
import { customerLinkService } from './customerLinkService';

export type MyRetailPointsSnapshot = {
  organizationId: string;
  customerId: string;
  balance: number;
  recentEarns: PointTransaction[];
  recentRedeems: PointTransaction[];
};

const RECENT_LIMIT = 20;

/**
 * 일반 사용자 — 본인 Customer로 확인된 Retail 사업장 포인트만 조회.
 * 사업장 간 합산 없음. organizationId + customerId 동시 필터.
 */
export const myCustomerPointsService = {
  async getMyRetailPoints(params: {
    organizationId: string;
    customerId: string;
    industryType: string;
  }): Promise<MyRetailPointsSnapshot> {
    const organizationId = params.organizationId?.trim();
    const customerId = params.customerId?.trim();
    if (!organizationId || !customerId) {
      throw new Error('사업장·고객 정보가 필요합니다.');
    }
    if (normalizeIndustryType(params.industryType) !== 'retail') {
      throw new Error('소매 사업장에서만 포인트를 조회할 수 있습니다.');
    }

    // Customer 관계 재확인 (본인 user_id 연결만)
    const linked = await customerLinkService.findMyLinkedCustomer(organizationId);
    if (!linked || linked.id !== customerId) {
      throw new Error('연결된 고객 정보가 없거나 권한이 없습니다.');
    }

    const [balance, earns, redeems] = await Promise.all([
      pointQueryService.getBalance(organizationId, customerId),
      pointQueryService.listTransactions({
        organizationId,
        customerId,
        type: 'earn',
        limit: RECENT_LIMIT,
      }),
      pointQueryService.listTransactions({
        organizationId,
        customerId,
        type: 'redeem',
        limit: RECENT_LIMIT,
      }),
    ]);

    return {
      organizationId,
      customerId,
      balance,
      recentEarns: earns,
      recentRedeems: redeems,
    };
  },
};

/**
 * Platform 구독 조회. 결제 provider와 사업장 이용권 RPC를 호출하지 않는다.
 */
import { getPlatformClient } from '@/lib/supabase/platformClient';
import type { Database } from '@/lib/supabase/database.types';

type IsFeatureEnabledArgs = Database['platform']['Functions']['is_feature_enabled']['Args'];

export const platformSubscriptionService = {
  async isEnabled(
    organizationId: IsFeatureEnabledArgs['p_organization_id'],
    featureKey: IsFeatureEnabledArgs['p_feature_key']
  ): Promise<boolean> {
    const { data, error } = await getPlatformClient().rpc('is_feature_enabled', {
      p_organization_id: organizationId,
      p_feature_key: featureKey,
    });
    if (error) throw error;
    return Boolean(data);
  },
};

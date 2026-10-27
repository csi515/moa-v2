import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { PromotionalDeal } from '../domain/promoEngine';

export const promotionalDealService = {
  async listActiveDeals(tenantId: string): Promise<PromotionalDeal[]> {
    if (!isSupabaseConfigured() || !tenantId) return [];
    try {
      const { data, error } = await getCoreClient()
        .from('promotional_deals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      if (error) return [];
      return ((data as unknown) as PromotionalDeal[]) ?? [];
    } catch {
      return [];
    }
  },
};

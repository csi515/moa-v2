import { IndustryAdapter } from '@/core/industry/IndustryAdapter';
import type { ParentPluginManifest } from '@/core/industry/manifests/parentManifest';

export interface ParentPortalPolicy {
  showPickupFields: boolean;
  showsPracticeRoomTab: boolean;
  showsCustomerPoints: boolean;
}

export class ParentIndustryAdapter {
  static getPolicy(): ParentPortalPolicy {
    const parentManifest = IndustryAdapter.getManifest('parentCopy' as any) as ParentPluginManifest | undefined;
    const ctx = IndustryAdapter.getContext();

    return {
      showPickupFields: Boolean(parentManifest?.showPickupFields ?? ctx.plugin.showPickupFields),
      showsPracticeRoomTab: Boolean(parentManifest?.showsPracticeRoomTab ?? ctx.plugin.showsPracticeRoomTab),
      showsCustomerPoints: Boolean(parentManifest?.showsCustomerPoints ?? ctx.plugin.showsCustomerPoints),
    };
  }
}

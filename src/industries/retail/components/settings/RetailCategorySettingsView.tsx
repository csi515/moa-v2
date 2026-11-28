import { type FC } from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { PageHeader } from '@/shared/components';
import { Button } from '@/shared/components/ui';
import { DESKTOP_CONTAINERS } from '@/shared/styles/density';
import { cn } from '@/shared/lib/utils';
import { ProductCategoryEditor } from '../products/ProductCategoryManageModal';
import { PRODUCT_LIST_COPY as PRODUCT_COPY } from '../products/productListCopy';
import { RETAIL_POINTS_COPY as COPY } from './retailPointsCopy';

interface Props {
  onBack: () => void;
}

export const RetailCategorySettingsView: FC<Props> = ({ onBack }) => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return (
    <div className={cn(DESKTOP_CONTAINERS.form, 'space-y-4 pb-8')}>
      <PageHeader
        density="compact"
        icon={<FolderOpen className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.menuProductCategories}
        description={PRODUCT_COPY.categoryManageHint}
        actions={
          <Button type="button" variant="ghost" size="default" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {COPY.back}
          </Button>
        }
      />

      {orgId ? (
        <ProductCategoryEditor
          organizationId={orgId}
          onError={(message) => showToast(message, 'error')}
          onToast={showToast}
        />
      ) : (
        <p className="text-sm text-slate-500">{COPY.noOrg}</p>
      )}
    </div>
  );
};

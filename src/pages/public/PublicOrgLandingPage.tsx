import React from 'react';
import { useParams } from 'react-router-dom';
import { PublicOrgLanding } from '@/core/public/PublicOrgLanding';

interface PublicOrgLandingPageProps {
  mode?: 'default' | 'consultation';
}

export const PublicOrgLandingPage: React.FC<PublicOrgLandingPageProps> = ({ mode = 'default' }) => {
  const { code } = useParams<{ code: string }>();
  return <PublicOrgLanding code={code || ''} mode={mode} />;
};

export default PublicOrgLandingPage;

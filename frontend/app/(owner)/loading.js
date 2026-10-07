// frontend/app/(owner)/loading.js
'use client';

import LoadingScreen from '../../components/ui/LoadingScreen';

export default function OwnerPortalLoading() {
  return (
    <LoadingScreen
      message="Loading Fleet Operations..."
      subMessage="Connecting to live dispatch network, vehicles, and real-time bilties"
      fullScreen={true}
    />
  );
}

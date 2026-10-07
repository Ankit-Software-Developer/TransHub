// frontend/app/loading.js
'use client';

import LoadingScreen from '../components/ui/LoadingScreen';

export default function RootLoading() {
  return (
    <LoadingScreen
      message="Loading TransHub Logistics..."
      subMessage="Synchronizing transportation network and real-time operations"
      fullScreen={true}
    />
  );
}

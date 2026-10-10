// frontend/app/(owner)/users/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingState from '../../../components/ui/LoadingState';

export default function UsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/staff');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#06080F]">
      <LoadingState
        title="Redirecting to Staff Management..."
        description="Transporter staff directory has been separated into dedicated /staff workspace."
        minHeight="min-h-[220px]"
      />
    </div>
  );
}

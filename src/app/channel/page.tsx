'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChannelIndexPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        if (data.channels && data.channels.length > 0) {
          router.replace(`/channel/${data.channels[0].id}`);
        }
      }
    }
    redirect();
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-[#1a1d21]">
      <div className="w-8 h-8 border-2 border-[#4A154B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

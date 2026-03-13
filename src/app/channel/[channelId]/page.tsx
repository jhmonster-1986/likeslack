'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Channel } from '@/types';
import ChatArea from '@/components/Chat/ChatArea';

export default function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = use(params);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchChannel() {
      setLoading(true);
      const res = await fetch(`/api/channels/${channelId}`);
      if (res.ok) {
        const data = await res.json();
        setChannel(data.channel);
      } else {
        router.push('/login');
      }
      setLoading(false);
    }
    fetchChannel();
  }, [channelId, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1d21]">
        <div className="w-8 h-8 border-2 border-[#4A154B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!channel) return null;

  return (
    <ChatArea
      channelId={channel.id}
      title={channel.name}
      description={channel.description || undefined}
      isPrivate={channel.isPrivate}
    />
  );
}

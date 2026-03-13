'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { DMChannel } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import ChatArea from '@/components/Chat/ChatArea';

export default function DMPage({ params }: { params: Promise<{ dmId: string }> }) {
  const { dmId } = use(params);
  const { user } = useAuth();
  const [dmChannel, setDmChannel] = useState<DMChannel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDM() {
      const res = await fetch('/api/dm');
      if (res.ok) {
        const data = await res.json();
        const found = data.dmChannels.find((dm: DMChannel) => dm.id === dmId);
        setDmChannel(found || null);
      }
      setLoading(false);
    }
    fetchDM();
  }, [dmId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1d21]">
        <div className="w-8 h-8 border-2 border-[#4A154B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dmChannel) return null;

  const otherUser = dmChannel.members.find((m) => m.user.id !== user?.id)?.user;

  return (
    <ChatArea
      dmChannelId={dmChannel.id}
      title={otherUser?.name || 'Direct Message'}
      isDM
    />
  );
}

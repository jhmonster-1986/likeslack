'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import { X } from 'lucide-react';

interface ThreadPanelProps {
  parentMessage: Message;
  channelId?: string;
  dmChannelId?: string;
  onClose: () => void;
}

export default function ThreadPanel({ parentMessage, channelId, dmChannelId, onClose }: ThreadPanelProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [parent, setParent] = useState<Message>(parentMessage);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThread();
  }, [parentMessage.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  async function fetchThread() {
    setLoading(true);
    const res = await fetch(`/api/messages/${parentMessage.id}/threads`);
    if (res.ok) {
      const data = await res.json();
      setParent(data.parent);
      setReplies(data.replies);
    }
    setLoading(false);
  }

  useSocket({
    channelId,
    dmChannelId,
    userId: user?.id,
    userName: user?.name,
    onThreadReply: (data) => {
      if (data.parentId === parentMessage.id) {
        setReplies((prev) => [...prev, data.reply as Message]);
      }
    },
    onUserTyping: (data) => {
      if (data.userName !== user?.name) {
        setTypingUsers((prev) => [...new Set([...prev, data.userName])]);
      }
    },
    onUserStopTyping: (data) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.userName));
    },
  });

  return (
    <div className="w-96 border-l border-white/10 flex flex-col bg-[#1a1d21] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-semibold">Thread</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {/* Parent message */}
        <div className="border-b border-white/5 pb-4 mb-2">
          <MessageItem
            message={parent}
            channelId={channelId}
            dmChannelId={dmChannelId}
            isThreadReply
            onUpdate={(msg) => setParent(msg)}
            onDelete={() => onClose()}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#4A154B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {replies.map((reply) => (
              <MessageItem
                key={reply.id}
                message={reply}
                channelId={channelId}
                dmChannelId={dmChannelId}
                isThreadReply
                onDelete={(id) => setReplies((prev) => prev.filter((r) => r.id !== id))}
                onUpdate={(msg) => setReplies((prev) => prev.map((r) => r.id === msg.id ? msg : r))}
              />
            ))}
            {replies.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-4">No replies yet</p>
            )}
          </>
        )}

        {typingUsers.length > 0 && (
          <p className="text-gray-400 text-xs px-4">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply Input */}
      <MessageInput
        placeholder="Reply..."
        channelId={channelId}
        dmChannelId={dmChannelId}
        parentId={parentMessage.id}
        onMessageSent={(msg) => {
          setReplies((prev) => [...prev, msg as Message]);
        }}
      />
    </div>
  );
}

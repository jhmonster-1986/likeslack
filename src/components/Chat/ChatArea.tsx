'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import { Hash, Lock } from 'lucide-react';

interface ChatAreaProps {
  channelId?: string;
  dmChannelId?: string;
  title: string;
  description?: string;
  isPrivate?: boolean;
  isDM?: boolean;
}

export default function ChatArea({
  channelId,
  dmChannelId,
  title,
  description,
  isPrivate,
  isDM,
}: ChatAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const params = channelId ? `channelId=${channelId}` : `dmChannelId=${dmChannelId}`;
    const res = await fetch(`/api/messages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    setLoading(false);
  }, [channelId, dmChannelId]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setActiveThread(null);
    fetchMessages();
  }, [channelId, dmChannelId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useSocket({
    channelId,
    dmChannelId,
    userId: user?.id,
    userName: user?.name,
    onNewMessage: (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    onMessageUpdated: (msg) => {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
    },
    onMessageDeleted: ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    onReactionUpdated: ({ messageId, reaction }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, reactions: reaction as Message['reactions'] } : m)
      );
    },
    onThreadReply: ({ parentId }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === parentId
          ? { ...m, _count: { replies: (m._count?.replies || 0) + 1 } }
          : m
        )
      );
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

  const handleMessageSent = (msg: unknown) => {
    setMessages((prev) => {
      const message = msg as Message;
      if (prev.find((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  };

  const handleDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleUpdate = (updatedMsg: Message) => {
    setMessages((prev) => prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m));
  };

  const handleReactionUpdate = (messageId: string, reactions: Message['reactions']) => {
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, reactions } : m)
    );
  };

  const groupedMessages = messages.reduce((groups: { date: string; messages: Message[] }[], msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
    return groups;
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#1a1d21]">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            {isDM ? null : isPrivate ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : (
              <Hash className="w-4 h-4 text-gray-400" />
            )}
            <span>{title}</span>
          </div>
          {description && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-gray-400 text-sm truncate">{description}</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-[#4A154B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#4A154B] flex items-center justify-center mb-4">
                    {isDM ? (
                      <span className="text-3xl">💬</span>
                    ) : (
                      <Hash className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-2">
                    {isDM ? `Start a conversation with ${title}` : `Welcome to #${title}!`}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {isDM
                      ? 'This is the beginning of your direct message history.'
                      : description || 'This is the beginning of the channel.'}
                  </p>
                </div>
              )}

              {groupedMessages.map(({ date, messages: dayMessages }) => (
                <div key={date}>
                  <div className="flex items-center gap-3 px-4 my-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-gray-500 text-xs font-medium px-2">{date}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="space-y-0.5">
                    {dayMessages.map((msg) => (
                      <MessageItem
                        key={msg.id}
                        message={msg}
                        channelId={channelId}
                        dmChannelId={dmChannelId}
                        onThreadOpen={setActiveThread}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onReactionUpdate={handleReactionUpdate}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {typingUsers.length > 0 && (
                <div className="px-4 py-1">
                  <span className="text-gray-400 text-xs">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                    <span className="inline-flex gap-0.5 ml-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <MessageInput
          placeholder={isDM ? `Message ${title}` : `Message #${title}`}
          channelId={channelId}
          dmChannelId={dmChannelId}
          onMessageSent={handleMessageSent}
        />
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <ThreadPanel
          parentMessage={activeThread}
          channelId={channelId}
          dmChannelId={dmChannelId}
          onClose={() => setActiveThread(null)}
        />
      )}
    </div>
  );
}

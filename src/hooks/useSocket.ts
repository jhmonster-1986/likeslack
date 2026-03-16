'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket-client';
import { Message } from '@/types';

interface UseSocketOptions {
  channelId?: string;
  dmChannelId?: string;
  userId?: string;
  userName?: string;
  onNewMessage?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (data: { messageId: string }) => void;
  onReactionUpdated?: (data: { messageId: string; reaction: unknown }) => void;
  onThreadReply?: (data: { parentId: string; reply: Message }) => void;
  onUserTyping?: (data: { userName: string }) => void;
  onUserStopTyping?: (data: { userName: string }) => void;
  onUserStatus?: (data: { userId: string; status: string }) => void;
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    if (options.userId && options.userName) {
      socket.emit('user-connect', { userId: options.userId, userName: options.userName });
    }

    if (options.channelId) {
      socket.emit('join-channel', options.channelId);
    }
    if (options.dmChannelId) {
      socket.emit('join-dm', options.dmChannelId);
    }

    if (options.onNewMessage) socket.on('new-message', options.onNewMessage);
    if (options.onMessageUpdated) socket.on('message-updated', options.onMessageUpdated);
    if (options.onMessageDeleted) socket.on('message-deleted', options.onMessageDeleted);
    if (options.onReactionUpdated) socket.on('reaction-updated', options.onReactionUpdated);
    if (options.onThreadReply) socket.on('thread-reply', options.onThreadReply);
    if (options.onUserTyping) socket.on('user-typing', options.onUserTyping);
    if (options.onUserStopTyping) socket.on('user-stop-typing', options.onUserStopTyping);
    if (options.onUserStatus) socket.on('user-status', options.onUserStatus);

    return () => {
      if (options.channelId) socket.emit('leave-channel', options.channelId);
      socket.off('new-message');
      socket.off('message-updated');
      socket.off('message-deleted');
      socket.off('reaction-updated');
      socket.off('thread-reply');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('user-status');
    };
  }, [options.channelId, options.dmChannelId]);

  return socketRef.current;
}

'use client';

import { useState } from 'react';
import { Message } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket-client';
import {
  Smile, MessageSquare, Pencil, Trash2, Check, X
} from 'lucide-react';
import Image from 'next/image';

const QUICK_EMOJIS = ['👍', '❤️', '😄', '🎉', '🚀', '👀', '✅', '💯'];

interface MessageItemProps {
  message: Message;
  channelId?: string;
  dmChannelId?: string;
  onThreadOpen?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onUpdate?: (message: Message) => void;
  onReactionUpdate?: (messageId: string, reactions: Message['reactions']) => void;
  isThreadReply?: boolean;
}

export default function MessageItem({
  message,
  channelId,
  dmChannelId,
  onThreadOpen,
  onDelete,
  onUpdate,
  onReactionUpdate,
  isThreadReply = false,
}: MessageItemProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [saving, setSaving] = useState(false);

  const socket = getSocket();
  const isOwner = user?.id === message.userId;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const groupedReactions = message.reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, typeof message.reactions>);

  async function handleReaction(emoji: string) {
    setShowEmojiPicker(false);
    const res = await fetch(`/api/messages/${message.id}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      // Refresh reactions
      const msgRes = await fetch(`/api/messages?${channelId ? `channelId=${channelId}` : `dmChannelId=${dmChannelId}`}`);
      if (msgRes.ok) {
        const data = await msgRes.json();
        const updated = data.messages.find((m: Message) => m.id === message.id);
        if (updated) {
          onReactionUpdate?.(message.id, updated.reactions);
          socket.emit('add-reaction', {
            messageId: message.id,
            reaction: updated.reactions,
            channelId,
            dmChannelId,
          });
        }
      }
    }
  }

  async function handleEdit() {
    if (!editContent.trim() || editContent === message.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/messages/${message.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate?.(data.message);
      socket.emit('edit-message', { ...data.message, channelId, dmChannelId });
    }
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this message?')) return;
    const res = await fetch(`/api/messages/${message.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete?.(message.id);
      socket.emit('delete-message', { messageId: message.id, channelId, dmChannelId });
    }
  }

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div
      className="group flex gap-3 px-4 py-1 hover:bg-white/[0.03] rounded-lg relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-lg bg-[#4A154B] flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold mt-0.5">
        {message.user.name[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-white font-semibold text-sm">{message.user.name}</span>
          <span className="text-gray-500 text-xs">{formatTime(message.createdAt)}</span>
          {message.updatedAt !== message.createdAt && (
            <span className="text-gray-600 text-xs">(edited)</span>
          )}
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-[#1a1d21] border border-white/20 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#4A154B]"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                if (e.key === 'Escape') { setEditing(false); setEditContent(message.content); }
              }}
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
              >
                <Check className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(message.content); }}
                className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white text-xs rounded transition-colors"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Files */}
        {message.files && message.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.files.map((file) => (
              <div key={file.id}>
                {isImage(file.type) ? (
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={file.url}
                      alt={file.name}
                      width={300}
                      height={200}
                      className="max-w-xs max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#1a1d21] border border-white/10 rounded-lg px-3 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    📎 {file.name}
                    <span className="text-gray-500 text-xs">({Math.round(file.size / 1024)}KB)</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.entries(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => {
              const hasReacted = reactions.some((r) => r.userId === user?.id);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                    hasReacted
                      ? 'bg-[#1164A3]/30 border-[#1164A3] text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{reactions.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread count */}
        {!isThreadReply && message._count && message._count.replies > 0 && (
          <button
            onClick={() => onThreadOpen?.(message)}
            className="flex items-center gap-1 mt-1 text-[#1d9bd1] hover:text-[#1d9bd1]/80 text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {message._count.replies} {message._count.replies === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && !editing && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 bg-[#222529] border border-white/10 rounded-lg p-1 shadow-lg z-10">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Add reaction"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 top-8 bg-[#1a1d21] border border-white/10 rounded-lg p-2 shadow-xl z-20 flex flex-wrap gap-1 w-40">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isThreadReply && (
            <button
              onClick={() => onThreadOpen?.(message)}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Reply in thread"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          {isOwner && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Edit message"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

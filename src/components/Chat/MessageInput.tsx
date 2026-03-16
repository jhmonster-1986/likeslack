'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket-client';
import { Paperclip, Send, X } from 'lucide-react';

interface MessageInputProps {
  placeholder: string;
  channelId?: string;
  dmChannelId?: string;
  parentId?: string;
  onMessageSent: (message: unknown) => void;
}

export default function MessageInput({
  placeholder,
  channelId,
  dmChannelId,
  parentId,
  onMessageSent,
}: MessageInputProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socket = getSocket();

  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing-start', { channelId, dmChannelId, userName: user?.name });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { channelId, dmChannelId, userName: user?.name });
    }, 2000);
  }, [channelId, dmChannelId, user?.name, socket]);

  async function handleSend() {
    if (!content.trim() && files.length === 0) return;
    setSending(true);

    try {
      let fileIds: string[] = [];

      if (files.length > 0) {
        setUploading(true);
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileIds = uploadData.files.map((f: { id: string }) => f.id);
        }
        setUploading(false);
      }

      const url = parentId
        ? `/api/messages/${parentId}/threads`
        : '/api/messages';

      const body = parentId
        ? { content }
        : { content, channelId, dmChannelId, fileIds };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const msg = data.message || data.reply;
        onMessageSent(msg);

        if (!parentId) {
          socket.emit('send-message', { ...msg, channelId, dmChannelId });
        } else {
          socket.emit('new-thread-reply', {
            parentId,
            reply: msg,
            channelId,
            dmChannelId,
          });
        }

        setContent('');
        setFiles([]);
      }
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    handleTyping();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="px-4 pb-4">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-3">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[#1a1d21] border border-white/10 rounded-lg px-3 py-1.5 text-sm"
            >
              <span className="text-gray-300 truncate max-w-xs">{file.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#222529] border border-white/10 rounded-xl overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 text-sm resize-none focus:outline-none"
          style={{ minHeight: '44px', maxHeight: '200px' }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={sending || (!content.trim() && files.length === 0)}
            className="flex items-center gap-1.5 bg-[#4A154B] hover:bg-[#611f63] disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

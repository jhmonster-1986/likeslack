'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Channel, User, DMChannel } from '@/types';
import {
  Hash, Plus, ChevronDown, ChevronRight, MessageSquare,
  Settings, LogOut, Circle
} from 'lucide-react';

interface SidebarProps {
  onChannelSelect?: () => void;
}

export default function Sidebar({ onChannelSelect }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchChannels();
    fetchDMs();
    fetchUsers();
  }, []);

  async function fetchChannels() {
    const res = await fetch('/api/channels');
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels);
    }
  }

  async function fetchDMs() {
    const res = await fetch('/api/dm');
    if (res.ok) {
      const data = await res.json();
      setDmChannels(data.dmChannels);
    }
  }

  async function fetchUsers() {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName, description: newChannelDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        setChannels((prev) => [...prev, data.channel]);
        setShowCreateChannel(false);
        setNewChannelName('');
        setNewChannelDesc('');
        router.push(`/channel/${data.channel.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function startDM(targetUserId: string) {
    const res = await fetch('/api/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowNewDm(false);
      await fetchDMs();
      router.push(`/dm/${data.dmChannel.id}`);
      onChannelSelect?.();
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  function getDMOtherUser(dm: DMChannel) {
    return dm.members.find((m) => m.user.id !== user?.id)?.user;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'away': return 'text-yellow-400';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="w-60 bg-[#3F0E40] flex flex-col h-full">
      {/* Workspace Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">LikeSlack</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/60 hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Channels Section */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="mb-2">
          <button
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="w-full flex items-center gap-1 px-3 py-1 text-white/70 hover:text-white text-sm font-semibold"
          >
            {channelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Channels
          </button>

          {channelsOpen && (
            <div className="mt-1">
              {channels.map((channel) => {
                const isActive = pathname === `/channel/${channel.id}`;
                return (
                  <Link
                    key={channel.id}
                    href={`/channel/${channel.id}`}
                    onClick={onChannelSelect}
                    className={`flex items-center gap-2 px-4 py-1 text-sm rounded mx-1 transition-colors ${
                      isActive
                        ? 'bg-[#1164A3] text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => setShowCreateChannel(true)}
                className="flex items-center gap-2 px-4 py-1 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded mx-1 w-full transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add channels
              </button>
            </div>
          )}
        </div>

        {/* DM Section */}
        <div className="mb-2">
          <button
            onClick={() => setDmsOpen(!dmsOpen)}
            className="w-full flex items-center gap-1 px-3 py-1 text-white/70 hover:text-white text-sm font-semibold"
          >
            {dmsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Direct Messages
          </button>

          {dmsOpen && (
            <div className="mt-1">
              {dmChannels.map((dm) => {
                const otherUser = getDMOtherUser(dm);
                if (!otherUser) return null;
                const isActive = pathname === `/dm/${dm.id}`;
                return (
                  <Link
                    key={dm.id}
                    href={`/dm/${dm.id}`}
                    onClick={onChannelSelect}
                    className={`flex items-center gap-2 px-4 py-1 text-sm rounded mx-1 transition-colors ${
                      isActive
                        ? 'bg-[#1164A3] text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Circle
                      className={`w-2.5 h-2.5 flex-shrink-0 fill-current ${getStatusColor(otherUser.status)}`}
                    />
                    <span className="truncate">{otherUser.name}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => setShowNewDm(true)}
                className="flex items-center gap-2 px-4 py-1 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded mx-1 w-full transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Footer */}
      {user && (
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-[#611f63] flex items-center justify-center text-white text-sm font-semibold">
              {user.name[0].toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#3F0E40]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-white/50 text-xs">Active</p>
          </div>
          <button className="text-white/50 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#222529] rounded-xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-white text-lg font-semibold mb-4">Create a channel</h2>
            <form onSubmit={createChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-[#1a1d21] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A154B]"
                  placeholder="e.g. design"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full bg-[#1a1d21] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4A154B]"
                  placeholder="What's this channel about?"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newChannelName.trim()}
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#611f63] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewDm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#222529] rounded-xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-white text-lg font-semibold mb-4">New direct message</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDM(u.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center text-white text-sm font-semibold">
                      {u.name[0].toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#222529] ${
                      u.status === 'online' ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{u.name}</p>
                    <p className="text-gray-400 text-xs">{u.status}</p>
                  </div>
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No other users yet</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowNewDm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

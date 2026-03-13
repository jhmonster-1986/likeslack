export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  status: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  isPrivate: boolean;
  createdAt: string;
  ownerId: string;
  owner?: User;
  _count?: { members: number; messages: number };
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: User;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  channelId?: string | null;
  dmChannelId?: string | null;
  parentId?: string | null;
  user: User;
  reactions: Reaction[];
  files: FileAttachment[];
  replies?: Message[];
  _count?: { replies: number };
}

export interface DMChannel {
  id: string;
  createdAt: string;
  members: { user: User }[];
}

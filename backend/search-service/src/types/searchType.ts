export interface SearchFilters {
  startDate?: Date;
  endDate?: Date;
  hasMedia?: boolean;
  senderId?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  senderId?: string;
  createdAt: Date;
  type: 'message' | 'user' | 'group' | 'channel';
  metadata?: any;
}

export interface SearchResponse {
  type: string;
  results: SearchResult[];
  totalCount?: number;
}

import type { BookProgressRecord } from './book';

export interface DeviceRecord {
  device_id: string;
  user_id: number;
  name: string;
  last_seen_at: string;
  created_at: string;
  book_count: number;
}

export interface DeviceBookRecord extends BookProgressRecord {
  available: boolean;
}

export type UserReadingStatus = 'added' | 'on-going' | 'pause' | 'finished';

export interface UserReadingList {
  readingID: string;
  userID: string;
  bookTitle: string;
  bookAuthor: string;
  lastPageRead: string | null;
  readingStatus?: UserReadingStatus;
  dateAdded: number;
  lastUpdated?: number;
  dateFinished: number | null;
}

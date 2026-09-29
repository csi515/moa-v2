import type {
  AttendanceRecord,
  AcademyEvent,
  Expense,
  LessonRecord,
  PerformanceVideo,
  PracticeRecord,
  Song,
  Student,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookSale,
} from '../../../../types';
import type {
  Json,
  PaymentMethod as DbPaymentMethod,
  PianoAttendanceStatus,
  PianoInventoryTransactionType,
  PianoTextbookPaymentStatus,
} from '../../../../lib/supabase/database.types';


// ─── Songs ────────────────────────────────────────────────────────

interface SongMetadata {
  publisher?: string;
  level?: string;
  resourceType?: Song['resourceType'];
  description?: string;
  difficultyStars?: number;
}

function songMetadata(song: Song): Json {
  const meta: SongMetadata = {
    publisher: song.publisher,
    level: song.level,
    resourceType: song.resourceType,
    description: song.description,
    difficultyStars: song.difficultyStars,
  };
  return meta as Json;
}

export function songToPianoRow(song: Song, organizationId: string) {
  return {
    id: song.id,
    organization_id: organizationId,
    title: song.title,
    composer: song.composer,
    difficulty: song.difficulty,
    genre: song.genre,
    related_textbook: song.relatedTextbook || null,
    memo: song.memo || null,
    metadata: songMetadata(song),
  };
}

export function pianoRowToSong(row: {
  id: string;
  title: string;
  composer: string;
  difficulty: string;
  genre: string;
  related_textbook: string | null;
  memo: string | null;
  metadata: Json;
}): Song {
  const meta = (row.metadata || {}) as SongMetadata;
  return {
    id: row.id,
    title: row.title,
    composer: row.composer,
    difficulty: row.difficulty as Song['difficulty'],
    genre: row.genre as Song['genre'],
    relatedTextbook: row.related_textbook || undefined,
    memo: row.memo || undefined,
    publisher: meta.publisher,
    level: meta.level as Song['level'],
    resourceType: meta.resourceType,
    description: meta.description,
    difficultyStars: meta.difficultyStars,
  };
}


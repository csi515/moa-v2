/**
 * Student Song Wishlist & Genre Helpers
 *
 * 음악/예체능 원생이 흥미를 잃지 않도록 정규 진도와 병행할
 * 관심 장르(지브리, 디즈니, K-POP 등)와 배우고 싶은 위시리스트 곡을 관리하는 범용 도메인 헬퍼.
 */

export interface StudentGenrePreset {
  id: string;
  label: string;
  emoji: string;
}

/** 대표 선호 장르 6선 */
export const STUDENT_GENRE_PRESETS: readonly StudentGenrePreset[] = [
  { id: 'ghibli', label: '지브리/애니', emoji: '🍃' },
  { id: 'disney', label: '디즈니 OST', emoji: '🏰' },
  { id: 'kpop', label: 'K-POP 가요', emoji: '🎵' },
  { id: 'classic', label: '클래식 명곡', emoji: '🎹' },
  { id: 'newage', label: '뉴에이지/재즈', emoji: '☕' },
  { id: 'ost', label: '영화/드라마 OST', emoji: '🎬' },
] as const;

/** 피아노 하위 호환 별칭 */
export const PIANO_GENRE_PRESETS = STUDENT_GENRE_PRESETS;
export type PianoGenrePreset = StudentGenrePreset;

/**
 * 장르 선택 토글 헬퍼 (다중 선택 지원)
 */
export function toggleGenreSelection(currentGenres: string[], genreToToggle: string): string[] {
  if (currentGenres.includes(genreToToggle)) {
    return currentGenres.filter((g) => g !== genreToToggle);
  }
  return [...currentGenres, genreToToggle];
}

/**
 * 쉼표, 줄바꿈 또는 슬래시로 구분된 위시리스트 문자열을 정제된 배열로 파싱
 */
export function parseWishlistSongs(raw: string | string[] | undefined | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return raw
    .split(/[,/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 원생 객체로부터 관심 장르와 위시리스트 곡을 안전하게 추출
 */
export function extractWishlistFromStudent(student: { metadata?: Record<string, unknown> } | null | undefined): { genres: string[]; songs: string[] } {
  if (!student) return { genres: [], songs: [] };

  const meta = student.metadata || {};
  const genres: string[] = Array.isArray(meta.preferredGenres)
    ? meta.preferredGenres
    : [];

  const songs: string[] = Array.isArray(meta.wishlistSongs)
    ? meta.wishlistSongs
    : parseWishlistSongs(typeof meta.wishlistSongs === 'string' ? meta.wishlistSongs : '');

  return { genres, songs };
}

/**
 * 기존 원생 metadata에 선호 장르와 위시리스트 곡을 안전하게 병합
 */
export function mergeWishlistIntoMetadata(
  existingMetadata: Record<string, unknown> | undefined | null,
  genres: string[],
  songs: string[] | string
): Record<string, unknown> {
  const base = existingMetadata ? { ...existingMetadata } : {};
  const cleanSongs = Array.isArray(songs) ? songs : parseWishlistSongs(songs);

  return {
    ...base,
    preferredGenres: genres,
    wishlistSongs: cleanSongs,
  };
}

/**
 * 선생님/원장님용 1초 요약 텍스트 생성
 */
export function formatWishlistSummary(genres: string[], songs: string[]): string {
  if (genres.length === 0 && songs.length === 0) {
    return '등록된 희망 곡 없음';
  }
  const genrePart = genres.length > 0 ? genres.join(' · ') : '';
  const songPart =
    songs.length > 0
      ? `"${songs.slice(0, 2).join('", "')}"${songs.length > 2 ? ` 외 ${songs.length - 2}곡` : ''}`
      : '';

  if (genrePart && songPart) return `${genrePart} | ${songPart}`;
  return genrePart || songPart;
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIANO_GENRE_PRESETS,
  toggleGenreSelection,
  parseWishlistSongs,
  extractWishlistFromStudent,
  mergeWishlistIntoMetadata,
  formatWishlistSummary,
} from './pianoWishlistHelpers';

describe('pianoWishlistHelpers', () => {
  it('피아노 대표 장르 프리셋 6종이 정의되어 있어야 한다', () => {
    assert.equal(PIANO_GENRE_PRESETS.length, 6);
    assert.deepEqual(
      PIANO_GENRE_PRESETS.map((p) => p.id),
      ['ghibli', 'disney', 'kpop', 'classic', 'newage', 'ost']
    );
  });

  it('toggleGenreSelection: 새 장르는 추가되고 이미 선택된 장르는 제거되어야 한다', () => {
    const s1 = toggleGenreSelection([], '지브리/애니');
    assert.deepEqual(s1, ['지브리/애니']);

    const s2 = toggleGenreSelection(s1, '디즈니 OST');
    assert.deepEqual(s2, ['지브리/애니', '디즈니 OST']);

    const s3 = toggleGenreSelection(s2, '지브리/애니');
    assert.deepEqual(s3, ['디즈니 OST']);
  });

  it('parseWishlistSongs: 쉼표, 줄바꿈, 슬래시가 섞인 문자열을 깔끔한 곡명 배열로 파싱해야 한다', () => {
    const raw = '인생의 회전목마, 언제나 몇 번이라도\n작은 별 변주곡 / 캐논 변주곡';
    const parsed = parseWishlistSongs(raw);
    assert.deepEqual(parsed, [
      '인생의 회전목마',
      '언제나 몇 번이라도',
      '작은 별 변주곡',
      '캐논 변주곡',
    ]);
  });

  it('extractWishlistFromStudent & mergeWishlistIntoMetadata: 메타데이터와 양방향 동기화가 완벽해야 한다', () => {
    const student = {
      id: 's-1',
      name: '김하은',
      metadata: {
        preferredGenres: ['지브리/애니'],
        wishlistSongs: ['언제나 몇 번이라도'],
        otherField: 123,
      },
    };

    const extracted = extractWishlistFromStudent(student);
    assert.deepEqual(extracted.genres, ['지브리/애니']);
    assert.deepEqual(extracted.songs, ['언제나 몇 번이라도']);

    const merged = mergeWishlistIntoMetadata(student.metadata, ['K-POP 가요', '디즈니 OST'], 'Supernova, Let it go');
    assert.deepEqual(merged.preferredGenres, ['K-POP 가요', '디즈니 OST']);
    assert.deepEqual(merged.wishlistSongs, ['Supernova', 'Let it go']);
    assert.equal(merged.otherField, 123); // 기존 메타 보존
  });

  it('formatWishlistSummary: 요약 텍스트를 직관적으로 생성해야 한다', () => {
    assert.equal(formatWishlistSummary([], []), '등록된 희망 곡 없음');
    assert.equal(formatWishlistSummary(['지브리/애니'], []), '지브리/애니');
    assert.equal(
      formatWishlistSummary(['지브리/애니', '디즈니'], ['인생의 회전목마', 'Let It Go', '언제나 몇 번이라도']),
      '지브리/애니 · 디즈니 | "인생의 회전목마", "Let It Go" 외 1곡'
    );
  });
});

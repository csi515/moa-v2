import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { PageHeader, FilterBar, SearchField } from '@/shared/components';
import type { Song } from '@/core/lessons/types';
import type { PianoStudentLevel } from '@/industries/piano/types/studentLevel';
import { isPianoStudentLevel, PIANO_STUDENT_LEVELS } from '@/industries/piano/types/studentLevel';
import { getLevelColor } from '@/utils/formatters';
import {
  Music2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

/**
 * 곡·교재 자료 카탈로그 (Song / resourceType).
 * 판매·재고용 「교재 관리」(textbooks)와는 별 도메인 — UI는 nav에서 숨김, 데이터·VIEW_MAP 유지.
 */
type ResourceType = NonNullable<Song['resourceType']>;

interface PianoResource {
  id: string;
  title: string;
  composer?: string;
  publisher?: string;
  level: PianoStudentLevel;
  type: ResourceType;
  description?: string;
  difficultyStars: number;
}

function starsToDifficulty(stars: number): Song['difficulty'] {
  if (stars <= 2) return '초급';
  if (stars === 3) return '중급';
  if (stars === 4) return '고급';
  return '최고급';
}

function difficultyToStars(difficulty: Song['difficulty']): number {
  const map: Record<Song['difficulty'], number> = {
    초급: 2,
    중급: 3,
    고급: 4,
    최고급: 5,
  };
  return map[difficulty] ?? 3;
}

function typeToGenre(type: ResourceType): Song['genre'] {
  return type === 'competition' ? '입시곡' : '클래식';
}

function songToResource(song: Song): PianoResource {
  return {
    id: song.id,
    title: song.title,
    composer: song.composer !== '미상' ? song.composer : undefined,
    publisher: song.publisher,
    level: isPianoStudentLevel(song.level) ? song.level : '체르니 100',
    type: song.resourceType || 'textbook',
    description: song.description,
    difficultyStars: song.difficultyStars ?? difficultyToStars(song.difficulty),
  };
}

function resourceToSong(resource: Omit<PianoResource, 'id'> & { id?: string }): Omit<Song, 'id'> & { id?: string } {
  return {
    id: resource.id,
    title: resource.title,
    composer: resource.composer?.trim() || '미상',
    difficulty: starsToDifficulty(resource.difficultyStars),
    genre: typeToGenre(resource.type),
    publisher: resource.publisher,
    level: resource.level,
    resourceType: resource.type,
    description: resource.description,
    difficultyStars: resource.difficultyStars,
  };
}

const EMPTY_FORM: Omit<PianoResource, 'id'> = {
  title: '',
  composer: '',
  publisher: '',
  level: '체르니 100',
  type: 'textbook',
  description: '',
  difficultyStars: 3,
};

export const ResourceManagementView: React.FC = () => {
  const { showToast } = useApp();

  const [resources, setResources] = useState<PianoResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<PianoResource, 'id'>>(EMPTY_FORM);

  useEffect(() => {
    const loadResources = () => {
      const items = StorageService.getSongs()
        .filter((s) => s.resourceType)
        .map(songToResource);
      setResources(items);
    };
    loadResources();
    const unsubscribe = StorageService.subscribe(loadResources);
    return () => unsubscribe();
  }, []);

  const filtered = resources.filter((r) => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    if (levelFilter !== 'ALL' && r.level !== levelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !(r.composer && r.composer.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    StorageService.saveSong(resourceToSong(formData));
    showToast(`'${formData.title}' 교재/곡이 등록되었습니다.`, 'success');
    setIsModalOpen(false);
    setFormData(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    StorageService.deleteSong(id);
    showToast('삭제되었습니다.', 'info');
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Music2 className="w-6 h-6" />}
        title="교재 및 피아노 곡 관리"
        description="레벨별 추천 교재, 연주회 레퍼토리, 콩쿠르 지정곡 아카이브"
        actions={
          <button
            onClick={() => {
              setFormData(EMPTY_FORM);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            교재/곡 추가
          </button>
        }
      />

      <FilterBar>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
        >
          <option value="ALL">전체 구분</option>
          <option value="textbook">정규 교재</option>
          <option value="repertoire">명곡/레퍼토리</option>
          <option value="competition">콩쿠르/연주곡</option>
          <option value="theory">음악이론</option>
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
        >
          <option value="ALL">전체 레벨</option>
          <option value="바이엘 상">바이엘 상</option>
          <option value="바이엘 하">바이엘 하</option>
          <option value="체르니 100">체르니 100</option>
          <option value="체르니 30">체르니 30</option>
          <option value="소나티네/명곡">소나티네/명곡</option>
          <option value="작품집/쇼팽">작품집/쇼팽</option>
        </select>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="교재명, 작곡가, 출판사 검색..."
          className="flex-1 min-w-[200px]"
        />
        <span className="text-xs text-slate-500 font-medium shrink-0">
          <strong className="text-indigo-600">{filtered.length}개</strong>
        </span>
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center">
          <p className="text-sm text-slate-400">등록된 교재/곡이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">상단 버튼으로 첫 자료를 추가해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getLevelColor(item.level)}`}>
                    {item.level}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    작곡: <strong>{item.composer || '미상'}</strong> {item.publisher && `| 출판: ${item.publisher}`}
                  </p>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  난이도: {'⭐'.repeat(item.difficultyStars)}
                </span>
                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                  {item.type === 'textbook' ? '정규교재' : item.type === 'competition' ? '콩쿠르곡' : '명곡'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">교재 / 악보 추가</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  교재 / 곡명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 하농 60개 연습곡"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">작곡가</label>
                  <input
                    type="text"
                    placeholder="예: C. L. Hanon"
                    value={formData.composer}
                    onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">출판사</label>
                  <input
                    type="text"
                    placeholder="예: 삼호뮤직"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">권장 레벨</label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value as PianoStudentLevel })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {PIANO_STUDENT_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">자료 분류</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="textbook">정규 교재</option>
                    <option value="repertoire">명곡집</option>
                    <option value="competition">콩쿠르곡</option>
                    <option value="theory">이론교재</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">설명 및 특징</label>
                <textarea
                  rows={2}
                  placeholder="교재의 특징이나 추천 이유..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

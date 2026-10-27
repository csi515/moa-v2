import { useState, type FC, type FormEvent } from 'react';
import { Loader2, Share2, Stamp } from 'lucide-react';
import { Modal } from '@/shared/components';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { songProgressService } from './songProgressService';
import { fireSongCompletionConfetti, shareSongCelebration } from './songProgressEffects';
import {
  SONG_BOOK_OPTIONS,
  SONG_NUMBER_QUICK,
  SONG_PROGRESS_COPY,
  formatSongNumberTitle,
} from './songProgressTypes';

interface TeacherDirectPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  customerId: string;
  studentName: string;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onGranted?: () => void;
}

/** 원장/강사 — 교재 칩 + 번호 + 원버튼 완곡 스탬프 수여 */
export const TeacherDirectPassModal: FC<TeacherDirectPassModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  customerId,
  studentName,
  onToast,
  onGranted,
}) => {
  const [bookName, setBookName] = useState<string>(SONG_BOOK_OPTIONS[0]);
  const [customBook, setCustomBook] = useState('');
  const [songNumber, setSongNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ bookName: string; songTitle: string; stamps: number } | null>(
    null
  );

  const isOther = bookName === '기타';
  const resolvedBook = isOther ? customBook.trim() : bookName;

  const resetForm = () => {
    setCustomBook('');
    setSongNumber('');
    setDone(null);
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resolvedBook) {
      onToast?.('교재를 선택해 주세요.', 'warning');
      return;
    }
    const songTitle = formatSongNumberTitle(songNumber);
    if (!songTitle) {
      onToast?.('곡 번호를 입력하거나 선택해 주세요.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await songProgressService.grantDirect({
        organizationId,
        customerId,
        bookName: resolvedBook,
        songTitle,
        stamps: 1,
      });
      fireSongCompletionConfetti();
      setDone({ bookName: resolvedBook, songTitle, stamps: 1 });
      onToast?.(`${studentName} 학생에게 스탬프를 수여했습니다.`, 'success');
      onGranted?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '수여 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!done) return;
    const result = await shareSongCelebration({
      studentName,
      bookName: done.bookName,
      songTitle: done.songTitle,
      stampCount: done.stamps,
      teacherGrant: true,
    });
    if (result === 'shared') onToast?.('공유했습니다.', 'success');
    else if (result === 'copied') onToast?.('축하 문구를 복사했습니다. 카톡에 붙여넣어 주세요.', 'info');
    else onToast?.('이 기기에서는 공유를 지원하지 않습니다.', 'warning');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${SONG_PROGRESS_COPY.grantCta} · ${studentName}`}
      maxWidth="md"
    >
      <div className="p-4 sm:p-5 space-y-4">
        {done ? (
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-800">
              <Stamp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-black text-slate-900">스탬프 수여 완료!</p>
              <p className="text-sm text-slate-600 mt-1">
                {done.bookName} · {done.songTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="w-full min-h-[48px] rounded-xl bg-indigo-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
              <Share2 className="w-4 h-4" />
              {SONG_PROGRESS_COPY.shareParentCta}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              교재와 번호만 고른 뒤 한 번 누르면 끝. 학부모·학생 앱에 바로 반영됩니다.
            </p>

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">교재</p>
              <div className="flex flex-wrap gap-1.5">
                {SONG_BOOK_OPTIONS.map((b) => {
                  const selected = bookName === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBookName(b)}
                      className={`min-h-[40px] px-2.5 rounded-xl text-xs font-bold border ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
              {isOther && (
                <input
                  className={`mt-2 ${FORM_CONTROL_CLASS}`}
                  value={customBook}
                  onChange={(e) => setCustomBook(e.target.value)}
                  placeholder="교재명 입력"
                  maxLength={50}
                />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">번호</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SONG_NUMBER_QUICK.map((n) => {
                  const selected = songNumber === String(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSongNumber(String(n))}
                      className={`min-h-[40px] min-w-[40px] px-2 rounded-xl text-xs font-bold border tabular-nums ${
                        selected
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                className={FORM_CONTROL_CLASS}
                value={songNumber}
                onChange={(e) => setSongNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="또는 번호 직접 입력"
              />
              {formatSongNumberTitle(songNumber) && (
                <p className="text-[11px] text-slate-500 mt-1">
                  등록명: {resolvedBook || '교재'} · {formatSongNumberTitle(songNumber)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[56px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-base font-black inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-amber-500/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
              {SONG_PROGRESS_COPY.grantSubmitCta}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};

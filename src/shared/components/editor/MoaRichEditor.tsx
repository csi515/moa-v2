/**
 * Moa-v2 Headless Rich Text Editor (Tiptap 기반)
 * 
 * 상담 일지, 학생 성장 보고서, 공지사항, 알림톡 템플릿 등에 활용되는
 * Tailwind CSS 맞춤형 모던 WYSIWYG 에디터 컴포넌트.
 */

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface MoaRichEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
}

export const MoaRichEditor: React.FC<MoaRichEditorProps> = ({
  value = '',
  onChange,
  placeholder = '내용을 입력하세요...',
  disabled = false,
  minHeight = '140px',
  className = '',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        style={{ minHeight }}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 animate-pulse p-4"
      />
    );
  }

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all',
        disabled && 'opacity-60 bg-slate-50 cursor-not-allowed',
        className
      )}
    >
      {/* 툴바 (모바일 44px 터치 대응) */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/60 p-1.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={cn(
              'p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              editor.isActive('bold') && 'bg-white text-indigo-600 shadow-2xs font-bold'
            )}
            title="굵게 (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={cn(
              'p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              editor.isActive('italic') && 'bg-white text-indigo-600 shadow-2xs'
            )}
            title="기울임 (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              editor.isActive('heading', { level: 2 }) && 'bg-white text-indigo-600 shadow-2xs font-bold'
            )}
            title="소제목"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              editor.isActive('bulletList') && 'bg-white text-indigo-600 shadow-2xs'
            )}
            title="글머리 기호 목록"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              editor.isActive('orderedList') && 'bg-white text-indigo-600 shadow-2xs'
            )}
            title="번호 매기기 목록"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              'p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              editor.isActive('blockquote') && 'bg-white text-indigo-600 shadow-2xs'
            )}
            title="인용구"
          >
            <Quote className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="다시 실행 (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 에디터 본문 영역 */}
      <div style={{ minHeight }} className="p-3.5 text-sm text-slate-800 leading-relaxed cursor-text focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

import type { FC } from 'react';
import { PageHeader, FilterBar, SearchField } from '@/shared/components';
import { FilterTabs } from '@/shared/components/ui';
import { Megaphone, Plus } from 'lucide-react';
import { useParentNoticeState } from './hooks/useParentNoticeState';
import { NoticeList } from './components/NoticeList';
import { NoticeFormModal } from './components/NoticeFormModal';
import { NOTICE_COPY } from './noticeUi';

/** 전 업종 공통 — 안내장·가정통신문 작성/게시 */
export const ParentNoticeView: FC = () => {
  const state = useParentNoticeState();

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Megaphone className="w-6 h-6" />}
        iconClassName={state.accent.icon}
        title={NOTICE_COPY.pageTitle}
        description={NOTICE_COPY.pageDescription(state.labels.contact.singular)}
        actions={
          state.canWriteNotices ? (
          <button
            type="button"
            onClick={state.openCreate}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl ${state.accent.btn} ${state.accent.btnHover} text-white text-xs font-bold`}
          >
            <Plus className="w-4 h-4" />
            작성
          </button>
          ) : undefined
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <FilterBar className="border-0 shadow-none rounded-none border-b border-slate-100">
          <FilterTabs
            tabs={[
              { id: 'ALL', label: '전체' },
              { id: 'pending', label: '임시저장' },
              { id: 'sent', label: '게시됨' },
            ]}
            active={state.statusFilter}
            onChange={(id) => state.setStatusFilter(id)}
            activeClassName={state.tone.active}
          />
          <SearchField
            value={state.searchQuery}
            onChange={state.setSearchQuery}
            placeholder="제목·내용 검색"
            className="w-full sm:flex-1 sm:max-w-xs"
          />
        </FilterBar>

        <NoticeList
          items={state.filtered}
          softClass={state.tone.soft}
          editClass={state.tone.edit}
          btnClass={state.accent.btn}
          btnHoverClass={state.accent.btnHover}
          targetLabel={state.targetLabel}
          onCreate={state.openCreate}
          onEdit={state.openEdit}
          onPublish={state.publishExisting}
          onDelete={state.handleDelete}
          canWrite={state.canWriteNotices}
          canDelete={!state.isStaff}
        />
      </div>

      <NoticeFormModal
        isOpen={state.isModalOpen}
        isEditing={Boolean(state.editing)}
        form={state.form}
        setForm={state.setForm}
        labels={state.labels}
        accent={state.accent}
        activeClassName={state.tone.active}
        softHoverClass={state.tone.softHover}
        templates={state.templates}
        students={state.students}
        classes={state.classes}
        targetModeOptions={state.targetModeOptions}
        recipientCount={state.recipientPreview.length}
        onClose={state.closeModal}
        onApplyTemplate={state.applyTemplate}
        onSaveDraft={state.handleSaveDraft}
        onPublish={state.handlePublish}
      />
    </div>
  );
};

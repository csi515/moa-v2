import React from "react";
import { useTable } from "@refinedev/core";
import { Plus, Search, UserCheck } from "lucide-react";

export const StudentListPage: React.FC = () => {
  const { tableQueryResult } = useTable({
    resource: "customers",
    pagination: {
      pageSize: 10,
    },
  });

  const students = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult?.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">원생 관리</h1>
          <p className="text-sm text-slate-500">
            원생 목록 조회 및 신규 등록, 수강권 배정 및 출석 상태를 관리합니다.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          원생 신규 등록
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="원생 이름, 학부모 연락처로 검색..."
          className="w-full text-sm placeholder-slate-400 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-6 py-3.5 font-semibold">이름</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">연락처</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">상태</th>
              <th scope="col" className="px-6 py-3.5 font-semibold">등록일</th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  원생 데이터를 불러오는 중...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <UserCheck className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium">등록된 원생 데이터가 없습니다.</p>
                  <p className="text-xs text-slate-400">신규 원생을 등록하거나 엑셀 일괄 업로드를 진행하세요.</p>
                </td>
              </tr>
            ) : (
              students.map((student: any) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                  <td className="px-6 py-4 text-slate-600">{student.phone || "-"}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {student.status || "active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{student.created_at?.slice(0, 10)}</td>
                  <td className="px-6 py-4 text-right">
                    <button type="button" className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                      상세보기
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

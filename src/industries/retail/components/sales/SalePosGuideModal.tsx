import React from 'react';
import {
  HelpCircle,
  Keyboard,
  Barcode,
  PauseCircle,
  Calculator,
  RotateCcw,
  Sparkles,
  Tag,
  Check,
} from 'lucide-react';
import { Modal } from '@/shared/components';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SalePosGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="POS 실무 사용 가이드 & 단축키 치트시트" maxWidth="lg">
      <div className="flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* 상단 키보드 단축키 치트시트 */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-teal-600" />
              <span>마우스 없이 끝내는 초고속 키보드 단축키</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">결제창 열기</span>
                <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs">
                  Space
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">장바구니 전체 비우기</span>
                <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs">
                  Del / Backspace
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">수량 감소 / 증가</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                  <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg shadow-2xs">F1 (-)</kbd>
                  <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg shadow-2xs">F2 (+)</kbd>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">도움말 가이드 열기</span>
                <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs">
                  F1 (장바구니 밖)
                </kbd>
              </div>
            </div>
          </section>

          {/* 현장 실무 5대 꿀팁 */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>카운터 첫 출근 직원을 위한 5대 현장 꿀팁</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              {/* 1. 바코드 스캔 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Barcode className="w-4 h-4 text-teal-600" />
                  <span>1. 바코드 스캔 & 3초 미등록 상품 즉석 등록</span>
                </div>
                <p className="text-slate-600 pl-6 leading-relaxed">
                  USB/무선 스캐너로 제품 바코드를 찍으면 즉시 장바구니에 담깁니다.
                  만약 <strong>처음 들어온 미등록 바코드</strong>라면 계산대를 멈출 필요 없이 <strong>3초 팝업창</strong>에서 상품명과 금액만 입력하면 즉시 등록되고 바로 결제할 수 있습니다.
                </p>
              </div>

              {/* 2. 무바코드 상품 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span>2. 바코드가 없는 물건 (수제/벌크/비닐봉투 등)</span>
                </div>
                <p className="text-slate-600 pl-6 leading-relaxed">
                  화면 상단의 <strong>'자주 찾는 상품 (터치 퀵 매대)'</strong> 버튼을 누르면 바코드 없이 원클릭으로 장바구니에 담을 수 있습니다. 또는 상품 목록에서 자체 바코드 라벨을 인쇄해 물건에 부착할 수도 있습니다.
                </p>
              </div>

              {/* 3. 주문 보류 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <PauseCircle className="w-4 h-4 text-amber-600" />
                  <span>3. 손님이 지갑을 차에 가지러 갔을 때 (주문 보류)</span>
                </div>
                <p className="text-slate-600 pl-6 leading-relaxed">
                  장바구니 하단의 <strong>[주문 보류]</strong> 버튼을 누르면 현재 담긴 상품들이 안전하게 임시 보관되며, 다음 손님을 먼저 계산할 수 있습니다. 손님이 돌아오면 상단의 <strong>[보류 주문]</strong> 버튼에서 1초 만에 장바구니로 복원합니다.
                </p>
              </div>

              {/* 4. 복합 결제 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Calculator className="w-4 h-4 text-teal-600" />
                  <span>4. 현금 10,000원 + 나머지 카드 (복합 결제)</span>
                </div>
                <p className="text-slate-600 pl-6 leading-relaxed">
                  결제창에서 <strong>[복합 결제 (현금+카드)]</strong> 버튼을 선택하고 현금으로 받을 금액을 입력하세요. 외부 카드 단말기에서 긁어야 할 카드 승인 요청 금액이 자동으로 계산되어 장부 오차가 생기지 않습니다.
                </p>
              </div>

              {/* 5. 영수증 반품 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>5. 손님이 종이 영수증을 들고 환불을 요구할 때</span>
                </div>
                <p className="text-slate-600 pl-6 leading-relaxed">
                  POS 상단의 <strong>[영수증 반품]</strong> 버튼을 누르고, 영수증에 적힌 <strong>결제 금액(예: 23500)</strong>이나 고객 이름을 입력하세요. 해당 거래 건이 1초 만에 검색되며, 반품 즉시 재고가 자동으로 다시 채워집니다.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 cursor-pointer shadow-xs"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </Modal>
  );
};

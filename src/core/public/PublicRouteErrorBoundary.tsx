import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Building2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** 공개 페이지(QR 상담 등) 렌더 오류 시 흰 화면 대신 안내 */
export class PublicRouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || '페이지를 표시하는 중 오류가 발생했습니다',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Public route error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">페이지를 불러오지 못했습니다</h2>
            <p className="text-sm text-slate-600 mb-6">{this.state.message}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 min-h-[44px] bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                다시 시도
              </button>
              <a
                href="/"
                className="w-full py-3 min-h-[44px] bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 inline-flex items-center justify-center"
              >
                홈으로 이동
              </a>
            </div>
          </div>
        </div>
      );
    }
    // React 19 + 현재 Component 타입에서 this.props 접근이 깨지는 경우 대비
    return (this as unknown as { props: Props }).props.children;
  }
}

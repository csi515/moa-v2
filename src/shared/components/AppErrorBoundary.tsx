import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import { isStaleChunkError, reloadOnceForStaleAssets } from '@/shared/pwa/reloadOnStaleChunk';
import { reloadAppWithoutCache } from '@/shared/pwa/reloadAppWithoutCache';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  resetCount: number;
}

const COPY = {
  title: '화면을 표시하지 못했습니다',
  body: '일시적인 오류입니다. 입력한 업무 데이터는 그대로 두고 이 화면만 다시 불러옵니다.',
  retry: '다시 시도',
};

/**
 * 업무 화면 런타임 오류용.
 * 공개 랜딩은 PublicRouteErrorBoundary 가 담당한다.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', resetCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      message: userFacingErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App work screen error:', error, info.componentStack);
    if (isStaleChunkError(error)) {
      reloadOnceForStaleAssets();
    }
  }

  handleRetry = () => {
    const self = this as unknown as {
      state: State;
      setState: (next: State) => void;
    };
    self.setState({
      hasError: false,
      message: '',
      resetCount: self.state.resetCount + 1,
    });
  };

  render() {
    const props = (this as unknown as { props: Props }).props;
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{COPY.title}</h2>
            <p className="text-sm text-slate-600 mb-2">{COPY.body}</p>
            {this.state.message ? (
              <p className="text-xs text-slate-500 mb-6 break-words">{this.state.message}</p>
            ) : (
              <div className="mb-6" />
            )}
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full py-3 min-h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
            >
              {COPY.retry}
            </button>
            <button
              type="button"
              onClick={() => void reloadAppWithoutCache()}
              className="mt-2 w-full py-3 min-h-12 rounded-xl border font-bold"
            >
              앱 다시 불러오기
            </button>
          </div>
        </div>
      );
    }
    return <div key={this.state.resetCount}>{props.children}</div>;
  }
}

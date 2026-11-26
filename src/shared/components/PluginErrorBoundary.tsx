import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import { isStaleChunkError, reloadOnceForStaleAssets } from '@/shared/pwa/reloadOnStaleChunk';

export interface PluginErrorBoundaryProps {
  pluginName?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class PluginErrorBoundary extends Component<PluginErrorBoundaryProps, State> {
  public state: State = { hasError: false, message: '' };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: userFacingErrorMessage(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PluginErrorBoundary] Error in plugin ${this.props.pluginName}:`, error, errorInfo);
    if (isStaleChunkError(error)) {
      reloadOnceForStaleAssets();
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-lg max-w-md mx-auto my-8 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-5 h-5 text-slate-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            화면을 불러오는 중 문제가 발생했습니다
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            {this.props.pluginName ? `${this.props.pluginName} 모듈` : '해당 기능'}에서 일시적인 오류가 발생했습니다.
          </p>

          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors min-h-[40px] cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
          </button>

          {import.meta.env.DEV && this.state.message ? (
            <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-md text-left font-mono text-[11px] text-rose-600 break-all max-w-sm mx-auto">
              {this.state.message}
            </div>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

export default PluginErrorBoundary;

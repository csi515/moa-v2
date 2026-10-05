/**
 * Universal useTerminology hook.
 *
 * 현재 활성 업종 또는 컨텍스트에 따라 도메인 용어(TerminologyDictionary)를 조회하고,
 * dot-notation 번역 함수 t(key, fallback)를 제공합니다.
 *
 * 기존 useModuleLabels()와 완벽히 상호 호환됩니다.
 */

import { useMemo } from 'react';
import { useModuleLabels } from '../labels/ModuleLabelsProvider';
import type { ModuleLabels } from '../labels/types';
import {
  DEFAULT_TERMINOLOGY_DICTIONARY,
  getTerminologyDictionary,
} from './dictionaries';
import { translateTerm } from './translate';
import type { TerminologyDictionary, TermKey } from './types';

export interface UseTerminologyResult {
  /** dot-notation 번역 함수 (예: t('customer.singular'), t('billing.fee')) */
  t: (key: TermKey, fallback?: string) => string;
  /** 현재 활성 전체 용어 사전 */
  terms: TerminologyDictionary;
  /** 레거시 및 기존 코드 호환용 ModuleLabels 객체 */
  labels: ModuleLabels;
}

/**
 * 용어 사전 훅.
 * @param industryOverride 명시적으로 특정 업종의 용어를 사용하고자 할 때 전달. 미전달 시 컨텍스트 라벨 활용.
 */
export function useTerminology(
  industryOverride?: string | null
): UseTerminologyResult {
  const contextLabels = useModuleLabels();

  const terms = useMemo<TerminologyDictionary>(() => {
    if (industryOverride) {
      return getTerminologyDictionary(industryOverride);
    }

    // contextLabels에 billing 및 facility가 이미 제공된 경우 그대로 사용
    if (contextLabels.billing && contextLabels.facility) {
      return {
        customer: contextLabels.customer,
        contact: contextLabels.contact,
        staff: contextLabels.staff,
        service: contextLabels.service,
        schedule: contextLabels.schedule,
        billing: contextLabels.billing,
        facility: contextLabels.facility,
      };
    }

    // contextLabels(고객/강사/수업 등)을 우선하고, 누락된 billing/facility는 기본 사전에서 병합
    return {
      customer: contextLabels.customer ?? DEFAULT_TERMINOLOGY_DICTIONARY.customer,
      contact: contextLabels.contact ?? DEFAULT_TERMINOLOGY_DICTIONARY.contact,
      staff: contextLabels.staff ?? DEFAULT_TERMINOLOGY_DICTIONARY.staff,
      service: contextLabels.service ?? DEFAULT_TERMINOLOGY_DICTIONARY.service,
      schedule: contextLabels.schedule ?? DEFAULT_TERMINOLOGY_DICTIONARY.schedule,
      billing: contextLabels.billing ?? DEFAULT_TERMINOLOGY_DICTIONARY.billing,
      facility: contextLabels.facility ?? DEFAULT_TERMINOLOGY_DICTIONARY.facility,
    };
  }, [contextLabels, industryOverride]);

  const t = useMemo(() => {
    return (key: TermKey, fallback?: string) => translateTerm(terms, key, fallback);
  }, [terms]);

  return {
    t,
    terms,
    labels: contextLabels,
  };
}

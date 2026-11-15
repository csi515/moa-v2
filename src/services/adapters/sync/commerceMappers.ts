/**
 * [Commerce Mappers] 업종 중립적 커머스/교재 수납 매퍼 어댑터
 *
 * Capability 계층이 레거시 업종 폴더에 직접 결합되지 않도록
 * 중립적인 Port 인터페이스를 제공합니다.
 */

export {
  pianoRowToPayment as textbookPaymentRowToEntity,
  pianoRowToPayment,
} from './piano/textbookPaymentMappers';

export {
  pianoRowToSale as textbookSaleRowToEntity,
  pianoRowToSale,
} from './piano/textbookSalesMappers';

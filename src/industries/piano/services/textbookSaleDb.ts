/**
 * piano.textbook_sales / textbook_payments — DB 직접 CRUD.
 * organization_id tenant scope. localStorage 베스트에포트 sync 대체용.
 */
import { getPianoClient } from '@/lib/supabase/pianoClient';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '@/services/adapters/storageContext';
import type { Textbook, TextbookPayment, TextbookSale } from '@/types';
import {
  paymentToPianoRow,
  pianoRowToPayment,
  pianoRowToSale,
  saleToPianoRow,
  textbookToPianoRow,
} from '@/services/adapters/sync/pianoEntityMappers';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function requireTextbookOrgId(): string {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 설정이 없어 교재 판매를 DB에 저장할 수 없습니다.');
  }
  const orgId = getOrganizationId();
  if (!orgId) {
    throw new Error('사업장이 선택되지 않았습니다.');
  }
  return orgId;
}

export function isTextbookSaleDbAvailable(): boolean {
  return Boolean(isSupabaseConfigured() && getOrganizationId());
}

function coreClient() {
  if (!supabase) throw new Error('Supabase client unavailable');
  return supabase.schema('core');
}

export const textbookSaleDb = {
  async assertCustomerExists(organizationId: string, customerId: string): Promise<void> {
    if (!isUuid(customerId)) {
      throw new Error('원생 ID가 올바르지 않습니다. 원생을 다시 저장한 뒤 판매하세요.');
    }
    const { data, error } = await coreClient()
      .from('customers')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', customerId)
      .maybeSingle();
    if (error) throw new Error(`원생 확인 실패: ${error.message}`);
    if (!data) {
      throw new Error(
        '원생이 DB(core.customers)에 없습니다. 원생을 한 번 저장·동기화한 뒤 교재를 판매하세요.'
      );
    }
  },

  /**
   * 판매 FK용 piano.textbooks 보장.
   * textbook.id 가 UUID가 아니면 실패(신규 교재는 UUID 발급 필요).
   */
  async ensurePianoTextbook(organizationId: string, textbook: Textbook): Promise<void> {
    if (!isUuid(textbook.id)) {
      throw new Error(
        `교재 "${textbook.title}" ID가 UUID가 아닙니다. 교재를 새로 등록한 뒤 판매하세요.`
      );
    }
    const client = getPianoClient();
    const row = textbookToPianoRow(textbook, organizationId);
    const { error } = await client.from('textbooks').upsert(row as never);
    if (error) throw new Error(`교재 마스터 DB 저장 실패: ${error.message}`);
  },

  async listSales(organizationId: string): Promise<TextbookSale[]> {
    const client = getPianoClient();
    const { data, error } = await client
      .from('textbook_sales')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(`교재 판매 조회 실패: ${error.message}`);
    return (data || []).map((row) => pianoRowToSale(row as Parameters<typeof pianoRowToSale>[0]));
  },

  async listPayments(organizationId: string): Promise<TextbookPayment[]> {
    const client = getPianoClient();
    const { data, error } = await client
      .from('textbook_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(`교재 수납 조회 실패: ${error.message}`);
    return (data || []).map((row) =>
      pianoRowToPayment(row as Parameters<typeof pianoRowToPayment>[0])
    );
  },

  async getSale(organizationId: string, saleId: string): Promise<TextbookSale | null> {
    const client = getPianoClient();
    const { data, error } = await client
      .from('textbook_sales')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', saleId)
      .maybeSingle();
    if (error) throw new Error(`교재 판매 조회 실패: ${error.message}`);
    if (!data) return null;
    return pianoRowToSale(data as Parameters<typeof pianoRowToSale>[0]);
  },

  async insertSale(organizationId: string, sale: TextbookSale): Promise<TextbookSale> {
    const client = getPianoClient();
    // staff_id → core.staff FK. 강사 id가 staff 행이 아닐 수 있어 null 유지(이름은 metadata).
    const row = {
      ...saleToPianoRow(sale, organizationId),
      staff_id: null,
    };
    const { data, error } = await client
      .from('textbook_sales')
      .insert(row as never)
      .select('*')
      .single();
    if (error) throw new Error(`교재 판매 DB 저장 실패: ${error.message}`);
    return pianoRowToSale(data as Parameters<typeof pianoRowToSale>[0]);
  },

  async updateSale(
    organizationId: string,
    saleId: string,
    sale: TextbookSale
  ): Promise<TextbookSale> {
    const client = getPianoClient();
    const row = {
      ...saleToPianoRow(sale, organizationId),
      staff_id: null,
      id: saleId,
    };
    const { data, error } = await client
      .from('textbook_sales')
      .update(row as never)
      .eq('organization_id', organizationId)
      .eq('id', saleId)
      .select('*')
      .single();
    if (error) throw new Error(`교재 판매 DB 갱신 실패: ${error.message}`);
    return pianoRowToSale(data as Parameters<typeof pianoRowToSale>[0]);
  },

  async deleteSale(organizationId: string, saleId: string): Promise<void> {
    const client = getPianoClient();
    const { error } = await client
      .from('textbook_sales')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', saleId);
    if (error) throw new Error(`교재 판매 DB 삭제 실패: ${error.message}`);
  },

  async insertPayment(
    organizationId: string,
    payment: TextbookPayment
  ): Promise<TextbookPayment> {
    const client = getPianoClient();
    const { data, error } = await client
      .from('textbook_payments')
      .insert(paymentToPianoRow(payment, organizationId) as never)
      .select('*')
      .single();
    if (error) throw new Error(`교재 수납 DB 저장 실패: ${error.message}`);
    return pianoRowToPayment(data as Parameters<typeof pianoRowToPayment>[0]);
  },

  async deletePayment(organizationId: string, paymentId: string): Promise<void> {
    const client = getPianoClient();
    const { error } = await client
      .from('textbook_payments')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', paymentId);
    if (error) throw new Error(`교재 수납 DB 삭제 실패: ${error.message}`);
  },

  async deletePaymentsForSale(
    organizationId: string,
    saleId: string
  ): Promise<TextbookPayment[]> {
    const client = getPianoClient();
    const { data: existing, error: listErr } = await client
      .from('textbook_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('textbook_sale_id', saleId);
    if (listErr) throw new Error(`교재 수납 조회 실패: ${listErr.message}`);
    const payments = (existing || []).map((r) =>
      pianoRowToPayment(r as Parameters<typeof pianoRowToPayment>[0])
    );
    if (payments.length === 0) return [];
    const { error } = await client
      .from('textbook_payments')
      .delete()
      .eq('organization_id', organizationId)
      .eq('textbook_sale_id', saleId);
    if (error) throw new Error(`교재 수납 DB 삭제 실패: ${error.message}`);
    return payments;
  },
};

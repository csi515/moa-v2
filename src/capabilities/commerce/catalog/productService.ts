import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Product,
  ProductCategory,
  ProductListItem,
  ProductSaveInput,
  ProductVariant,
  ProductVariantSaveInput,
} from './types';

type ProductRow = {
  id: string;
  organization_id: string;
  name: string;
  category_id: string | null;
  product_code: string | null;
  price: number | string;
  cost: number | string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number | string | null;
  cost: number | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    categoryId: row.category_id,
    productCode: row.product_code,
    price: toNumber(row.price) ?? 0,
    cost: toNumber(row.cost),
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    price: toNumber(row.price),
    cost: toNumber(row.cost),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row: CategoryRow): ProductCategory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }
  return getCoreClient();
}

/**
 * Core 상품·카테고리·옵션 서비스.
 * organization_id 스코프 + RLS(멤버 조회 / 관리자 쓰기)에 의존.
 */
export const productService = {
  async listCategories(
    organizationId: string,
    options?: { includeInactive?: boolean }
  ): Promise<ProductCategory[]> {
    const client = ensureClient();
    let query = client
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    if (!options?.includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return ((data as CategoryRow[] | null) ?? []).map(mapCategory);
  },

  async createCategory(organizationId: string, name: string): Promise<ProductCategory> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('카테고리명이 필요합니다.');
    const client = ensureClient();

    const { data: existingRows, error: findError } = await client
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('name', trimmed)
      .maybeSingle();
    if (findError) throw findError;
    if (existingRows) {
      const existing = mapCategory(existingRows as CategoryRow);
      if (existing.isActive) return existing;
      return this.setCategoryActive(organizationId, existing.id, true);
    }

    const { data, error } = await client
      .from('product_categories')
      .insert({
        organization_id: organizationId,
        name: trimmed,
        is_active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapCategory(data as CategoryRow);
  },

  async renameCategory(
    organizationId: string,
    categoryId: string,
    name: string
  ): Promise<ProductCategory> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('카테고리명이 필요합니다.');
    const client = ensureClient();
    const { data, error } = await client
      .from('product_categories')
      .update({ name: trimmed })
      .eq('id', categoryId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw error;
    return mapCategory(data as CategoryRow);
  },

  async setCategoryActive(
    organizationId: string,
    categoryId: string,
    isActive: boolean
  ): Promise<ProductCategory> {
    const client = ensureClient();
    const { data, error } = await client
      .from('product_categories')
      .update({ is_active: isActive })
      .eq('id', categoryId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw error;
    return mapCategory(data as CategoryRow);
  },

  async findOrCreateCategory(
    organizationId: string,
    name: string
  ): Promise<ProductCategory> {
    return this.createCategory(organizationId, name);
  },

  async listProducts(organizationId: string): Promise<ProductListItem[]> {
    const client = ensureClient();
    const [productsRes, variantsRes, categoriesRes] = await Promise.all([
      client
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true }),
      client.from('product_variants').select('id, product_id, is_active'),
      client
        .from('product_categories')
        .select('id, name')
        .eq('organization_id', organizationId),
    ]);
    if (productsRes.error) throw productsRes.error;
    if (variantsRes.error) throw variantsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;

    const products = ((productsRes.data as ProductRow[] | null) ?? []).map(mapProduct);
    const productIds = new Set(products.map((p) => p.id));
    const variantCountByProduct = new Map<string, number>();
    for (const row of (variantsRes.data as { id: string; product_id: string }[] | null) ??
      []) {
      if (!productIds.has(row.product_id)) continue;
      variantCountByProduct.set(
        row.product_id,
        (variantCountByProduct.get(row.product_id) ?? 0) + 1
      );
    }
    const categoryNameById = new Map(
      ((categoriesRes.data as { id: string; name: string }[] | null) ?? []).map((c) => [
        c.id,
        c.name,
      ])
    );

    return products.map((p) => ({
      ...p,
      variantCount: variantCountByProduct.get(p.id) ?? 0,
      categoryName: p.categoryId ? categoryNameById.get(p.categoryId) ?? null : null,
    }));
  },

  async getProduct(
    organizationId: string,
    productId: string
  ): Promise<Product | null> {
    const client = ensureClient();
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data as ProductRow) : null;
  },

  async listVariants(productId: string): Promise<ProductVariant[]> {
    const client = ensureClient();
    const { data, error } = await client
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('name', { ascending: true });
    if (error) throw error;
    return ((data as VariantRow[] | null) ?? []).map(mapVariant);
  },

  async saveProduct(
    organizationId: string,
    input: ProductSaveInput,
    productId?: string
  ): Promise<Product> {
    const client = ensureClient();
    const name = input.name.trim();
    if (!name) throw new Error('상품명이 필요합니다.');

    let categoryId = input.categoryId ?? null;
    const newCategoryName = input.newCategoryName?.trim();
    if (!categoryId && newCategoryName) {
      const cat = await this.findOrCreateCategory(organizationId, newCategoryName);
      categoryId = cat.id;
    }

    const payload = {
      organization_id: organizationId,
      name,
      category_id: categoryId,
      product_code: input.productCode?.trim() || null,
      price: Math.max(0, input.price),
      cost: input.cost == null || Number.isNaN(input.cost) ? null : Math.max(0, input.cost),
      is_active: input.isActive !== false,
    };

    let saved: ProductRow;
    if (productId) {
      const { data, error } = await client
        .from('products')
        .update(payload)
        .eq('id', productId)
        .eq('organization_id', organizationId)
        .select('*')
        .single();
      if (error) throw error;
      saved = data as ProductRow;
    } else {
      const insertPayload = input.id?.trim()
        ? { ...payload, id: input.id.trim() }
        : payload;
      const { data, error } = await client
        .from('products')
        .insert(insertPayload)
        .select('*')
        .single();
      if (error) throw error;
      saved = data as ProductRow;
    }

    if (input.variants !== undefined) {
      await this.syncVariants(saved.id, input.variants);
    }

    return mapProduct(saved);
  },

  /** 기존 id 유지·갱신, 빠진 행만 삭제 */
  async syncVariants(productId: string, variants: ProductVariantSaveInput[]): Promise<void> {
    const client = ensureClient();
    const existing = await this.listVariants(productId);
    const cleaned = variants
      .map((v) => ({
        id: v.id,
        name: v.name.trim(),
        sku: v.sku?.trim() || null,
        price:
          v.price == null || Number.isNaN(v.price) ? null : Math.max(0, Number(v.price)),
        cost: v.cost == null || Number.isNaN(v.cost) ? null : Math.max(0, Number(v.cost)),
        isActive: v.isActive !== false,
      }))
      .filter((v) => v.name.length > 0);

    const keepIds = new Set(cleaned.filter((v) => v.id).map((v) => v.id as string));
    const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => e.id);

    if (toDelete.length > 0) {
      const { error: delError } = await client
        .from('product_variants')
        .delete()
        .eq('product_id', productId)
        .in('id', toDelete);
      if (delError) throw delError;
    }

    for (const row of cleaned) {
      if (row.id && existing.some((e) => e.id === row.id)) {
        const { error } = await client
          .from('product_variants')
          .update({
            name: row.name,
            sku: row.sku,
            price: row.price,
            cost: row.cost,
            is_active: row.isActive,
          })
          .eq('id', row.id)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await client.from('product_variants').insert({
          product_id: productId,
          name: row.name,
          sku: row.sku,
          price: row.price,
          cost: row.cost,
          is_active: row.isActive,
        });
        if (error) throw error;
      }
    }
  },
};

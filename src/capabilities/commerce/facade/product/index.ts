/**
 * Commerce Product facade. 구현 SoT는 `@/capabilities/commerce/catalog`.
 */
export type {
  Product,
  ProductCategory,
  ProductListItem,
  ProductSaveInput,
  ProductVariant,
  ProductVariantSaveInput,
} from '@/capabilities/commerce/catalog';
export { productService } from '@/capabilities/commerce/catalog';

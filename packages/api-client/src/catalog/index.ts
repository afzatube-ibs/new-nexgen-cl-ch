// Catalog — Phase 2.2 Slice 1. One barrel for every Catalog resource area,
// mirroring the top-level index.ts's own auth/stores barrel convention.
export * from './types.js';
export type { ListQuery } from './resourceClient.js';

export { listBrands, getBrand, createBrand, updateBrand, archiveBrand, destroyBrand, restoreBrand } from './brands.js';
export {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  destroyCategory,
  restoreCategory,
} from './categories.js';
export {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  archiveCollection,
  destroyCollection,
  restoreCollection,
} from './collections.js';
export { listTags, getTag, createTag, updateTag, destroyTag, restoreTag } from './tags.js';
export {
  listAttributeGroups,
  getAttributeGroup,
  createAttributeGroup,
  updateAttributeGroup,
  destroyAttributeGroup,
  restoreAttributeGroup,
} from './attributeGroups.js';
export { listAttributes, getAttribute, createAttribute, updateAttribute, destroyAttribute, restoreAttribute } from './attributes.js';
export {
  listOptions,
  getOption,
  createOption,
  updateOption,
  destroyOption,
  restoreOption,
  addOptionValue,
  updateOptionValue,
  removeOptionValue,
} from './options.js';
export {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  publishProduct,
  archiveProduct,
  destroyProduct,
  restoreProduct,
} from './products.js';

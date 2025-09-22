/**
 * TypeORM-Zod Integration - Production Ready
 *
 * This package provides seamless integration between TypeORM entities and Zod validation
 * using WeakMap-based metadata storage to prevent cross-entity pollution.
 *
 * Features:
 * - WeakMap-based metadata storage prevents entity metadata pollution
 * - Inheritance-aware schema generation includes base class properties
 * - Proper handling of circular dependencies
 * - Property name conflicts between entities are resolved
 * - Automatic create/update/patch schema variants
 */

// Metadata types
export { type SchemaVariant, ZOD_METADATA_KEY, type ZodValidationMetadata } from './decorators/metadata';
export { ZodColumn } from './decorators/zod-column';
// Decorators (production-ready, pollution-free)
export { ZodProperty, type ZodPropertyOptions } from './decorators/zod-property';
// Metadata storage (WeakMap-based, pollution-free)
export {
    addMetadata,
    debugMetadataStore,
    getMetadata,
    getPropertyMetadata,
    hasPropertyMetadata,
    setMetadata,
} from './metadata-store';
// Schema generators (inheritance-aware)
export {
    createCreateSchema,
    createEntitySchemas,
    createUpdateSchema,
    createZodFromEntity,
    type EntitySchemas,
    type SchemaGenerationOptions,
} from './schema-generator';

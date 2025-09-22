import { z } from 'zod';
import type { SchemaVariant } from './decorators/metadata';
import { getMetadata } from './metadata-store';

type ConstructorFunction = new (...args: unknown[]) => unknown;

/**
 * Schema generation options
 */
export interface SchemaGenerationOptions {
    /** Fields to omit from create schema (in addition to defaults) */
    omitFromCreate?: string[];
    /** Fields to omit from update schema */
    omitFromUpdate?: string[];
    /** Custom field transformations */
    transforms?: Record<string, (schema: z.ZodTypeAny) => z.ZodTypeAny>;
}

/**
 * Generated schema collection
 */
export interface EntitySchemas<_T = Record<string, unknown>> {
    /** Full entity schema - includes all fields */
    full: z.ZodObject<z.ZodRawShape>;
    /** Create schema - omits auto-generated fields */
    create: z.ZodObject<z.ZodRawShape>;
    /** Update schema - id required, everything else optional */
    update: z.ZodObject<z.ZodRawShape>;
    /** Patch schema - all fields optional */
    patch: z.ZodObject<z.ZodRawShape>;
    /** Query schema - for filtering/searching (all optional) */
    query: z.ZodObject<z.ZodRawShape>;
}

/**
 * Get all metadata from entity class including inheritance chain
 */
function getAllMetadata(
    entityClass: ConstructorFunction
): Array<{ propertyKey: string; zodSchema: z.ZodTypeAny; columnOptions?: unknown; skip?: SchemaVariant[] }> {
    const allMetadata: Array<{
        propertyKey: string;
        zodSchema: z.ZodTypeAny;
        columnOptions?: unknown;
        skip?: SchemaVariant[];
    }> = [];
    const seenProperties = new Set<string>();

    // Walk up the prototype chain to collect metadata from all classes
    let currentClass: ConstructorFunction | null = entityClass;

    while (currentClass) {
        const metadata = getMetadata(currentClass);

        // Add metadata from current class (child properties override parent properties)
        metadata.forEach((item) => {
            if (!seenProperties.has(item.propertyKey)) {
                allMetadata.push({
                    propertyKey: item.propertyKey,
                    zodSchema: item.zodSchema,
                    columnOptions: item.columnOptions,
                    skip: item.skip,
                });
                seenProperties.add(item.propertyKey);
            }
        });

        // Move to parent class
        currentClass = Object.getPrototypeOf(currentClass);

        // Stop at Object.prototype or Function.prototype
        if (!currentClass || currentClass === Object || (currentClass as unknown) === Function) {
            break;
        }
    }

    return allMetadata;
}

/**
 * Filter metadata based on schema variant and skip settings
 */
function filterMetadataForSchema(
    metadata: Array<{ propertyKey: string; zodSchema: z.ZodTypeAny; columnOptions?: unknown; skip?: SchemaVariant[] }>,
    schemaVariant: SchemaVariant,
    globalOmitFields: string[] = []
): Array<{ propertyKey: string; zodSchema: z.ZodTypeAny; columnOptions?: unknown; skip?: SchemaVariant[] }> {
    return metadata.filter(({ propertyKey, skip }) => {
        // Check if property should be skipped based on per-property skip settings
        if (skip?.includes(schemaVariant)) {
            return false;
        }

        // Check if property should be omitted based on global settings
        return !globalOmitFields.includes(propertyKey);
    });
}

/**
 * Create Zod schema for a specific variant (create, update, etc.) respecting skip settings
 */
function createZodFromEntityForVariant<T>(
    entityClass: new () => T,
    schemaVariant: SchemaVariant,
    options: SchemaGenerationOptions = {},
    globalOmitFields: string[] = []
): z.ZodObject<z.ZodRawShape> {
    const allMetadata = getAllMetadata(entityClass);

    if (allMetadata.length === 0) {
        throw new Error(
            `No Zod validation metadata found for entity ${String(entityClass.name)}. ` +
                'Make sure to use @ZodProperty or @ZodColumn decorators on entity properties.'
        );
    }

    // Filter metadata based on schema variant and skip settings
    const filteredMetadata = filterMetadataForSchema(allMetadata, schemaVariant, globalOmitFields);

    const shape: Record<string, z.ZodTypeAny> = {};

    filteredMetadata.forEach(({ propertyKey, zodSchema, columnOptions }) => {
        let finalSchema = zodSchema;

        // Apply custom transforms if provided
        if (options.transforms?.[propertyKey]) {
            finalSchema = options.transforms[propertyKey](finalSchema);
        }

        // Apply TypeORM column constraints to Zod schema
        if (columnOptions) {
            const colOptions = columnOptions as Record<string, unknown>;
            // Use proper Zod type guards for reliable type checking
            const isOptionalSchema = zodSchema instanceof z.ZodOptional;
            const isNullableSchema = zodSchema instanceof z.ZodNullable;

            if (colOptions.nullable && !isOptionalSchema && !isNullableSchema) {
                finalSchema = finalSchema.nullable();
            }

            // Add default values from TypeORM to Zod (if not already present)
            if (colOptions.default !== undefined && !(zodSchema instanceof z.ZodDefault)) {
                finalSchema = finalSchema.default(colOptions.default);
            }
        }

        shape[propertyKey] = finalSchema;
    });

    return z.object(shape);
}

/**
 * Extract Zod schema from entity class with decorators using WeakMap storage and inheritance
 * This creates the full schema including all properties
 */
export function createZodFromEntity<T>(
    entityClass: new () => T,
    options: SchemaGenerationOptions = {}
): z.ZodObject<z.ZodRawShape> {
    return createZodFromEntityForVariant(entityClass, 'full', options);
}

/**
 * Create comprehensive schema collection from entity class using WeakMap storage and inheritance
 */
export function createEntitySchemas<T>(
    entityClass: new () => T,
    options: SchemaGenerationOptions = {}
): EntitySchemas<T> {
    // Default fields to omit from create schema (legacy global settings)
    const defaultCreateOmit = ['id', 'createdAt', 'updatedAt', 'deletedAt'];
    const createOmitFields = [...defaultCreateOmit, ...(options.omitFromCreate || [])];

    // Default fields to omit from update schema (legacy global settings)
    const updateOmitFields = options.omitFromUpdate || [];

    return {
        // Full entity schema - includes all properties
        full: createZodFromEntityForVariant(entityClass, 'full', options),

        // Create schema - respects per-property skip settings and global omits
        create: createZodFromEntityForVariant(entityClass, 'create', options, createOmitFields),

        // Update schema - respects per-property skip settings, then make optional with required id
        update: createZodFromEntityForVariant(entityClass, 'update', options, updateOmitFields)
            .partial()
            .required({ id: true }),

        // Patch schema - respects per-property skip settings, then make all optional
        patch: createZodFromEntityForVariant(entityClass, 'patch', options).partial(),

        // Query schema - respects per-property skip settings, then make all optional
        query: createZodFromEntityForVariant(entityClass, 'query', options).partial(),
    };
}

/**
 * Extract just the create schema (convenience function)
 */
export function createCreateSchema<T>(
    entityClass: new () => T,
    options?: SchemaGenerationOptions
): z.ZodObject<z.ZodRawShape> {
    return createEntitySchemas(entityClass, options).create;
}

/**
 * Extract just the update schema (convenience function)
 */
export function createUpdateSchema<T>(
    entityClass: new () => T,
    options?: SchemaGenerationOptions
): z.ZodObject<z.ZodRawShape> {
    return createEntitySchemas(entityClass, options).update;
}

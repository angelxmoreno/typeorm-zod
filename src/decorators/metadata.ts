import type { ColumnOptions } from 'typeorm';
import type { z } from 'zod';

// Metadata key for storing Zod validation rules
export const ZOD_METADATA_KEY = Symbol('zod:validation');

// Schema variant types for type safety
export type SchemaVariant = 'create' | 'update' | 'patch' | 'query' | 'full';

// Enhanced metadata that includes both TypeORM and Zod info
export interface ZodValidationMetadata {
    propertyKey: string;
    zodSchema: z.ZodTypeAny;
    columnOptions?: ColumnOptions;
    skip?: SchemaVariant[];
}

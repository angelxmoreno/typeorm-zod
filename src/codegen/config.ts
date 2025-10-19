import { z } from 'zod';

// Define Zod schemas for the naming conventions
const NamingConventionSchema = z
    .object({
        entityToTypeName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToCreateDtoName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToUpdateDtoName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToPatchDtoName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToQueryDtoName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToSchemasName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToValidateCreateName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToValidateUpdateName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToValidatePatchName: z.function(z.tuple([z.string()]), z.string()).optional(),
        entityToValidateQueryName: z.function(z.tuple([z.string()]), z.string()).optional(),
    })
    .partial();

// Define Zod schema for entity overrides within schemas config
const EntityOverrideSchema = z
    .object({
        omitFromCreate: z.array(z.string()).optional(),
        omitFromUpdate: z.array(z.string()).optional(),
        omitFromPatch: z.array(z.string()).optional(),
        omitFromQuery: z.array(z.string()).optional(),
        transforms: z.record(z.function(z.tuple([z.any()]), z.any())).optional(), // z.ZodTypeAny is hard to type precisely here
    })
    .partial();

// Define Zod schema for the main schemas configuration
const SchemasConfigSchema = z
    .object({
        defaultOmitFromCreate: z.array(z.string()).optional(),
        defaultOmitFromUpdate: z.array(z.string()).optional(),
        defaultOmitFromPatch: z.array(z.string()).optional(),
        defaultOmitFromQuery: z.array(z.string()).optional(),
        entityOverrides: z.record(EntityOverrideSchema).optional(),
    })
    .partial();

// Define the main CodegenConfig Zod schema
export const CodegenConfigSchema = z.object({
    entities: z.string().default('src/entities/**/*.ts'),
    output: z.string().default('src/generated/entity-schemas.ts'),
    watch: z.boolean().default(false),
    silent: z.boolean().default(false),
    naming: NamingConventionSchema.optional(),
    schemas: SchemasConfigSchema.optional(),
});

// Export the TypeScript type inferred from the Zod schema
export type CodegenConfig = z.infer<typeof CodegenConfigSchema>;

import * as path from 'node:path';
import * as process from 'node:process';
import { createEntitySchemas } from 'typeorm-zod';
import type { z } from 'zod';
import type { CodegenConfig } from './config';
import type { EntityClass } from './entity-loader';

export interface GeneratedSchema {
    entityName: string;
    className: string;
    schemasVarName: string;
    fullTypeName: string;
    createDtoName: string;
    updateDtoName: string;
    patchDtoName: string;
    queryDtoName: string;
    validateCreateFnName: string;
    validateUpdateFnName: string;
    validatePatchFnName: string;
    validateQueryFnName: string;
}

/**
 * Internal Zod schema structure for accessing _def properties
 */
interface ZodInternalDef {
    typeName?: string;
    options?: z.ZodTypeAny[];
    innerType?: z.ZodTypeAny;
    type?: z.ZodTypeAny;
    shape?: () => Record<string, z.ZodTypeAny>;
}

interface ZodInternal extends z.ZodTypeAny {
    _def: ZodInternalDef;
    shape?: Record<string, z.ZodTypeAny>;
    options?: string[] | z.ZodTypeAny[];
    element?: z.ZodTypeAny;
    value?: unknown;
    unwrap?: () => z.ZodTypeAny;
    removeDefault?: () => z.ZodTypeAny;
    innerType?: () => z.ZodTypeAny;
}

/**
 * Converts a Zod schema into its equivalent TypeScript type string.
 * This is a simplified implementation and might need to be expanded for full Zod type support.
 * @param zodSchema The Zod schema to convert.
 * @returns A string representing the TypeScript type.
 */
function zodSchemaToTypeScriptType(zodSchema: z.ZodTypeAny, depth = 0): string {
    // Use _def.typeName instead of instanceof to avoid issues with multiple Zod instances
    const internal = zodSchema as ZodInternal;
    const typeName = internal._def?.typeName;

    if (typeName === 'ZodString') {
        return 'string';
    } else if (typeName === 'ZodNumber') {
        return 'number';
    } else if (typeName === 'ZodBoolean') {
        return 'boolean';
    } else if (typeName === 'ZodDate') {
        return 'Date';
    } else if (typeName === 'ZodArray') {
        const el = internal._def?.type ?? internal.element;
        return `Array<${zodSchemaToTypeScriptType(el as z.ZodTypeAny)}>`;
    } else if (typeName === 'ZodObject') {
        const shape = internal.shape ?? internal._def?.shape?.();
        if (!shape) {
            console.warn('ZodObject has no shape at depth', depth);
            return 'any';
        }
        const properties = Object.keys(shape)
            .map((key) => {
                const propSchema = shape[key];
                if (!propSchema) return '';
                const isOptional = propSchema.isOptional();
                const typeString = zodSchemaToTypeScriptType(propSchema, depth + 1);
                return `${key}${isOptional ? '?' : ''}: ${typeString};`;
            })
            .filter(Boolean)
            .join('\n');
        return `{\n${properties}}`;
    } else if (typeName === 'ZodOptional') {
        const innerType = zodSchemaToTypeScriptType(internal.unwrap?.() ?? zodSchema, depth + 1);
        // Don't add | undefined if it's already there
        if (innerType.includes(' | undefined')) {
            return innerType;
        }
        // If we're in an object property context (depth > 0), the '?' will handle undefined
        // so we don't need to add it to the type
        return depth > 0 ? innerType : `${innerType} | undefined`;
    } else if (typeName === 'ZodNullable') {
        const innerType = zodSchemaToTypeScriptType(internal.unwrap?.() ?? zodSchema, depth + 1);
        if (innerType.includes(' | null')) {
            return innerType;
        }
        return `${innerType} | null`;
    } else if (typeName === 'ZodDefault') {
        return zodSchemaToTypeScriptType(internal.removeDefault?.() ?? zodSchema);
    } else if (typeName === 'ZodEnum') {
        const opts = internal.options as string[] | undefined;
        return opts?.map((opt: string) => `'${opt}'`).join(' | ') ?? 'string';
    } else if (typeName === 'ZodLiteral') {
        return typeof internal.value === 'string' ? `'${internal.value}'` : String(internal.value);
    } else if (typeName === 'ZodUnion') {
        const opts = (internal._def?.options ?? internal.options ?? []) as z.ZodTypeAny[];
        return opts.map((opt) => zodSchemaToTypeScriptType(opt)).join(' | ');
    } else if (typeName === 'ZodAny') {
        return 'any';
    } else if (typeName === 'ZodUnknown') {
        return 'unknown';
    } else if (typeName === 'ZodNever') {
        return 'never';
    } else if (typeName === 'ZodVoid') {
        return 'void';
    } else if (typeName === 'ZodCatch') {
        return zodSchemaToTypeScriptType(internal._def.innerType as z.ZodTypeAny);
    } else if (typeName === 'ZodEffects') {
        // Handle transforms/refinements - get the underlying type
        return zodSchemaToTypeScriptType(internal.innerType?.() ?? zodSchema);
    }

    // Fallback for unsupported Zod types
    return 'any';
}

/**
 * Generates TypeScript type definitions and Zod schema collections from entity classes.
 * @param entityClasses An array of [className, classConstructor] tuples.
 * @param config The codegen configuration.
 * @param entityFilePaths
 * @returns The complete generated TypeScript content as a string.
 */
export function generateSchemasAndTypes(
    entityClasses: Array<[string, EntityClass]>,
    config: CodegenConfig,
    entityFilePaths: string[] // Added entityFilePaths parameter
): string {
    let output = '// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.\n\n';
    output += '// @ts-ignore: `z` is used indirectly by `createEntitySchemas`\n'; // Suppress unused z warning
    output += "import {createEntitySchemas} from 'typeorm-zod';\n\n";

    const outputFilePath: string = config.output; // Ensure it's a string

    // Generate imports for entity classes
    for (const [className, _classConstructor] of entityClasses) {
        // Find the source file for this class by searching through the loaded modules
        const outputDir = path.resolve(process.cwd(), path.dirname(outputFilePath));
        // Map className back to its file path from the resolution process
        const entityFilePath = entityFilePaths.find((filePath) => {
            // Extract class name from file path for matching (simple heuristic)
            const fileName = path.basename(filePath, '.ts');
            return fileName.toLowerCase().includes(className.toLowerCase());
        });
        if (!entityFilePath) continue;
        const relativePath = path.relative(outputDir, entityFilePath).replace(/\\/g, '/');
        const importPath = `./${relativePath.replace(/\.ts$/, '')}`;
        output += `import { ${className} } from '${importPath}';\n`;
    }
    output += '\n';

    const generatedSchemas: GeneratedSchema[] = [];

    for (const [className, classConstructor] of entityClasses) {
        // Apply naming conventions
        const entityName = className.replace(/Entity$/, ''); // e.g., TestUserEntity -> TestUser
        const schemasVarName = config.naming?.entityToSchemasName?.(className) || `${entityName}Schemas`;
        const fullTypeName = config.naming?.entityToTypeName?.(className) || entityName;
        const createDtoName = config.naming?.entityToCreateDtoName?.(className) || `Create${entityName}Dto`;
        const updateDtoName = config.naming?.entityToUpdateDtoName?.(className) || `Update${entityName}Dto`;
        const patchDtoName = config.naming?.entityToPatchDtoName?.(className) || `Patch${entityName}Dto`;
        const queryDtoName = config.naming?.entityToQueryDtoName?.(className) || `${entityName}QueryDto`;
        const validateCreateFnName =
            config.naming?.entityToValidateCreateName?.(className) || `validateCreate${entityName}`;
        const validateUpdateFnName =
            config.naming?.entityToValidateUpdateName?.(className) || `validateUpdate${entityName}`;
        const validatePatchFnName =
            config.naming?.entityToValidatePatchName?.(className) || `validatePatch${entityName}`;
        const validateQueryFnName =
            config.naming?.entityToValidateQueryName?.(className) || `validateQuery${entityName}`;

        generatedSchemas.push({
            entityName,
            className,
            schemasVarName,
            fullTypeName,
            createDtoName,
            updateDtoName,
            patchDtoName,
            queryDtoName,
            validateCreateFnName,
            validateUpdateFnName,
            validatePatchFnName,
            validateQueryFnName,
        });

        const overrides = config.schemas?.entityOverrides?.[className];
        const overridesString = overrides ? JSON.stringify(overrides) : 'undefined';
        output += `export const ${schemasVarName} = createEntitySchemas(${className}, ${overridesString});\n`;

        // Generate TypeScript types by inspecting the Zod schemas
        const entitySchemas = createEntitySchemas(classConstructor, overrides);

        // Debug: Check if schemas were created
        if (!config.silent) {
            console.log(`Generating types for ${className}:`);
            console.log(`  Schema keys:`, Object.keys(entitySchemas.full.shape || {}));
        }

        output += `export type ${fullTypeName} = ${zodSchemaToTypeScriptType(entitySchemas.full)};\n`;
        output += `export type ${createDtoName} = ${zodSchemaToTypeScriptType(entitySchemas.create)};\n`;
        output += `export type ${updateDtoName} = ${zodSchemaToTypeScriptType(entitySchemas.update)};\n`;
        output += `export type ${patchDtoName} = ${zodSchemaToTypeScriptType(entitySchemas.patch)};\n`;
        output += `export type ${queryDtoName} = ${zodSchemaToTypeScriptType(entitySchemas.query)};\n\n`;

        // Generate validation helpers
        output += `export const ${validateCreateFnName} = (data: unknown): ${createDtoName} => ${schemasVarName}.create.parse(data) as ${createDtoName};\n`;
        output += `export const ${validateUpdateFnName} = (data: unknown): ${updateDtoName} => ${schemasVarName}.update.parse(data) as ${updateDtoName};\n`;
        output += `export const ${validatePatchFnName} = (data: unknown): ${patchDtoName} => ${schemasVarName}.patch.parse(data) as ${patchDtoName};\n`;
        output += `export const ${validateQueryFnName} = (data: unknown): ${queryDtoName} => ${schemasVarName}.query.parse(data) as ${queryDtoName};\n\n`;
    }

    // Add AllSchemas export
    output += 'export const AllSchemas = {\n';
    generatedSchemas.forEach((schema) => {
        output += `    ${schema.entityName}: ${schema.schemasVarName},\n`;
    });
    output += '} as const;\n';

    return output;
}

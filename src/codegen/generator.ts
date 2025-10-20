import * as path from 'node:path';
import * as process from 'node:process';
import { z } from 'zod';
import { createEntitySchemas } from '../../src'; // Adjust path as needed
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
    // Add other generated names as needed
}

/**
 * Converts a Zod schema into its equivalent TypeScript type string.
 * This is a simplified implementation and might need to be expanded for full Zod type support.
 * @param zodSchema The Zod schema to convert.
 * @returns A string representing the TypeScript type.
 */
function zodSchemaToTypeScriptType(zodSchema: z.ZodTypeAny): string {
    if (zodSchema instanceof z.ZodString) {
        return 'string';
    } else if (zodSchema instanceof z.ZodNumber) {
        return 'number';
    } else if (zodSchema instanceof z.ZodBoolean) {
        return 'boolean';
    } else if (zodSchema instanceof z.ZodDate) {
        return 'Date';
    } else if (zodSchema instanceof z.ZodArray) {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing internal Zod properties
        const el = (zodSchema as any)?._def?.type ?? (zodSchema as any)?.element;
        return `Array<${zodSchemaToTypeScriptType(el as z.ZodTypeAny)}>`;
    } else if (zodSchema instanceof z.ZodObject) {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing internal Zod properties
        const shape = (zodSchema as any).shape ?? (zodSchema as any)._def?.shape?.();
        const properties = Object.keys(shape)
            .map((key) => {
                const propSchema = shape[key];
                const isOptional = propSchema.isOptional();
                const isNullable = propSchema.isNullable();
                let typeString = zodSchemaToTypeScriptType(propSchema);

                if (isOptional && !typeString.endsWith(' | undefined')) {
                    typeString += ' | undefined';
                }
                if (isNullable && !typeString.endsWith(' | null')) {
                    typeString += ' | null';
                }
                return `${key}${isOptional ? '?' : ''}: ${typeString};`;
            })
            .join('\n');
        return `{\n${properties}}`; // Removed extra newline here
    } else if (zodSchema instanceof z.ZodOptional) {
        const innerType = zodSchemaToTypeScriptType(zodSchema.unwrap());
        // Only add | undefined if it's not already there
        if (innerType.includes(' | undefined')) {
            return innerType;
        }
        return `${innerType} | undefined`;
    } else if (zodSchema instanceof z.ZodNullable) {
        return `${zodSchemaToTypeScriptType(zodSchema.unwrap())} | null`;
    } else if (zodSchema instanceof z.ZodDefault) {
        return zodSchemaToTypeScriptType(zodSchema.removeDefault());
    } else if (zodSchema instanceof z.ZodEnum) {
        return zodSchema.options.map((opt: string) => `'${opt}'`).join(' | ');
    } else if (zodSchema instanceof z.ZodLiteral) {
        return typeof zodSchema.value === 'string' ? `'${zodSchema.value}'` : String(zodSchema.value);
    } else if (zodSchema instanceof z.ZodUnion) {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing internal Zod properties
        const opts: z.ZodTypeAny[] = (zodSchema as any)?._def?.options ?? (zodSchema as any)?.options ?? [];
        return opts.map((opt) => zodSchemaToTypeScriptType(opt)).join(' | ');
    } else if (zodSchema instanceof z.ZodAny) {
        return 'any';
    } else if (zodSchema instanceof z.ZodUnknown) {
        return 'unknown';
    } else if (zodSchema instanceof z.ZodNever) {
        return 'never';
    } else if (zodSchema instanceof z.ZodVoid) {
        return 'void';
    } else if (zodSchema instanceof z.ZodCatch) {
        // ZodCatch does not have innerType, it has _def.innerType
        return zodSchemaToTypeScriptType(zodSchema._def.innerType as z.ZodTypeAny); // Access _def.innerType
    } else if (zodSchema instanceof z.ZodEffects) {
        // Handle transforms/refinements - get the underlying type
        return zodSchemaToTypeScriptType(zodSchema.innerType());
    }

    // Fallback for unsupported Zod types
    console.warn('Unsupported Zod type encountered:', zodSchema);
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

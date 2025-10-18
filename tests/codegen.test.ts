import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type CodegenConfig, CodegenConfigSchema } from '../src/codegen/config';
import { loadEntityClasses } from '../src/codegen/entity-loader';
import { resolveEntityFiles } from '../src/codegen/entity-resolver';
import { generateSchemasAndTypes } from '../src/codegen/generator';

const testEntitiesPath = './tests/helpers/entities';
const generatedOutputPath = './src/generated/test-codegen-output.ts';

describe('Codegen Core Logic', () => {
    let config: CodegenConfig;

    beforeAll(() => {
        // Use a default config for testing
        config = CodegenConfigSchema.parse({
            entities: `${testEntitiesPath}/**/*.ts`,
            output: generatedOutputPath,
            naming: {
                entityToTypeName: (name: string) => `My${name.replace('Entity', '')}`,
            },
            schemas: {
                defaultOmitFromCreate: ['id'],
            },
        });
    });

    it('should resolve entity files correctly, ignoring index.ts', async () => {
        const files = await resolveEntityFiles(config.entities);
        const baseNames = files.map((file) => path.basename(file));

        expect(baseNames).toEqual(
            expect.arrayContaining(['TestEntityLegacy.ts', 'TestEntityWithSkip.ts', 'TestUserEntity.ts'])
        );
        expect(baseNames).not.toContain('index.ts');
        expect(files.length).toBe(3); // Ensure only these three are found
    });

    it('should load entity classes correctly', async () => {
        const files = await resolveEntityFiles(config.entities);
        const entityClasses = await loadEntityClasses(files);

        expect(entityClasses.length).toBe(3);
        const classNames = entityClasses.map(([name]) => name);
        expect(classNames).toEqual(
            expect.arrayContaining(['TestEntityLegacy', 'TestEntityWithSkip', 'TestUserEntity'])
        );
    });

    it('should generate schemas and types correctly with custom naming', async () => {
        const files = await resolveEntityFiles(config.entities);
        const entityClasses = await loadEntityClasses(files);
        const generatedContent = generateSchemasAndTypes(entityClasses, config, files);

        // Basic checks for generated content structure
        expect(generatedContent).toContain('// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.');
        expect(generatedContent).toContain('import { z } from "zod";');
        expect(generatedContent).toContain(`import { createEntitySchemas } from './..';`); // Updated to relative path

        // Check for specific entity schemas and types
        expect(generatedContent).toContain(
            'export const TestEntityLegacySchemas = createEntitySchemas(TestEntityLegacy);'
        );
        expect(generatedContent).toContain('export type MyTestLegacy = {');
        expect(generatedContent).toContain('export type CreateTestEntityLegacyDto = {');
        expect(generatedContent).toContain(
            'export const validateCreateTestEntityLegacy = (data: unknown): CreateTestEntityLegacyDto => TestEntityLegacySchemas.create.parse(data) as CreateTestEntityLegacyDto;'
        ); // Updated assertion

        expect(generatedContent).toContain('export const TestUserSchemas = createEntitySchemas(TestUserEntity);');
        expect(generatedContent).toContain('export type MyTestUser = {');
        expect(generatedContent).toContain('export type CreateTestUserDto = {');
        expect(generatedContent).toContain(
            'export const validateCreateTestUser = (data: unknown): CreateTestUserDto => TestUserSchemas.create.parse(data) as CreateTestUserDto;'
        ); // Updated assertion

        // Check for AllSchemas export
        expect(generatedContent).toContain('export const AllSchemas = {');
        expect(generatedContent).toContain('    TestEntityLegacy: TestEntityLegacySchemas,');
        expect(generatedContent).toContain('    TestEntityWithSkip: TestEntityWithSkipSchemas,');
        expect(generatedContent).toContain('    TestUser: TestUserSchemas,');

        // Check for custom naming application
        expect(generatedContent).toContain('export type MyTestLegacy =');
        expect(generatedContent).toContain('export type MyTestUser =');

        // Check for omitted fields in Create DTO (based on defaultOmitFromCreate: ['id'])
        expect(generatedContent).not.toContain(
            `id: string;\n};\nexport type CreateTestEntityLegacyDto = {\nid: string;`
        ); // Should not contain id
        expect(generatedContent).toContain(`name: string;};`); // Fixed line

        // Further detailed checks for type content would ideally use snapshot testing
        // For now, we rely on stringtoContain and not.toContain
    });

    // Clean up generated output file if it exists
    afterAll(async () => {
        try {
            await fs.unlink(generatedOutputPath);
        } catch (_error) {
            // Ignore if file doesn't exist
        }
    });
});

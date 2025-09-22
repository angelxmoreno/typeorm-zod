import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { createEntitySchemas, ZodProperty } from '../src';
import { TestEntityLegacy, TestEntityWithSkip } from './helpers/entities';

describe('Per-Property Skip Functionality', () => {
    const schemas = createEntitySchemas(TestEntityWithSkip);
    const legacySchemas = createEntitySchemas(TestEntityLegacy);

    describe('Schema Generation with Skip Settings', () => {
        it('should generate all schema variants', () => {
            expect(schemas.full).toBeDefined();
            expect(schemas.create).toBeDefined();
            expect(schemas.update).toBeDefined();
            expect(schemas.patch).toBeDefined();
            expect(schemas.query).toBeDefined();
        });

        it('should respect skip settings for create schema', () => {
            const createKeys = Object.keys(schemas.create.shape);

            // Should include regular fields
            expect(createKeys).toContain('title');
            expect(createKeys).toContain('content');
            expect(createKeys).toContain('secretToken');

            // Should exclude fields with 'create' in skip array
            expect(createKeys).not.toContain('id'); // skip: ['create', 'update']
            expect(createKeys).not.toContain('version'); // skip: ['create', 'update', 'patch']
            expect(createKeys).not.toContain('createdAt'); // skip: ['create']
            expect(createKeys).not.toContain('updatedAt'); // skip: ['create']
            expect(createKeys).not.toContain('deletedAt'); // skip: ['create', 'update']
        });

        it('should respect skip settings for update schema', () => {
            const updateKeys = Object.keys(schemas.update.shape);

            // Should include fields allowed in update
            expect(updateKeys).toContain('title');
            expect(updateKeys).toContain('content');
            expect(updateKeys).toContain('createdAt'); // Not in skip for update
            expect(updateKeys).toContain('updatedAt'); // Not in skip for update
            expect(updateKeys).toContain('secretToken');

            // Should exclude fields with 'update' in skip array
            expect(updateKeys).not.toContain('id'); // skip: ['create', 'update']
            expect(updateKeys).not.toContain('version'); // skip: ['create', 'update', 'patch']
            expect(updateKeys).not.toContain('deletedAt'); // skip: ['create', 'update']
        });

        it('should respect skip settings for patch schema', () => {
            const patchKeys = Object.keys(schemas.patch.shape);

            // Should include fields allowed in patch
            expect(patchKeys).toContain('id'); // Not in skip for patch
            expect(patchKeys).toContain('title');
            expect(patchKeys).toContain('content');
            expect(patchKeys).toContain('createdAt'); // Not in skip for patch
            expect(patchKeys).toContain('updatedAt'); // Not in skip for patch
            expect(patchKeys).toContain('deletedAt'); // Not in skip for patch
            expect(patchKeys).toContain('secretToken');

            // Should exclude fields with 'patch' in skip array
            expect(patchKeys).not.toContain('version'); // skip: ['create', 'update', 'patch']
        });

        it('should respect skip settings for query schema', () => {
            const queryKeys = Object.keys(schemas.query.shape);

            // Should include most fields for querying
            expect(queryKeys).toContain('id'); // Not in skip for query
            expect(queryKeys).toContain('title');
            expect(queryKeys).toContain('content');
            expect(queryKeys).toContain('version'); // Not in skip for query
            expect(queryKeys).toContain('createdAt'); // Not in skip for query
            expect(queryKeys).toContain('updatedAt'); // Not in skip for query
            expect(queryKeys).toContain('deletedAt'); // Not in skip for query

            // Should exclude sensitive fields
            expect(queryKeys).not.toContain('secretToken'); // skip: ['query']
        });

        it('should include all fields in full schema regardless of skip settings', () => {
            const fullKeys = Object.keys(schemas.full.shape);

            // Full schema should always include everything
            expect(fullKeys).toContain('id');
            expect(fullKeys).toContain('title');
            expect(fullKeys).toContain('content');
            expect(fullKeys).toContain('version');
            expect(fullKeys).toContain('createdAt');
            expect(fullKeys).toContain('updatedAt');
            expect(fullKeys).toContain('deletedAt');
            expect(fullKeys).toContain('secretToken');
        });
    });

    describe('Schema Validation with Skip Settings', () => {
        it('should validate create data correctly with skip settings', () => {
            const validCreateData = {
                title: 'Test Title',
                content: 'Test content',
                secretToken: 'secret123',
            };

            const result = schemas.create.safeParse(validCreateData);
            expect(result.success).toBe(true);

            if (result.success) {
                expect(result.data.title).toBe('Test Title');
                expect(result.data.content).toBe('Test content');
                expect(result.data.secretToken).toBe('secret123');
            }
        });

        it('should strip skipped fields from create input', () => {
            const invalidCreateData = {
                id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Should be skipped
                title: 'Test Title',
                content: 'Test content',
                version: 1, // Should be skipped
                createdAt: new Date(), // Should be skipped
            };

            const result = schemas.create.safeParse(invalidCreateData);
            expect(result.success).toBe(true);
            if (result.success) {
                // If parsing succeeds, the skipped fields should not be present
                expect(result.data).not.toHaveProperty('id');
                expect(result.data).not.toHaveProperty('version');
                expect(result.data).not.toHaveProperty('createdAt');
            }
        });

        it('should validate update data correctly with skip settings', () => {
            const validUpdateData = {
                title: 'Updated Title',
                content: 'Updated content',
                createdAt: new Date(), // Allowed in update
                updatedAt: new Date(), // Allowed in update
            };

            const result = schemas.update.safeParse(validUpdateData);
            expect(result.success).toBe(true);
        });

        it('should validate patch data correctly with skip settings', () => {
            const validPatchData = {
                id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Allowed in patch
                title: 'Patched Title',
                deletedAt: new Date(), // Allowed in patch
            };

            const result = schemas.patch.safeParse(validPatchData);
            expect(result.success).toBe(true);
        });

        it('should validate query data correctly with skip settings', () => {
            const validQueryData = {
                id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                title: 'Search Title',
                version: 5, // Allowed in query
            };

            const result = schemas.query.safeParse(validQueryData);
            expect(result.success).toBe(true);
        });
    });

    describe('Backward Compatibility', () => {
        it('should work with legacy syntax (no skip parameter)', () => {
            const legacyCreateKeys = Object.keys(legacySchemas.create.shape);
            const legacyFullKeys = Object.keys(legacySchemas.full.shape);

            // Should use global defaults for create schema (omit auto-generated fields)
            expect(legacyCreateKeys).not.toContain('id'); // Global default omit
            expect(legacyCreateKeys).not.toContain('createdAt'); // Global default omit
            expect(legacyCreateKeys).toContain('name'); // Regular field

            // Full schema should include everything
            expect(legacyFullKeys).toContain('id');
            expect(legacyFullKeys).toContain('name');
            expect(legacyFullKeys).toContain('createdAt');
        });

        it('should validate legacy entity correctly', () => {
            const validData = {
                name: 'Test Name',
            };

            const result = legacySchemas.create.safeParse(validData);
            expect(result.success).toBe(true);

            if (result.success) {
                expect(result.data.name).toBe('Test Name');
            }
        });
    });

    describe('Error Cases', () => {
        it('should handle empty skip arrays', () => {
            class TestEmptySkip {
                @ZodProperty({
                    schema: z.string(),
                    skip: [], // Empty skip array
                })
                field: string;
            }

            const testSchemas = createEntitySchemas(TestEmptySkip);

            // Field should appear in all schemas when skip array is empty
            expect(Object.keys(testSchemas.full.shape)).toContain('field');
            expect(Object.keys(testSchemas.create.shape)).toContain('field');
            expect(Object.keys(testSchemas.update.shape)).toContain('field');
            expect(Object.keys(testSchemas.patch.shape)).toContain('field');
            expect(Object.keys(testSchemas.query.shape)).toContain('field');
        });

        it('should handle undefined skip parameter', () => {
            class TestUndefinedSkip {
                @ZodProperty({
                    schema: z.string(),
                    skip: undefined, // Undefined skip
                })
                field: string;
            }

            const testSchemas = createEntitySchemas(TestUndefinedSkip);

            // Should behave like legacy syntax when skip is undefined
            expect(Object.keys(testSchemas.full.shape)).toContain('field');
            expect(Object.keys(testSchemas.create.shape)).toContain('field');
        });
    });
});

import { describe, expect, it } from 'bun:test';
import { createEntitySchemas } from '../src';
import { TestUserEntity } from './helpers/entities';

describe(' typeorm-zod', () => {
    const schemas = createEntitySchemas(TestUserEntity);

    it('should generate all schema variants', () => {
        expect(schemas.full).toBeDefined();
        expect(schemas.create).toBeDefined();
        expect(schemas.update).toBeDefined();
        expect(schemas.patch).toBeDefined();
        expect(schemas.query).toBeDefined();
    });

    it('should have correct schema keys', () => {
        const fullKeys = Object.keys(schemas.full.shape);
        const createKeys = Object.keys(schemas.create.shape);

        expect(fullKeys).toContain('id');
        expect(fullKeys).toContain('name');
        expect(fullKeys).toContain('apiKey');
        expect(fullKeys).toContain('createdAt');

        // Create schema should omit auto-generated fields
        expect(createKeys).not.toContain('id');
        expect(createKeys).not.toContain('createdAt');
        expect(createKeys).toContain('name');
        expect(createKeys).toContain('apiKey');
    });

    it('should validate create data correctly', () => {
        const validData = {
            name: 'John Doe',
            apiKey: 'super-secret-key-123',
            email: 'john@example.com',
            isActive: true,
        };

        const result = schemas.create.safeParse(validData);
        expect(result.success).toBe(true);

        if (result.success) {
            expect(result.data.name).toBe('John Doe');
            expect(result.data.isActive).toBe(true);
        }
    });

    it('should reject invalid create data', () => {
        const invalidData = {
            name: '', // Too short
            apiKey: 'short', // Too short
            email: 'invalid-email', // Invalid format
        };

        const result = schemas.create.safeParse(invalidData);
        expect(result.success).toBe(false);

        if (!result.success) {
            const issues = result.error.issues || [];
            expect(issues.length).toBeGreaterThan(0);
            expect(issues.some((e) => e.path.includes('name'))).toBe(true);
            expect(issues.some((e) => e.path.includes('apiKey'))).toBe(true);
            expect(issues.some((e) => e.path.includes('email'))).toBe(true);
        }
    });

    it('should validate update data correctly', () => {
        const validUpdateData = {
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            name: 'Updated Name',
        };

        const result = schemas.update.safeParse(validUpdateData);
        expect(result.success).toBe(true);
    });

    it('should require id for update schema', () => {
        const dataWithoutId = {
            name: 'Updated Name',
        };

        const result = schemas.update.safeParse(dataWithoutId);
        expect(result.success).toBe(false);

        if (!result.success) {
            const issues = result.error.issues || [];
            expect(issues.some((e) => e.path.includes('id'))).toBe(true);
        }
    });

    it('should handle defaults correctly', () => {
        const minimalData = {
            name: 'Test User',
            apiKey: 'test-secret-key-123',
        };

        const result = schemas.create.parse(minimalData);
        expect(result.isActive).toBe(true); // Should use default value
    });
});

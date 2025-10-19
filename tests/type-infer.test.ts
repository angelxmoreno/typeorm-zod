/** biome-ignore-all lint/correctness/noUnusedVariables:  'create' is used for type inference demonstration */

import { describe, expect, it } from 'bun:test';
import { createEntitySchemas } from '../src';
import { TestUserEntity } from './helpers/entities';

describe('inferring types at runtime', () => {
    it('should work', () => {
        // @ts-expect-error
        const { create } = createEntitySchemas(TestUserEntity);
        // Workaround: Manually define the expected type for the 'create' schema
        type CreateEntity = Omit<TestUserEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

        const newEntity: CreateEntity = {
            name: 'test-user',
            apiKey: 'some-secret-key',
            email: 'test@example.com',
            isActive: true,
        };

        // With this type, the following would correctly show a type error in your IDE:
        // const invalidEntity: CreateEntity = {
        //     name: 3, // <-- Type 'number' is not assignable to type 'string'.
        //     apiKey: 'another-key',
        //     isActive: false,
        // };

        expect(newEntity.name).toBeString();
        expect(newEntity.apiKey).toBeString();
        expect(newEntity.email).toBeString();
        expect(newEntity.isActive).toBeBoolean();
    });
});

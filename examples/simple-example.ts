/**
 * Simple example showing  @repo/typeorm-zod usage
 */

import { z } from 'zod';
import { createEntitySchemas, ZodProperty } from '../src';

// Simple entity with Zod validation
class UserEntity {
    @ZodProperty(z.string().uuid())
    id: string;

    @ZodProperty(z.string().min(1, 'Name is required').max(255, 'Name too long'))
    name: string;

    @ZodProperty(z.string().min(10, 'API key must be at least 10 characters'))
    apiKey: string;

    @ZodProperty(z.string().email().optional())
    email?: string;

    @ZodProperty(z.boolean().default(true))
    isActive: boolean;

    @ZodProperty(z.date())
    createdAt: Date;

    @ZodProperty(z.date())
    updatedAt: Date;

    @ZodProperty(z.date().nullable())
    deletedAt: Date | null;
}

// Generate all schemas automatically
const UserSchemas = createEntitySchemas(UserEntity);

// Export commonly used schemas
const CreateUserSchema = UserSchemas.create;
const UpdateUserSchema = UserSchemas.update;
const QueryUserSchema = UserSchemas.query;

// Export inferred types
type CreateUserDto = z.infer<typeof CreateUserSchema>;
type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

// Example usage
console.log('===  @repo/typeorm-zod Example ===');

console.log('\n1. Generated Schema Keys:');
console.log('Create:', Object.keys(CreateUserSchema.shape));
console.log('Update:', Object.keys(UpdateUserSchema.shape));
console.log('Query:', Object.keys(QueryUserSchema.shape));

console.log('\n2. Testing Create Validation:');
try {
    const validData: CreateUserDto = {
        name: 'John Doe',
        apiKey: 'secure-api-key-123',
        email: 'john@example.com',
        isActive: true,
    };

    const validated = CreateUserSchema.parse(validData);
    console.log('✅ Valid data:', validated);
} catch (error) {
    console.log('❌ Validation failed:', error);
}

console.log('\n3. Testing Invalid Data:');
try {
    CreateUserSchema.parse({
        name: '', // Too short
        apiKey: 'short', // Too short
        email: 'invalid-email', // Invalid format
    });
} catch (error: unknown) {
    console.log('✅ Correctly rejected invalid data:');
    const zodError = error as { issues?: Array<{ path: Array<string | number>; message: string }> };
    const issues = zodError.issues || [];
    issues.forEach((issue) => {
        console.log(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
}

console.log('\n4. Testing Update Schema:');
try {
    const updateData: UpdateUserDto = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        name: 'John Updated',
        // email and other fields are optional for updates
    };

    const validated = UpdateUserSchema.parse(updateData);
    console.log('✅ Update data validated:', validated);
} catch (error) {
    console.log('❌ Update validation failed:', error);
}

console.log('\n5. TypeScript Type Safety:');
const createUser = (data: CreateUserDto) => {
    // Perfect type safety - data is fully typed
    console.log(`Creating user: ${data.name}`);
    console.log(`API key: ${data.apiKey.substring(0, 5)}...`);
    console.log(`Email: ${data.email || 'not provided'}`);
    console.log(`Active: ${data.isActive}`);
    return data;
};

const sampleInput: z.input<typeof CreateUserSchema> = {
    name: 'TypeSafe User',
    apiKey: 'type-safe-key-456',
    // email is optional
    // isActive will use default value
};

const sampleUser: CreateUserDto = CreateUserSchema.parse(sampleInput);
createUser(sampleUser);

console.log('\n=== Example Complete ===');

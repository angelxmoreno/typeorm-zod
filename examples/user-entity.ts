/**
 * Example: How to use  @repo/typeorm-zod with your UserEntity
 */

import { Column, Entity, Index, Like, OneToMany, type Relation } from 'typeorm';
import { z } from 'zod';
import { createEntitySchemas, ZodProperty } from '../src';

// Mock AppEntity for this example (since we can't import from database package)
class AppEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

// Enhanced UserEntity with Zod validation
@Entity()
export class UserEntity extends AppEntity {
    @ZodProperty(z.string().min(1, 'Name is required').max(255, 'Name too long'))
    @Column()
    name: string;

    @ZodProperty(z.string().min(10, 'API key must be at least 10 characters'))
    @Column()
    @Index({ unique: true })
    apiKey: string;

    // Relationships don't need Zod validation (they're not in DTOs)
    @OneToMany(
        () => UserPermissionEntity,
        (permission) => permission.user
    )
    permissions: Relation<UserPermissionEntity[]>;
}

// Mock UserPermissionEntity for this example
class UserPermissionEntity {
    user: UserEntity;
}

// Generate all schemas automatically
export const UserSchemas = createEntitySchemas(UserEntity);

// Export commonly used schemas
export const CreateUserSchema = UserSchemas.create;
export const UpdateUserSchema = UserSchemas.update;
export const QueryUserSchema = UserSchemas.query;

// Export inferred types
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type QueryUserDto = z.infer<typeof QueryUserSchema>;

// Example usage in services
export class UserService {
    async createUser(data: CreateUserDto) {
        // data is fully typed and validated
        console.log(`Creating user: ${data.name}`);
        console.log(`API key length: ${(data.apiKey as string).length}`);

        // Create and save entity
        // const user = this.userRepository.create(data);
        // return await this.userRepository.save(user);
    }

    async updateUser(data: UpdateUserDto) {
        // data.id is required, everything else optional
        console.log(`Updating user ${data.id}`);
        if (data.name) console.log(`New name: ${data.name}`);

        // Update entity
        // await this.userRepository.update(data.id, data);
    }

    async searchUsers(query: QueryUserDto) {
        // All fields optional for flexible querying
        const where: Record<string, unknown> = {};
        if (query.name) where.name = Like(`%${query.name}%`);
        if (query.apiKey) where.apiKey = query.apiKey;

        // return await this.userRepository.find({ where });
    }
}

// Example API route validation
export const validateCreateUser = (requestBody: unknown): CreateUserDto => {
    return CreateUserSchema.parse(requestBody);
};

export const validateUpdateUser = (requestBody: unknown): UpdateUserDto => {
    return UpdateUserSchema.parse(requestBody);
};

// Example usage
console.log('=== UserEntity Example ===');

// Test create validation
try {
    const createData = validateCreateUser({
        name: 'John Doe',
        apiKey: 'secure-api-key-123',
    });
    console.log('✅ Create validation passed:', createData);
} catch (error) {
    console.log('❌ Create validation failed:', error);
}

// Test update validation
try {
    const updateData = validateUpdateUser({
        id: 'uuid-123',
        name: 'John Updated',
    });
    console.log('✅ Update validation passed:', updateData);
} catch (error) {
    console.log('❌ Update validation failed:', error);
}

// Show schema keys
console.log('\nGenerated Schema Keys:');
console.log('Create:', Object.keys(CreateUserSchema.shape));
console.log('Update:', Object.keys(UpdateUserSchema.shape));
console.log('Query:', Object.keys(QueryUserSchema.shape));

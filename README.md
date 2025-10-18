# typeorm-zod

Seamless integration between TypeORM entities and Zod validation using WeakMap-based metadata storage to prevent cross-entity pollution.

## Features

- **Pollution-Free Metadata Storage**: WeakMap-based metadata storage prevents entity metadata pollution
- **Inheritance-Aware Schema Generation**: Includes base class properties automatically  
- **Circular Dependency Safe**: Proper handling of circular dependencies between entities
- **Property Name Conflict Resolution**: Different entities can have properties with the same name
- **Automatic Schema Variants**: Create/update/patch schema variants generated automatically
- **TypeORM Integration**: Seamless integration with existing TypeORM decorators
- **Production Ready**: Comprehensive error handling and validation

## Code Generation (Codegen)

To further enhance developer experience and ensure perfect type safety, `typeorm-zod` now includes a powerful Code Generation (Codegen) feature. This feature automatically generates centralized schema files, static TypeScript type definitions (DTOs), and validation helper functions directly from your decorated entities.

### Benefits of Codegen:
- **Eliminates `z.infer` limitations**: Provides true static type definitions for your DTOs, enabling full IDE autocompletion and compile-time type checking.
- **Single Source of Truth**: All schemas, types, and validators are exported from a single generated file.
- **Automated Boilerplate**: Reduces manual schema and type definition, especially for complex entities and multiple schema variants.
- **Seamless Integration**: Generated types and validators are ready for use in API routes, service layers, and frontend applications.

### How to Use Codegen:

1.  **Create a Configuration File**: Define `typeorm-zod.codegen.config.ts` (or `.js`) in your project root. This file specifies entity locations, output paths, and custom naming conventions.
2.  **Run the Codegen CLI**: Execute `bun run codegen` (or `npm run codegen`, `yarn codegen`) to generate the schema and type file.
3.  **Integrate into Workflow**: Add the `codegen` command to your build pipeline (e.g., pre-build script) and consider using `--watch` mode during development.

For detailed configuration, examples, and advanced usage, please refer to the [Code Generation Feature Documentation](project-files/CODEGEN.md).

## Quick Start

With `typeorm-zod`, you define validation once and get comprehensive schemas:

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ZodProperty, ZodColumn, createEntitySchemas } from 'typeorm-zod';
import { z } from 'zod';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    @ZodProperty(z.string().uuid())
    id: string;

    @ZodColumn({ type: 'varchar', length: 255 }, z.string().min(1).max(255))
    name: string;

    @ZodColumn({ type: 'varchar', length: 255, unique: true }, z.string().email())
    email: string;

    @ZodColumn({ type: 'int', nullable: true }, z.number().int().positive().nullable())
    age?: number;
}

// Generate comprehensive schema collection
const userSchemas = createEntitySchemas(User);
// Available: full, create, update, patch, query schemas
```

## Installation

```bash
npm install typeorm-zod
# or
bun add typeorm-zod
# or
yarn add typeorm-zod
# or
pnpm add typeorm-zod
```

### Inheritance Support

```typescript
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Base entity class
export abstract class AppEntity {
    @PrimaryGeneratedColumn('uuid')
    @ZodProperty(z.string().uuid())
    id: string;

    @CreateDateColumn()
    @ZodProperty(z.date())
    createdAt: Date;

    @UpdateDateColumn()
    @ZodProperty(z.date())
    updatedAt: Date;
}

// Child entity inherits validation
@Entity()
export class Product extends AppEntity {
    @ZodColumn({ type: 'varchar', length: 255 }, z.string().min(1))
    name: string;

    @ZodColumn({ type: 'decimal', precision: 10, scale: 2 }, z.number().positive())
    price: number;
}

// Automatically includes base class properties
const productSchemas = createEntitySchemas(Product);
// Schemas include: id, createdAt, updatedAt, name, price
```

### Available Schema Variants

The `createEntitySchemas()` function generates 5 schema variants:

```typescript
const userSchemas = createEntitySchemas(User);

// Full schema - includes all fields
userSchemas.full;

// Create schema - omits id, createdAt, updatedAt, deletedAt
userSchemas.create;

// Update schema - id required, everything else optional
userSchemas.update;

// Patch schema - all fields optional
userSchemas.patch;

// Query schema - all fields optional (for filtering)
userSchemas.query;
```

### Per-Property Schema Control

Use the enhanced `@ZodProperty` decorator to exclude fields from specific schema variants:

```typescript
@Entity()
export class Note extends AppEntity {
    @Column('varchar', { length: 500 })
    @ZodProperty(z.string().min(1).max(500))
    title: string;

    @Column('longtext')
    @ZodProperty(z.string())
    content: string;

    // Auto-managed version field - exclude from create/update/patch
    @VersionColumn()
    @ZodProperty({
        schema: z.number().int().min(0),
        skip: ['create', 'update', 'patch']
    })
    version: number;

    // Auto-generated timestamp - exclude only from create
    @UpdateDateColumn()
    @ZodProperty({
        schema: z.date(),
        skip: ['create']
    })
    updatedAt: Date;
}

// Generated schemas automatically respect skip settings:
const noteSchemas = createEntitySchemas(Note);

// noteSchemas.create: { title, content } - no version or updatedAt
// noteSchemas.update: { id, title?, content?, updatedAt? } - no version  
// noteSchemas.full: { id, title, content, version, createdAt, updatedAt } - all fields
```

### Advanced Usage with Custom Options

```typescript
const userSchemas = createEntitySchemas(User, {
    // Additional fields to omit from create schema
    omitFromCreate: ['internalId'],
    
    // Additional fields to omit from update schema
    omitFromUpdate: ['email'], // Email cannot be updated
    
    // Custom field transformations
    transforms: {
        email: (schema) => schema.toLowerCase().trim(),
        age: (schema) => schema.min(13).max(120) // Add age constraints
    }
});
```

### Type Inference

All TypeScript types are automatically inferred:

```typescript
type CreateUserDto = z.infer<typeof userSchemas.create>;
type UpdateUserDto = z.infer<typeof userSchemas.update>;
type UserQueryDto = z.infer<typeof userSchemas.query>;

// Perfect type safety
const createUser = (data: CreateUserDto) => {
    // data.name is string
    // data.email is string | undefined  
    // data is fully typed and validated
};
```

### API Route Validation

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

// Create user endpoint
app.post('/users', 
    zValidator('json', userSchemas.create),
    async (c) => {
        const userData = c.req.valid('json');
        // userData is fully typed and validated
        
        const user = userRepository.create(userData);
        await userRepository.save(user);
        
        return c.json({ success: true, user });
    }
);

// Update user endpoint  
app.patch('/users/:id',
    zValidator('json', userSchemas.patch),
    async (c) => {
        const updateData = c.req.valid('json');
        const userId = c.req.param('id');
        
        await userRepository.update(userId, updateData);
        return c.json({ success: true });
    }
);
```

## API Reference

### Decorators

#### `@ZodProperty(zodSchema)` or `@ZodProperty({ schema, skip? })`

Adds Zod validation to any property with optional schema control:

**Basic Usage:**
```typescript
@ZodProperty(z.string().min(1).max(100))
name: string;

@ZodProperty(z.number().int().positive())
age: number;

@ZodProperty(z.string().email().optional())
email?: string;
```

**Advanced Usage with Per-Property Schema Control:**
```typescript
// Skip validation for specific schema variants
@ZodProperty({
    schema: z.number().int().min(0),
    skip: ['create', 'update', 'patch'] // Exclude from these schemas
})
version: number; // Auto-managed by TypeORM @VersionColumn

@ZodProperty({
    schema: z.date(),
    skip: ['create'] // Only exclude from create schema
})
updatedAt: Date; // Auto-managed, but allow in update/patch

@ZodProperty({
    schema: z.string().uuid(),
    skip: ['create', 'update'] // Only include in full, patch, and query
})
id: string; // Primary key - exclude from create/update
```

**Schema Variants:**
- `'full'` - Complete entity schema with all fields
- `'create'` - For creating new entities (typically excludes auto-generated fields)
- `'update'` - For updating existing entities (id required, others optional)
- `'patch'` - For partial updates (all fields optional)
- `'query'` - For filtering/searching (all fields optional)

#### `@ZodColumn(columnOptions, zodSchema)`

Combines TypeORM `@Column()` with Zod validation:

```typescript
@ZodColumn(
  { length: 255, nullable: false },
  z.string().min(1).max(255)
)
name: string;

// Equivalent to:
@Column({ length: 255, nullable: false })
@ZodProperty(z.string().min(1).max(255))
name: string;
```

### Schema Generation

#### `createEntitySchemas<T>(entityClass, options?)`

Generates all schema variants from an entity class.

**Parameters:**
- `entityClass`: Entity class constructor
- `options?`: Schema generation options

**Returns:** `EntitySchemas<T>` with `full`, `create`, `update`, `patch`, `query` schemas.

#### `createCreateSchema<T>(entityClass, options?)`

Generates only the create schema (convenience function).

#### `createUpdateSchema<T>(entityClass, options?)`  

Generates only the update schema (convenience function).

### Options

```typescript
interface SchemaGenerationOptions {
  /** Additional fields to omit from create schema */
  omitFromCreate?: string[];
  
  /** Fields to omit from update schema */
  omitFromUpdate?: string[];
  
  /** Custom field transformations */
  transforms?: Record<string, (schema: z.ZodTypeAny) => z.ZodTypeAny>;
}
```

## Advanced Usage

### Custom Transforms

```typescript
const UserSchemas = createEntitySchemas(User, {
  transforms: {
    // Transform email field for create schema
    email: (schema) => schema.transform(email => email.toLowerCase())
  }
});
```

### Migration Strategy

For existing projects, you can migrate gradually:

1. **Add decorators** to existing entities:
```typescript
// Before
@Column()
name: string;

// After  
@ZodProperty(z.string().min(1).max(255))
@Column()
name: string;
```

2. **Generate schemas** and replace manual ones:
```typescript
// Replace manual schemas
const UserSchemas = createEntitySchemas(User);
export const CreateUserSchema = UserSchemas.create;
```

3. **Remove duplicate types** and use inferred ones:
```typescript
// Remove manual type definitions
type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

## Benefits

- ✅ **Zero Duplication** - Single source of truth
- ✅ **Type Safety** - Perfect TypeScript integration  
- ✅ **Validation** - Automatic request validation
- ✅ **Productivity** - Write less, get more
- ✅ **Maintainability** - Update once, everywhere benefits
- ✅ **Migration Friendly** - Works with existing projects

## Requirements

- TypeORM >= 0.3.0
- Zod >= 4.0.0  
- TypeScript >= 5.0.0
- `reflect-metadata` package

## License

MIT © [Angel S. Moreno](LICENSE)

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand the expected behavior when participating in this project.
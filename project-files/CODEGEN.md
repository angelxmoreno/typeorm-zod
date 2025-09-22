# Code Generation Feature

The `@repo/typeorm-zod` package supports automatic generation of centralized schema files and TypeScript types from your decorated entities.

## Overview

Instead of manually calling `createEntitySchemas()` throughout your codebase, the codegen feature automatically generates a single file containing:

- **All entity schema collections** - Full, create, update, patch, and query variants
- **TypeScript type definitions** - Inferred from Zod schemas for perfect type safety
- **Validation helper functions** - Pre-built validators for each entity and operation
- **Centralized exports** - Single import location for all schema-related code

## Benefits

### ✅ **Single Source of Truth**
- All schemas and types exported from one location
- No need to import entity classes throughout your application
- Consistent schema access patterns across the codebase

### ✅ **Perfect Type Safety** 
- All types automatically inferred from Zod schemas
- No manual type definitions required
- IDE autocomplete and validation for all DTOs

### ✅ **API Integration Ready**
- Pre-built validation functions for API routes
- Consistent naming conventions for all operations
- Ready-to-use with Hono, Express, or any framework

### ✅ **Maintainability**
- Automatic regeneration when entities change
- No risk of schema/type drift between entities and usage
- Clear separation of concerns

## Generated Structure

The codegen creates a comprehensive schema file with the following structure:

```typescript
// Entity Schema Collections
export const UserSchemas = createEntitySchemas(UserEntity);
export const NoteSchemas = createEntitySchemas(NoteEntity);
// ... all other entities

// TypeScript Types
export type User = z.infer<typeof UserSchemas.full>;
export type CreateUserDto = z.infer<typeof UserSchemas.create>;
export type UpdateUserDto = z.infer<typeof UserSchemas.update>;
// ... all variants for all entities

// Validation Helpers
export const validateCreateUser = (data: unknown): CreateUserDto => 
    UserSchemas.create.parse(data);
export const validateUpdateUser = (data: unknown): UpdateUserDto => 
    UserSchemas.update.parse(data);
// ... all validators for all entities

// Convenience Exports
export const AllSchemas = {
    User: UserSchemas,
    Note: NoteSchemas,
    // ... all schemas
} as const;
```

## Usage Examples

### API Route Validation

```typescript
import { validateCreateNote, validatePatchNote, type CreateNoteDto } from '@repo/database';

// Hono example
app.post('/notes', async (c) => {
    try {
        const noteData = validateCreateNote(await c.req.json());
        // noteData is fully typed as CreateNoteDto
        
        const note = noteRepository.create(noteData);
        await noteRepository.save(note);
        return c.json({ success: true, note });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ errors: error.errors }, 400);
        }
        throw error;
    }
});

// Express example
app.patch('/notes/:id', (req, res) => {
    try {
        const updateData = validatePatchNote(req.body);
        // updateData is fully typed as PatchNoteDto
        
        await noteRepository.update(req.params.id, updateData);
        res.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ errors: error.errors });
        }
    }
});
```

### Service Layer Integration

```typescript
import { 
    type CreateUserDto, 
    type User, 
    UserSchemas,
    validateCreateUser 
} from '@repo/database';

export class UserService {
    async createUser(userData: CreateUserDto): Promise<User> {
        // userData is already typed and validated
        const user = this.userRepository.create(userData);
        await this.userRepository.save(user);
        
        // Validate the returned entity matches our schema
        return UserSchemas.full.parse(user);
    }
    
    async validateAndCreateUser(rawData: unknown): Promise<User> {
        const userData = validateCreateUser(rawData);
        return this.createUser(userData);
    }
}
```

### Frontend Type Safety

```typescript
import type { 
    CreateNoteDto, 
    UpdateNoteDto, 
    Note 
} from '@repo/database';

// React Hook Form with perfect typing
const useNoteForm = () => {
    const form = useForm<CreateNoteDto>({
        resolver: zodResolver(NoteSchemas.create)
    });
    
    const onSubmit = async (data: CreateNoteDto) => {
        // data is perfectly typed
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        // You can validate the response too
        const note: Note = NoteSchemas.full.parse(result.note);
        return note;
    };
    
    return { form, onSubmit };
};
```

### Database Testing

```typescript
import { 
    NoteSchemas, 
    validateCreateNote,
    type Note 
} from '@repo/database';
import { faker } from '@faker-js/faker';

describe('Note Operations', () => {
    it('should create valid notes', async () => {
        const noteData = {
            title: faker.lorem.sentence(),
            content: faker.lorem.paragraphs(),
            workspaceId: faker.string.uuid()
        };
        
        // Validate test data matches schema
        const validatedData = validateCreateNote(noteData);
        
        const note = await noteRepository.save(
            noteRepository.create(validatedData)
        );
        
        // Validate saved entity matches full schema
        const validNote: Note = NoteSchemas.full.parse(note);
        expect(validNote.id).toBeDefined();
        expect(validNote.createdAt).toBeInstanceOf(Date);
    });
});
```

## Configuration

### Directory Structure

The codegen expects your entities to be organized as follows:

```
packages/database/src/
├── entities/
│   ├── UserEntity.ts
│   ├── NoteEntity.ts
│   ├── WorkspaceEntity.ts
│   └── ... other entities
├── entity-schema-types.ts  # Generated file
└── index.ts               # Re-exports schemas
```

### Entity Requirements

All entities must:

1. **Use `@ZodProperty` or `@ZodColumn` decorators** on properties you want in schemas
2. **Export the class** with a descriptive name ending in "Entity"
3. **Follow consistent naming patterns** for predictable type generation

```typescript
// ✅ Good - will be detected and included
@Entity('users')
export class UserEntity extends AppEntity {
    @ZodColumn({ type: 'varchar', length: 255 }, z.string().min(1).max(255))
    name: string;
}

// ❌ Bad - won't be detected
class User {  // Not exported or missing Entity suffix
    name: string;  // No Zod decorator
}
```

### Generated Naming Conventions

The codegen follows consistent naming patterns:

| Pattern | Example |
|---------|---------|
| Entity Class | `UserEntity` |
| Schema Collection | `UserSchemas` |
| Full Type | `User` |
| Create DTO | `CreateUserDto` |
| Update DTO | `UpdateUserDto` |  
| Patch DTO | `PatchUserDto` |
| Query DTO | `UserQueryDto` |
| Validator Functions | `validateCreateUser`, `validateUpdateUser`, etc. |

## Implementation Plan

### Phase 1: Core Generator
- [ ] Create entity discovery system (scan `/entities` directory)
- [ ] Build schema generation templates
- [ ] Implement file writing with proper formatting
- [ ] Add TypeScript type generation
- [ ] Create validation helper generation

### Phase 2: CLI Integration  
- [ ] Add `bun run codegen:schemas` command
- [ ] Integrate with existing build pipeline
- [ ] Add watch mode for development
- [ ] Create pre-commit hooks for auto-generation

### Phase 3: Advanced Features
- [ ] Custom schema generation options per entity
- [ ] Conditional field inclusion/exclusion
- [ ] Custom validation helper patterns
- [ ] Integration with API documentation generation

### Phase 4: Developer Experience
- [ ] VS Code extension for auto-generation
- [ ] Hot reload integration
- [ ] Schema diff detection and warnings
- [ ] Performance optimizations for large codebases

## Best Practices

### ✅ **Do**
- Run codegen after any entity changes
- Import from the generated file, not individual entities
- Use the validation helpers in API routes
- Leverage TypeScript types for perfect type safety
- Keep entity decorators up to date

### ❌ **Don't**
- Edit the generated file manually
- Import entity classes for schema generation in application code
- Create manual type definitions that duplicate generated ones
- Skip validation in API endpoints
- Mix manual and generated schema approaches

## Migration Strategy

### From Manual Schema Generation

1. **Install and setup codegen**
2. **Generate initial schema file**
3. **Replace manual imports** with generated ones
4. **Update API routes** to use validation helpers
5. **Remove manual type definitions**
6. **Add codegen to build pipeline**

### Example Migration

```typescript
// Before - Manual approach
import { createEntitySchemas } from '@repo/typeorm-zod';
import { UserEntity } from './entities/UserEntity';

const UserSchemas = createEntitySchemas(UserEntity);
type CreateUserDto = z.infer<typeof UserSchemas.create>;

// After - Generated approach
import { 
    UserSchemas, 
    type CreateUserDto,
    validateCreateUser 
} from '@repo/database';
```

## Error Handling

### Common Issues

**Entity not found in generated file**
- Ensure entity class is exported
- Check entity naming follows `*Entity` pattern
- Verify entity has at least one Zod decorator

**Type errors after generation**
- Run `bun run typecheck` to identify issues
- Check entity decorators are properly configured
- Ensure all imported entities exist

**Schema validation fails**
- Verify entity decorators match database constraints
- Check for circular dependencies in entity relationships
- Ensure Zod schemas are compatible with TypeORM column types

## Future Enhancements

- **GraphQL integration** - Generate GraphQL schemas from Zod schemas
- **OpenAPI generation** - Auto-generate API documentation
- **Database migration validation** - Ensure migrations match schemas
- **Multi-package support** - Generate schemas for multiple database packages
- **Custom templates** - Allow customization of generated code patterns

---

This feature transforms `@repo/typeorm-zod` from a decorator library into a comprehensive code generation solution that eliminates boilerplate and ensures consistency across your entire application.
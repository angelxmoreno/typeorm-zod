import { z } from 'zod';
import { ZodProperty } from '../../../src';

export class TestEntityWithSkip {
    @ZodProperty({
        schema: z.string().uuid(),
        skip: ['create', 'update'], // Primary key - exclude from create/update
    })
    id: string;

    @ZodProperty(z.string().min(1).max(255))
    title: string;

    @ZodProperty(z.string())
    content: string;

    @ZodProperty({
        schema: z.number().int().min(0),
        skip: ['create', 'update', 'patch'], // Version column - fully auto-managed
    })
    version: number;

    @ZodProperty({
        schema: z.date(),
        skip: ['create'], // Created timestamp - exclude only from create
    })
    createdAt: Date;

    @ZodProperty({
        schema: z.date(),
        skip: ['create'], // Updated timestamp - exclude only from create
    })
    updatedAt: Date;

    @ZodProperty({
        schema: z.date().nullable(),
        skip: ['create', 'update'], // Soft delete - exclude from create/update
    })
    deletedAt: Date | null;

    @ZodProperty({
        schema: z.string().optional(),
        skip: ['query'], // Sensitive field - exclude from query schema
    })
    secretToken?: string;
}

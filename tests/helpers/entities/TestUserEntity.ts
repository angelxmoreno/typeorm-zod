import { z } from 'zod';
import { ZodProperty } from '../../../src';

export class TestUserEntity {
    @ZodProperty(z.string().uuid())
    id: string;

    @ZodProperty(z.string().min(1, 'Name is required').max(255, 'Name too long'))
    name: string;

    @ZodProperty(z.string().min(10, 'API key must be at least 10 characters'))
    apiKey: string;

    @ZodProperty(z.string().email('Invalid email format').optional())
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

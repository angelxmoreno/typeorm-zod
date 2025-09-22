import { z } from 'zod';
import { ZodProperty } from '../../../src';

export class TestEntityLegacy {
    @ZodProperty(z.string().uuid())
    id: string;

    @ZodProperty(z.string().min(1))
    name: string;

    @ZodProperty(z.date())
    createdAt: Date;
}

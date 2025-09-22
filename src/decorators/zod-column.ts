import { Column, type ColumnOptions } from 'typeorm';
import type { z } from 'zod';
import { addMetadata, hasPropertyMetadata } from '../metadata-store';

/**
 * Enhanced ZodColumn decorator using WeakMap-based metadata storage
 * This prevents metadata pollution between different entity classes
 * Usage: @ZodColumn({ length: 255 }, z.string().min(1).max(255))
 */
export function ZodColumn(columnOptions: ColumnOptions, zodSchema: z.ZodTypeAny) {
    return (target: object, propertyKey: string | symbol) => {
        const constructorFunc = (target as { constructor: new (...args: unknown[]) => unknown }).constructor;
        const propertyKeyStr = String(propertyKey);

        // Check for duplicate property decorators using WeakMap storage
        if (hasPropertyMetadata(constructorFunc, propertyKeyStr)) {
            throw new Error(
                `Duplicate @ZodColumn decorator detected for property "${propertyKeyStr}" in entity ${String(constructorFunc.name)}. ` +
                    'Multiple decorators on the same property are not supported. Please use only one decorator per property.'
            );
        }

        // Apply TypeORM @Column decorator after duplicate check to avoid side effects
        Column(columnOptions)(target, propertyKey);

        // Add metadata using WeakMap storage
        addMetadata(constructorFunc, {
            propertyKey: propertyKeyStr,
            zodSchema,
            columnOptions,
        });
    };
}

/**
 * Alternative metadata storage using WeakMap to prevent pollution
 * Uses globalThis to ensure single instance across module boundaries
 */
import type { ZodValidationMetadata } from './decorators/metadata';

/**
 * WeakMap-based metadata storage that prevents cross-entity pollution
 * Each constructor function gets its own isolated metadata array
 */
type ConstructorFunction = new (...args: unknown[]) => unknown;

// Use globalThis to ensure single instance across all module loads
const METADATA_STORE_KEY = Symbol.for('typeorm-zod-metadata-store');

// Use type assertion to allow symbol indexing on globalThis
const globalStore = globalThis as typeof globalThis & {
    [METADATA_STORE_KEY]?: WeakMap<ConstructorFunction, ZodValidationMetadata[]>;
};

if (!globalStore[METADATA_STORE_KEY]) {
    globalStore[METADATA_STORE_KEY] = new WeakMap<ConstructorFunction, ZodValidationMetadata[]>();
}

const metadataStore = globalStore[METADATA_STORE_KEY] as WeakMap<ConstructorFunction, ZodValidationMetadata[]>;

/**
 * Get metadata for a specific constructor function
 */
export function getMetadata(constructorFunc: ConstructorFunction): ZodValidationMetadata[] {
    return metadataStore.get(constructorFunc) || [];
}

/**
 * Set metadata for a specific constructor function
 */
export function setMetadata(constructorFunc: ConstructorFunction, metadata: ZodValidationMetadata[]): void {
    metadataStore.set(constructorFunc, metadata);
}

/**
 * Add metadata item for a specific constructor function
 */
export function addMetadata(constructorFunc: ConstructorFunction, item: ZodValidationMetadata): void {
    const existing = getMetadata(constructorFunc);
    const updated = [...existing, item];
    setMetadata(constructorFunc, updated);
}

/**
 * Check if a property already has metadata for a constructor
 */
export function hasPropertyMetadata(constructorFunc: ConstructorFunction, propertyKey: string): boolean {
    const metadata = getMetadata(constructorFunc);
    return metadata.some((item) => item.propertyKey === propertyKey);
}

/**
 * Get property metadata for debugging
 */
export function getPropertyMetadata(
    constructorFunc: ConstructorFunction,
    propertyKey: string
): ZodValidationMetadata | undefined {
    const metadata = getMetadata(constructorFunc);
    return metadata.find((item) => item.propertyKey === propertyKey);
}

/**
 * Debug helper to inspect all stored metadata
 */
export function debugMetadataStore(): void {
    console.log('MetadataStore contains', metadataStore);
}

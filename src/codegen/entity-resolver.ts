import * as process from 'node:process';
import fg from 'fast-glob';

/**
 * Resolves entity file paths based on a glob pattern.
 * @param globPattern The glob pattern to match entity files.
 * @returns An array of absolute paths to entity files.
 */
export async function resolveEntityFiles(globPattern: string): Promise<string[]> {
    const files = await fg(globPattern, {
        cwd: process.cwd(),
        absolute: true,
        ignore: ['node_modules', 'dist', '**/*/index.ts'], // Common ignores, and ignore index.ts files
    });
    return files.sort(); // Sort for consistent order
}

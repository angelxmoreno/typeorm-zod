// Define a type for an entity class constructor
export type EntityClass = new (...args: unknown[]) => unknown;

/**
 * Checks if a given value is a class constructor.
 * @param value The value to check.
 * @returns True if the value is a class constructor, false otherwise.
 */
function isClass(value: unknown): value is EntityClass {
    return typeof value === 'function' && /^\s*class\b/.test(Function.prototype.toString.call(value));
}

/**
 * Dynamically imports entity files and extracts their class constructors.
 * Assumes entity classes are exported as named exports or default exports.
 * Prioritizes exports ending with 'Entity'.
 * @param filePaths Absolute paths to the entity files.
 * @returns An array of [className, classConstructor] tuples.
 */
export async function loadEntityClasses(filePaths: string[]): Promise<Array<[string, EntityClass]>> {
    const entityClasses: Array<[string, EntityClass]> = [];

    for (const filePath of filePaths) {
        try {
            // Use a timestamp to bust module cache, important for watch mode
            const module = await import(`${filePath}?t=${Date.now()}`);

            let foundEntityClass: EntityClass | undefined;
            let foundEntityName: string | undefined;

            const exportNames = Object.keys(module);
            const preferredExportNames = [
                ...new Set([...exportNames.filter((name) => name.endsWith('Entity')), ...exportNames]),
            ];

            // Prioritize named exports that are classes
            for (const exportName of preferredExportNames) {
                const exported = module[exportName];
                if (isClass(exported) && exported.name) {
                    foundEntityClass = exported;
                    foundEntityName = exported.name;
                    break;
                }
            }

            // Fallback to default export if it's a class
            if (!foundEntityClass && isClass(module.default) && module.default.name) {
                foundEntityClass = module.default;
                foundEntityName = module.default.name;
            }

            if (foundEntityClass && foundEntityName) {
                entityClasses.push([foundEntityName, foundEntityClass]);
            } else {
                console.warn(`Could not find a suitable entity class in ${filePath}. Skipping.`);
            }
        } catch (error) {
            console.error(`Error loading entity file ${filePath}:`, error);
        }
    }

    return entityClasses;
}

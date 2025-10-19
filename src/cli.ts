#!/usr/bin/env bun
import 'reflect-metadata'; // Must be imported before any entity classes
import { constants as FS_CONSTANTS } from 'node:fs'; // Import constants from node:fs
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';
import { pathToFileURL } from 'node:url';
import chokidar from 'chokidar';
import { Command } from 'commander';
import { type CodegenConfig, CodegenConfigSchema } from './codegen/config';
import { loadEntityClasses } from './codegen/entity-loader';
import { resolveEntityFiles } from './codegen/entity-resolver';
import { generateSchemasAndTypes } from './codegen/generator';

const program = new Command();

program.name('typeorm-zod-codegen').description('CLI for generating TypeORM-Zod schemas and types').version('0.1.0');

program
    .option('-c, --config <path>', 'Path to the codegen configuration file', 'typeorm-zod.codegen.config.ts')
    .option('-w, --watch', 'Run in watch mode', false);

program.parse(process.argv);

const cliOptions = program.opts();

async function loadConfig(configPath: string): Promise<CodegenConfig> {
    const absoluteConfigPath = path.resolve(process.cwd(), configPath);

    let loadedConfig: Partial<CodegenConfig> = {};
    let configFileFound = false;

    try {
        await fs.access(absoluteConfigPath, FS_CONSTANTS.F_OK); // Use FS_CONSTANTS.F_OK
        configFileFound = true;
    } catch (_error) {
        // File does not exist, proceed with default config
    }

    if (configFileFound) {
        try {
            // Dynamically import the config file with cache-busting in ESM-compatible way
            const url = pathToFileURL(absoluteConfigPath);
            url.searchParams.set('t', String(Date.now()));
            const module = await import(url.href);
            loadedConfig = module.default || module;
        } catch (error) {
            console.error(`Error loading configuration file ${absoluteConfigPath}:`, error);
            process.exit(1);
        }
    } else {
        console.warn(`Configuration file not found at ${absoluteConfigPath}. Using default configuration.`);
    }

    // Validate the loaded config against the Zod schema
    const parsedConfig = CodegenConfigSchema.safeParse(loadedConfig);

    if (!parsedConfig.success) {
        console.error('Invalid configuration file:', parsedConfig.error.errors);
        process.exit(1);
    }

    // Merge CLI options with loaded config, CLI options take precedence
    const finalConfig: CodegenConfig = {
        ...parsedConfig.data,
        watch: cliOptions.watch || parsedConfig.data.watch, // CLI --watch overrides config
        // config path from CLI is only used to load the config, not part of the config itself
    };

    return finalConfig;
}

async function generate(config: CodegenConfig) {
    if (!config.silent) {
        console.log('Generating schemas and types...');
    }

    const entityFiles = await resolveEntityFiles(config.entities);
    if (!config.silent) {
        console.log('Found entity files:', entityFiles);
    }

    const entityClasses = await loadEntityClasses(entityFiles);
    if (!config.silent) {
        console.log(
            'Loaded entity classes:',
            entityClasses.map(([name]) => name)
        );
    }

    if (entityClasses.length === 0) {
        if (!config.silent) {
            console.warn('No entity classes found. Skipping code generation.');
        }
        return;
    }

    const generatedContent = generateSchemasAndTypes(entityClasses, config, entityFiles);

    const outputPath = path.resolve(process.cwd(), config.output);
    const outputDir = path.dirname(outputPath);

    try {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath, generatedContent, 'utf8');
        if (!config.silent) {
            console.log(`Successfully generated schemas and types to ${outputPath}`);
        }
    } catch (error) {
        console.error(`Error writing generated file to ${outputPath}:`, error);
        process.exit(1);
    }
}

// Simple debounce function
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout | undefined;
    return function (this: unknown, ...args: unknown[]) {
        const later = () => {
            timeout = undefined;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    } as T;
}

async function main() {
    // Initial config load
    let currentConfig = await loadConfig(cliOptions.config);

    if (!currentConfig.silent) {
        console.log('Final Codegen Configuration:', currentConfig);
    }

    if (currentConfig.watch) {
        if (!currentConfig.silent) {
            console.log('Watch mode enabled. Waiting for changes to entity files...');
        }

        const configFilePath = path.resolve(process.cwd(), cliOptions.config);
        const outputAbs = path.resolve(process.cwd(), currentConfig.output);

        const debouncedGenerate = debounce(async () => {
            // Reload config on each regeneration
            currentConfig = await loadConfig(cliOptions.config);
            if (!currentConfig.silent) {
                console.log('Configuration reloaded.');
            }
            await generate(currentConfig);
        }, 300);

        const watchPaths = [path.dirname(currentConfig.entities.split('*')[0] || 'src/entities'), configFilePath];
        chokidar
            .watch(watchPaths, {
                persistent: true,
                ignoreInitial: true,
                // Cross‑platform ignores and exclude the generated output file
                ignored: (p: string) => {
                    const norm = p.replace(/\\/g, '/');
                    return (
                        norm.includes('/node_modules/') ||
                        norm.includes('/dist/') ||
                        /(^|[\\/])index\\.ts$/.test(p) ||
                        path.resolve(p) === outputAbs
                    );
                },
                awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
            })
            .on('all', (event, changedPath) => {
                if (!currentConfig.silent) {
                    console.log(`File ${changedPath} ${event}, regenerating...`);
                }
                debouncedGenerate();
            });

        // Perform an initial generation on startup
        await generate(currentConfig);
    } else {
        await generate(currentConfig);
    }
}

main().catch(console.error);

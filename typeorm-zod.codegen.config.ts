import type { CodegenConfig } from './src';

const config: CodegenConfig = {
    entities: './tests/helpers/entities/**/*.ts',
    output: './src/generated/test-codegen-output.ts',
    watch: false,
    silent: false, // Keep silent for check-types
    naming: {
        entityToTypeName: (name) => `My${name.replace('Entity', '')}`,
    },
    schemas: {
        defaultOmitFromCreate: ['id'],
    },
};

export default config;

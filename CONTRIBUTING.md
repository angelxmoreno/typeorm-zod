# Contributing

Thank you for your interest in contributing to typeorm-zod! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Build the project: `bun run build`
4. Run tests: `bun test`
5. Type checking: `bun run check-types`
6. Linting: `bun run lint`

## Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. This leads to more readable messages and allows us to automatically generate changelogs.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

### Examples

```
feat(entities): add support for bulk operations
fix(validation): handle empty tag array correctly
docs(readme): update usage examples
test(entities): add tests for skip functionality
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Add or update tests as needed
4. Update documentation if required
5. Ensure all tests pass: `bun test`
6. Ensure the build succeeds: `bun run build`
7. Ensure linting passes: `bun run lint`
8. Ensure type checking passes: `bun run check-types`
9. Create a pull request with a clear description

## Code Style

- Use TypeScript with strict mode enabled
- Follow the existing code style and formatting (enforced by Biome)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use `unknown` instead of `any` for better type safety
- Avoid using `any` type unless absolutely necessary

## Testing

- Write tests for new features and bug fixes using Bun's test runner
- Tests are located in the `tests/` directory
- Ensure test coverage remains high
- Use descriptive test names
- Group related tests using `describe` blocks
- Use Bun's `mock()` function for mocking dependencies
- Run tests with `bun test` or `bun test --watch` for watch mode

## Documentation

- Update README.md for new features or breaking changes
- Add JSDoc comments for new public methods

## Development Tools

This project uses:
- **Bun** - JavaScript runtime and package manager
- **TypeScript** - Type checking and compilation
- **Biome** - Linting and formatting
- **lefthook** - Git hooks for quality checks

## Questions?

If you have questions about contributing, please open an issue or start a discussion in the repository.

# Contributing to Story Forge

Thank you for your interest in contributing to Story Forge! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/storyforge.git
   cd storyforge
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Development Environment

```bash
# Start with HMR (recommended for UI work)
bun run dev:hmr

# Start without HMR (for testing production-like builds)
bun run dev
```

### Before Committing

Always run the linter and formatter:

```bash
# Check for issues
bun run lint

# Fix auto-fixable issues and format
bun run format
```

Our pre-commit hooks will also run these checks automatically.

### Project Conventions

- **File naming**: Use kebab-case for files (e.g., `my-component.tsx`)
- **Component naming**: Use PascalCase for React components (e.g., `MyComponent`)
- **Type safety**: All new code must be written in TypeScript
- **Styles**: Use Tailwind CSS utility classes
- **State management**:
  - Use TanStack Query for server/server-adjacent state
  - Use Zustand for client-only state

## Pull Request Process

1. **Update documentation** if your changes affect usage or behavior
2. **Add tests** if applicable (when testing infrastructure is in place)
3. **Ensure all checks pass**:
   - Linting: `bun run lint`
   - Type checking: TypeScript should compile without errors
   - The app should run: `bun run dev:hmr`
4. **Update the README.md** if your changes add new features or change usage
5. **Fill out the PR template** with a clear description of changes
6. **Link related issues** using keywords like `Fixes #123` or `Closes #456`

### PR Review Process

- A maintainer will review your PR within a few days
- Address any requested changes
- Once approved, a maintainer will merge your PR

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **OS and version** (e.g., macOS 14.2, Windows 11, Ubuntu 22.04)
- **Story Forge version** (found in app settings or package.json)
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** or screen recordings if applicable
- **Error messages** or log output

### Feature Requests

When suggesting features:

- **Describe the use case** - what problem does it solve?
- **Explain the proposed solution** - how should it work?
- **Consider alternatives** - are there other ways to achieve this?
- **Be specific** about UI/UX if applicable

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Avoid `any` type - use `unknown` with type guards when necessary
- Export types and interfaces that consumers might need
- Use explicit return types for public functions

### React

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused and small
- Use React.memo sparingly and only when needed
- Follow the Rules of Hooks

### CSS/Tailwind

- Use Tailwind utility classes exclusively
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Follow the design system colors (don't hardcode colors)
- Use `rem` units via Tailwind's spacing scale

### RPC/Controllers

- Define types in `@/shared/rpc` for type safety
- Keep controllers focused on a single domain
- Handle errors gracefully and return meaningful error messages
- Document RPC methods with JSDoc comments

## Commit Messages

We follow conventional commits for clear history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc

### Examples

```
feat(mods): add batch install functionality

fix(logs): prevent crash on empty log files

docs(readme): update installation instructions

refactor(versions): simplify version comparison logic
```

## Questions?

- Open a [GitHub Discussion](https://github.com/StoryForgeApp/storyforge/discussions)
- Join our [Discord](https://discord.gg/gByx63peUC)

Thank you for contributing to Story Forge!

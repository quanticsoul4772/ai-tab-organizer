# Contributing to AI Tab Organizer

Thank you for your interest in contributing to AI Tab Organizer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Accepting constructive criticism gracefully
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment, trolling, or discriminatory comments
- Personal or political attacks
- Publishing others' private information
- Other conduct inappropriate in a professional setting

## Getting Started

### Prerequisites

Before contributing, make sure you have:

1. Read the [README.md](README.md)
2. Set up your development environment (see [DEVELOPMENT.md](DEVELOPMENT.md))
3. Familiarized yourself with the [architecture](ARCHITECTURE.md)
4. Checked [existing issues](https://github.com/yourusername/ai-tab-organizer/issues)

### First Time Contributors

Looking for a good first issue? Check out:

- Issues labeled [`good first issue`](https://github.com/yourusername/ai-tab-organizer/labels/good%20first%20issue)
- Issues labeled [`help wanted`](https://github.com/yourusername/ai-tab-organizer/labels/help%20wanted)
- Documentation improvements
- Test coverage improvements

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. **Search existing issues** to avoid duplicates
2. **Verify the bug** in the latest version
3. **Collect information** about the bug

When creating a bug report, include:

```markdown
**Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g. Windows 11, macOS 13]
- Chrome Version: [e.g. 120.0.6099.109]
- Extension Version: [e.g. 0.1.0]

**Additional Context**
Any other relevant information.
```

### Suggesting Features

Before suggesting a feature:

1. **Check the roadmap** in README.md
2. **Search existing issues** for similar suggestions
3. **Consider the scope** - does it fit the project goals?

When suggesting a feature, include:

```markdown
**Feature Description**
Clear description of the proposed feature.

**Problem It Solves**
What problem does this feature solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
What other solutions did you consider?

**Additional Context**
Mockups, examples, or related features.
```

### Improving Documentation

Documentation improvements are always welcome:

- Fix typos or clarify unclear sections
- Add examples or use cases
- Update outdated information
- Improve code comments
- Create tutorials or guides

## Development Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/ai-tab-organizer.git
cd ai-tab-organizer

# Add upstream remote
git remote add upstream https://github.com/yourusername/ai-tab-organizer.git
```

### 2. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### 3. Make Changes

```bash
cd extension

# Install dependencies
npm install

# Start development mode
npm run dev

# Make your changes
# ...

# Build and test
npm run build
```

### 4. Test Your Changes

Manual testing checklist:

- [ ] Extension loads without errors
- [ ] New feature works as expected
- [ ] Existing features still work
- [ ] No console errors
- [ ] Works with 10, 50, and 100+ tabs
- [ ] Error handling works correctly
- [ ] UI looks correct
- [ ] Settings persist correctly

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add custom category support"

# Push to your fork
git push origin feature/your-feature-name
```

## Pull Request Process

### Before Submitting

Checklist:

- [ ] Code follows project style guidelines
- [ ] All tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Commits follow commit conventions
- [ ] Branch is up to date with main
- [ ] No merge conflicts

### Creating a Pull Request

1. **Push your branch** to your fork
2. **Go to the original repository** on GitHub
3. **Click "New Pull Request"**
4. **Select your branch**
5. **Fill out the PR template**

PR template:

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that would break existing functionality)
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing Done
- [ ] Tested locally
- [ ] Tested with various tab counts
- [ ] Tested error scenarios
- [ ] Checked console for errors

## Screenshots (if applicable)
Add screenshots of UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
```

### Review Process

1. **Automated checks** run on your PR
2. **Maintainers review** your code
3. **Address feedback** by pushing new commits
4. **Approval** from at least one maintainer
5. **Merge** by maintainers

### After Merge

- **Delete your branch** (optional)
- **Pull latest main** to stay updated
- **Celebrate!**

## Coding Standards

### TypeScript

```typescript
// Good
interface TabProps {
  tabs: Tab[];
  onTabClick: (tabId: number) => void;
}

export function TabComponent({ tabs, onTabClick }: TabProps): JSX.Element {
  return <div>{/* ... */}</div>;
}

// Avoid
export function TabComponent(props: any) {
  return <div>{/* ... */}</div>;
}
```

### React Components

```typescript
// Good - Functional component with proper types
import React from 'react';
import type { Tab } from '@types';

interface TabListProps {
  tabs: Tab[];
  onTabClick: (tabId: number) => void;
}

export function TabList({ tabs, onTabClick }: TabListProps) {
  return (
    <div>
      {tabs.map(tab => (
        <div key={tab.id} onClick={() => onTabClick(tab.id)}>
          {tab.title}
        </div>
      ))}
    </div>
  );
}

// Avoid - Class components, missing types
export class TabList extends React.Component {
  render() {
    return <div>{/* ... */}</div>;
  }
}
```

### Naming Conventions

```typescript
// Components: PascalCase
export function SettingsPanel() {}

// Functions: camelCase
function handleTabClick() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Interfaces: PascalCase
interface CategoryResponse {}

// Files: Match component name
// Good: SettingsPanel.tsx
// Good: claudeApi.ts
// Avoid: settings_panel.tsx
```

### Code Organization

```typescript
// Good - Organized imports
import React, { useState, useEffect } from 'react';
import type { Tab } from '@types';
import { storage } from '@utils/storage';
import { TabList } from '@components/TabList';
import './styles.css';

// Avoid - Messy imports
import './styles.css';
import { TabList } from '../components/TabList';
import React from 'react';
import { storage } from '../utils/storage';
```

### Comments

```typescript
// Good - Explain why, not what
// Retry with exponential backoff to handle transient API errors
await sleep(RETRY_DELAY_MS * attempt);

// Avoid - Obvious comments
// Sleep for some time
await sleep(1000);
```

### Error Handling

```typescript
// Good - Specific error handling
try {
  const categories = await claudeApi.categorizeTabs(tabs, apiKey);
  setCategorized(categories);
} catch (error) {
  const errorMessage = error instanceof Error
    ? error.message
    : 'Failed to categorize tabs';
  setError(errorMessage);
  console.error('Categorization error:', error);
}

// Avoid - Silent failures
try {
  await claudeApi.categorizeTabs(tabs, apiKey);
} catch (error) {
  // Do nothing
}
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(components): add custom category support"

# Bug fix
git commit -m "fix(api): resolve timeout issue in background worker"

# Documentation
git commit -m "docs: update installation instructions"

# Breaking change
git commit -m "feat(api): change categorization response format

BREAKING CHANGE: Response format changed from array to object"
```

### Commit Best Practices

- **One logical change per commit**
- **Write clear commit messages**
- **Reference issues** when applicable
- **Keep commits atomic** and focused

## Issue Guidelines

### Good Issue Characteristics

- **Clear title** that summarizes the issue
- **Detailed description** with context
- **Steps to reproduce** (for bugs)
- **Expected vs actual behavior**
- **Environment details**
- **Screenshots or logs** when helpful

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested
- `wontfix` - Will not be addressed

## Community

### Getting Help

- **Documentation**: Read the docs first
- **GitHub Discussions**: Ask questions
- **GitHub Issues**: Report bugs or request features
- **Email**: Contact maintainers

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Requests**: Code contributions

### Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes (for significant contributions)
- Project README (for major contributors)

## License

By contributing to AI Tab Organizer, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing:

1. Check the [DEVELOPMENT.md](DEVELOPMENT.md) guide
2. Search [GitHub Discussions](https://github.com/yourusername/ai-tab-organizer/discussions)
3. Create a new discussion
4. Contact maintainers

## Thank You

Your contributions make this project better for everyone. We appreciate your time and effort.

---

Happy contributing!

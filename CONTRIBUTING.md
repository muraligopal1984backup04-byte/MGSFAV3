# Contributing Guide

Thank you for your interest in contributing to the Sales Management System!

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Git
- Supabase account
- Code editor (VS Code recommended)

### Initial Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/yourusername/sales-management-system.git
cd sales-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Start development server:
```bash
npm run dev
```

## Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-inventory-module`)
- `fix/` - Bug fixes (e.g., `fix/order-total-calculation`)
- `refactor/` - Code refactoring (e.g., `refactor/customer-form`)
- `docs/` - Documentation updates (e.g., `docs/api-documentation`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Commit Message Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(orders): add bulk order import functionality
fix(collections): correct payment amount calculation
docs(readme): update installation instructions
refactor(customers): extract address form to separate component
```

### Making Changes

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the coding standards

3. Test your changes thoroughly

4. Commit your changes:
```bash
git add .
git commit -m "feat(module): description of changes"
```

5. Push to your fork:
```bash
git push origin feature/your-feature-name
```

6. Create a Pull Request

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use proper types or `unknown`
- Use interfaces for object shapes
- Export types from component files

**Example:**
```typescript
interface CustomerFormData {
  customer_name: string;
  email: string;
  phone: string;
}

export function CustomerForm({ onSubmit }: { onSubmit: (data: CustomerFormData) => void }) {
  // Component code
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused (Single Responsibility)
- Extract reusable logic to custom hooks
- Use meaningful component and variable names

**Component Structure:**
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // 4. State
  const [data, setData] = useState([]);

  // 5. Effects
  useEffect(() => {
    // ...
  }, []);

  // 6. Handlers
  const handleClick = () => {
    // ...
  };

  // 7. Render
  return (
    // JSX
  );
}
```

### File Organization

```
src/
├── components/
│   ├── [module]/
│   │   ├── [Module]List.tsx      # List view
│   │   ├── [Module]Form.tsx      # Create/Edit form
│   │   └── [Module]Details.tsx   # Detail view
│   └── shared/
│       └── [Shared components]
├── contexts/
│   └── [Context]Context.tsx
├── hooks/
│   └── use[Hook].ts
├── lib/
│   ├── supabase.ts
│   └── utils.ts
└── types/
    └── [module].types.ts
```

### Styling

- Use Tailwind CSS utility classes
- Keep custom CSS minimal
- Use consistent spacing (0.5rem increments)
- Follow mobile-first responsive design

**Example:**
```tsx
<div className="container mx-auto px-4 py-6">
  <h1 className="text-2xl font-bold mb-4">Title</h1>
  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
    Click Me
  </button>
</div>
```

### Database Operations

- Always use `maybeSingle()` for zero-or-one results
- Handle errors properly
- Use specific column selection (avoid `select('*')`)
- Add proper indexes for new queries

**Example:**
```typescript
const { data, error } = await supabase
  .from('customer_master_tbl')
  .select('id, customer_name, email')
  .eq('id', customerId)
  .maybeSingle();

if (error) {
  console.error('Error fetching customer:', error);
  return;
}
```

### Error Handling

- Always handle Supabase errors
- Show user-friendly error messages
- Log errors to console for debugging
- Never expose sensitive information in errors

**Example:**
```typescript
try {
  const { error } = await supabase
    .from('table')
    .insert(data);

  if (error) throw error;

  alert('Success!');
} catch (err) {
  console.error('Error:', err);
  alert('An error occurred. Please try again.');
}
```

## Database Migrations

### Creating New Migrations

1. Name format: `YYYYMMDDHHMMSS_descriptive_name.sql`
2. Always include a detailed header comment
3. Use `IF EXISTS` / `IF NOT EXISTS`
4. Enable RLS on new tables
5. Create appropriate indexes

**Migration Template:**
```sql
/*
  # Migration Title

  1. Overview
    Brief description of what this migration does

  2. New Tables
    - `table_name`
      - `column` (type) - Description

  3. Changes
    - Describe changes made

  4. Security
    - Enable RLS on `table_name`
    - Add policies for access control

  5. Notes
    - Any important notes
*/

-- Your SQL here
CREATE TABLE IF NOT EXISTS table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations"
  ON table_name
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
```

### Testing Migrations

1. Test on local Supabase instance first
2. Verify all indexes are created
3. Test RLS policies
4. Check foreign key constraints
5. Verify data integrity

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation is updated
- [ ] Migrations are included (if database changes)

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List specific changes
- One per line

## Testing
- Describe testing performed
- Include test scenarios

## Screenshots (if applicable)
Add screenshots for UI changes

## Database Changes
- [ ] Migration included
- [ ] RLS policies added
- [ ] Indexes created

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. Automated checks must pass
2. Code review by maintainer(s)
3. Address review comments
4. Approval from at least one maintainer
5. Merge to main branch

## Testing

### Manual Testing

Test checklist for major changes:
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive on mobile/tablet/desktop
- [ ] Forms validate properly
- [ ] Error handling works
- [ ] Success messages display
- [ ] Navigation works correctly

### Future: Automated Testing

Coming soon:
- Unit tests with Vitest
- Component tests with React Testing Library
- E2E tests with Playwright

## Documentation

### When to Update Docs

- Adding new features
- Changing existing functionality
- Adding new dependencies
- Modifying database schema
- Changing deployment process

### Documentation Files

- `README.md` - Overview and quick start
- `ARCHITECTURE.md` - System architecture
- `DEPLOYMENT.md` - Deployment guide
- `CONTRIBUTING.md` - This file
- `CHANGELOG.md` - Version history
- Code comments - Complex logic only

## Common Tasks

### Adding a New Module

1. Create folder in `src/components/[module]/`
2. Create List, Form, and Details components
3. Add routes in `App.tsx`
4. Update navigation
5. Create database tables (migration)
6. Add RLS policies
7. Update documentation

### Adding a New Report

1. Create component in `src/components/reports/`
2. Add date range filter
3. Implement query with joins
4. Add export to CSV
5. Add route and navigation
6. Test with various filters

### Fixing a Bug

1. Reproduce the bug
2. Identify root cause
3. Write fix with minimal changes
4. Test thoroughly
5. Document the fix
6. Create PR with clear description

## Getting Help

- Check existing documentation
- Search existing issues
- Ask in discussions
- Contact maintainers

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

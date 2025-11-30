# System Architecture

## Overview

The Sales Management System follows a modern three-tier architecture:

1. **Presentation Layer** - React-based SPA
2. **Application Layer** - Business logic and API integration
3. **Data Layer** - Supabase PostgreSQL database

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           React Application (SPA)                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Components │  │  Contexts  │  │   Routes   │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   Tables   │  │    RLS     │  │  Triggers  │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 RESTful API                           │  │
│  │           (Auto-generated from schema)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **React 18** - UI framework with hooks and functional components
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Router v6** - Client-side routing

### Backend
- **Supabase** - Backend-as-a-Service platform
- **PostgreSQL 15+** - Relational database
- **PostgREST** - Auto-generated REST API
- **pg_cron** - Scheduled jobs (if needed)

### Development Tools
- **ESLint** - Code linting
- **Git** - Version control
- **npm** - Package management

## Design Patterns

### Component Architecture

```
src/
├── components/
│   ├── [module]/
│   │   ├── [Module]List.tsx      # List view
│   │   ├── [Module]Form.tsx      # Create/Edit form
│   │   └── [Module]Details.tsx   # Detail view
│   └── shared/
│       ├── Layout.tsx
│       └── Navigation.tsx
├── contexts/
│   └── AuthContext.tsx            # Global state
├── lib/
│   └── supabase.ts                # DB client
└── App.tsx                        # Root component
```

### State Management Pattern

- **Local State** - `useState` for component-level state
- **Global State** - Context API for auth and shared data
- **Server State** - Direct Supabase queries (no additional caching layer)

### Data Flow

```
User Action → Component Handler → Supabase Client → Database
                                        ↓
                                   Update UI State
```

## Authentication Flow

```
┌──────────┐
│  Login   │
│  Screen  │
└────┬─────┘
     │
     ├── Submit credentials
     │
     ▼
┌──────────────────┐
│ Query user_master│
│  table by email  │
└────┬─────────────┘
     │
     ├── Password matches?
     │   (plain text comparison)
     │
     ▼
┌──────────────────┐
│  AuthContext     │
│  stores user +   │
│  role info       │
└────┬─────────────┘
     │
     ├── Redirect to Dashboard
     │
     ▼
┌──────────────────┐
│  Protected       │
│  Routes Check    │
│  AuthContext     │
└──────────────────┘
```

**Note**: This system uses custom authentication, NOT Supabase Auth. User credentials are stored in `user_master_tbl`.

## Database Architecture

### Schema Organization

**Master Data Tables** (`_master_tbl` suffix)
- Core business entities
- Referenced by transaction tables
- Relatively static data

**Transaction Tables** (`_header_tbl` and `_detail_tbl`)
- Business transactions
- Header-detail pattern for multi-line documents
- Frequent inserts/updates

**Mapping Tables** (`_mapping_tbl` suffix)
- Many-to-many relationships
- Junction tables for associations

**Support Tables**
- Address tables
- Media storage references
- Location tracking

### Indexing Strategy

1. **Primary Keys** - Automatically indexed (UUID)
2. **Foreign Keys** - All have covering indexes
3. **Query Filters** - Common WHERE clause columns
4. **Sort Columns** - Frequently ordered columns
5. **Composite Indexes** - Multi-column queries

### RLS Strategy

Since the app uses custom authentication:
- RLS is enabled on all tables (security requirement)
- Policies use `USING (true)` for permissive access
- Actual access control at application layer
- UI components check user roles before rendering

## Security Architecture

### Multi-Layer Security

1. **Network Layer**
   - HTTPS only
   - CORS configuration
   - API key authentication

2. **Application Layer**
   - Role-based UI rendering
   - AuthContext checks
   - Route protection

3. **Database Layer**
   - RLS enabled (permissive policies)
   - Foreign key constraints
   - NOT NULL constraints
   - Check constraints

### Access Control Matrix

| Role    | Companies | Branches | Users | Customers | Orders | Reports |
|---------|-----------|----------|-------|-----------|--------|---------|
| Admin   | CRUD      | CRUD     | CRUD  | CRUD      | CRUD   | All     |
| Manager | R         | R        | R     | CRUD      | CRUD   | Branch  |
| User    | -         | -        | -     | R         | CR     | Own     |

**Legend**: C=Create, R=Read, U=Update, D=Delete, - =No Access

## Data Flow Patterns

### Master Data Entry

```
Form Submit
  ↓
Validate locally
  ↓
Insert/Update via Supabase
  ↓
Handle response
  ↓
Update local state
  ↓
Show success message
  ↓
Refresh list/navigate
```

### Transaction Processing (Orders)

```
Select Customer
  ↓
Auto-fetch Route (from route_customer_mapping_tbl)
  ↓
Auto-fetch Field Staff (from user_route_mapping_tbl)
  ↓
Add line items
  ↓
Calculate totals
  ↓
Submit header + details
  ↓
Transaction commit
  ↓
Generate invoice (optional)
```

### Reporting Flow

```
Select filters (date, route, staff, etc.)
  ↓
Query with joins
  ↓
Aggregate data
  ↓
Display in table
  ↓
Export to CSV (optional)
```

## Performance Considerations

### Query Optimization
- Use `select()` with specific columns (avoid `select('*')`)
- Use `maybeSingle()` for zero-or-one results
- Index all foreign keys
- Use composite indexes for multi-column queries

### UI Optimization
- Lazy loading for large lists
- Debounced search inputs
- Optimistic UI updates
- Pagination for large datasets

### Caching Strategy
- Browser localStorage for user preferences
- No additional caching layer (Supabase handles it)
- Fresh data on every navigation

## Scalability

### Current Limitations
- Single database instance
- No horizontal scaling
- No CDN for static assets
- No Redis/memory cache

### Future Scaling Options
1. Implement connection pooling
2. Add read replicas
3. Use CDN for static assets
4. Implement service worker for offline support
5. Add Redis for session management
6. Microservices for heavy operations

## Error Handling

### Client-Side
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  // Handle data
} catch (err) {
  console.error('Error:', err);
  // Show user-friendly message
}
```

### Database-Side
- Foreign key constraints prevent orphaned records
- Check constraints validate data
- Triggers maintain data integrity
- NOT NULL constraints prevent missing data

## Deployment Architecture

### Development
- Local Vite dev server
- Supabase cloud instance
- Environment variables via `.env`

### Production (Recommended)
```
┌──────────────┐
│   Vercel     │  Static hosting
│   (or CDN)   │
└──────┬───────┘
       │
       ├── React SPA
       │
       ▼
┌──────────────┐
│  Supabase    │  Database + API
│   Cloud      │
└──────────────┘
```

## Monitoring & Logging

### Client-Side
- Console errors
- Performance metrics (Core Web Vitals)

### Database-Side
- Supabase Dashboard analytics
- Slow query logs
- Connection pool stats

## Backup & Recovery

### Database
- Supabase automatic daily backups
- Point-in-time recovery available
- Manual backup via pg_dump

### Code
- Git version control
- GitHub/GitLab for remote repository

## Future Enhancements

1. **Real-time Features** - Supabase Realtime for live updates
2. **File Storage** - Supabase Storage for documents
3. **Edge Functions** - Serverless functions for complex logic
4. **Mobile App** - React Native or Flutter
5. **Analytics** - Custom analytics dashboard
6. **Notifications** - Push notifications via Firebase

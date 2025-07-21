# Prime Auth - Multi-Tenant Authentication System

## Overview

PrimeAuth is a comprehensive authentication system built as a multi-tenant SaaS platform. Each user (authenticated via Google Firebase) gets their own isolated authentication environment where they can create applications, manage users, and control access through API keys. The system provides enterprise-grade features including hardware ID locking, version control, blacklisting, webhook notifications, and comprehensive user management.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming (light/dark mode support)
- **State Management**: TanStack Query for server state, React Context for theme
- **Routing**: Wouter for client-side routing
- **Authentication**: Firebase Authentication for user identity
- **Background Effects**: Custom particle system for enhanced UX

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: express-session with PostgreSQL store
- **Authentication**: Dual authentication system (Firebase + custom session management)
- **API Design**: RESTful API with multi-tenant isolation
- **Security**: CORS, rate limiting, API key validation, input sanitization

### Database Schema
The system uses a multi-tenant architecture with the following key tables:
- `users` - Main user accounts (Firebase authenticated)
- `applications` - User-created applications with unique API keys
- `app_users` - End users for each application (isolated per tenant)
- `license_keys` - License management system
- `webhooks` - Webhook configuration for real-time notifications
- `blacklist` - IP/username/email/HWID blocking system
- `activity_logs` - Comprehensive audit trail
- `sessions` - Session storage for authentication

## Key Components

### Authentication System
- **Primary Auth**: Firebase Google OAuth for tenant authentication
- **Secondary Auth**: Custom session-based authentication for application users
- **API Security**: API key-based authentication for external integrations
- **Permission System**: Role-based access control (Owner, Admin, Moderator, User)

### Multi-Tenant Isolation
- Each Google account creates an isolated tenant environment
- API keys are tenant-specific and provide access only to that tenant's data
- Complete data isolation between tenants
- Separate user management for each tenant's applications

### Application Management
- Users can create multiple applications within their tenant
- Each application gets a unique API key for external integration
- Configurable security settings per application (HWID locking, version control)
- Custom messaging for different authentication scenarios

### Security Features
- **Hardware ID Locking**: Prevent account sharing across devices
- **Version Control**: Force application updates
- **Blacklist System**: Block by IP, username, email, or hardware ID
- **Account Expiration**: Time-based access control
- **Session Management**: Real-time session tracking and validation

### Webhook System
- Real-time notifications for authentication events
- Support for Discord, Slack, and custom webhook endpoints
- Configurable event types and payload formatting
- Automatic retry logic and failure handling

## Data Flow

### User Registration Flow
1. User authenticates with Google Firebase
2. Backend creates tenant environment and user record
3. User can create applications and generate API keys
4. External applications use API keys to authenticate end users

### Authentication Flow
1. External application sends user credentials + API key to `/api/auth/login`
2. System validates API key and retrieves application configuration
3. User credentials are validated against application's user database
4. Security checks (HWID, version, blacklist, expiration) are performed
5. Authentication result is returned with session token
6. Webhook notifications are triggered for the event

### Admin Flow
1. Tenant owners can manage users, applications, and settings
2. Permission system controls access to different administrative functions
3. Activity logs track all administrative actions
4. Real-time updates via React Query for responsive UI

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **firebase/auth**: User authentication via Google
- **express**: Web server framework
- **@tanstack/react-query**: Server state management

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing
- **react-hook-form**: Form management with validation

### Security Dependencies
- **bcrypt**: Password hashing
- **express-session**: Session management
- **cors**: Cross-origin resource sharing

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20
- **Database**: Neon PostgreSQL (serverless)
- **Build Tool**: Vite for fast development and HMR
- **Dev Server**: Express with Vite middleware integration

### Production Deployment
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Static Assets**: Frontend builds to `dist/public`, served by Express
- **Environment Variables**: Database URL, Firebase config, session secrets
- **Autoscaling**: Configured for Replit autoscale deployment

### Database Management
- **ORM**: Drizzle with PostgreSQL dialect
- **Migrations**: Schema changes tracked in `migrations/` directory
- **Connection**: Neon serverless with WebSocket support for edge environments

## Changelog

```
Changelog:
- June 14, 2025. Initial setup
- June 14, 2025. Fixed authentication session synchronization and data loading issues
  * Enhanced Firebase authentication flow with proper backend session creation
  * Fixed API query key formats to match endpoint structure correctly
  * Added PATCH route support for application updates
  * Resolved TypeScript typing issues for data display
  * Fixed authentication middleware to handle account ID headers properly
- June 14, 2025. Implemented license key-based user registration system
  * Added /api/v1/register endpoint with mandatory license key validation
  * License keys now enforce usage limits and track current user count
  * Registration requires valid license key with available slots
  * Updated integration examples (C# and Python) to include license key fields
  * Fixed application display caching issues using refetchQueries
  * Enhanced user registration with license key association and usage tracking
  * Made email field optional in registration process while keeping username, password, and license key mandatory
- June 14, 2025. Fixed user management and logout functionality
  * Fixed apiRequest function parameter structure for proper API calls
  * Corrected user create/delete operations with proper body formatting
  * Fixed pause/unpause methods to use correct HTTP methods (POST instead of PATCH)
  * Enhanced logout functionality to properly clear Firebase and backend sessions
  * Added Google OAuth account selection prompt to prevent automatic re-login
  * Implemented complete session cleanup including localStorage and sessionStorage
  * Added backend /api/logout route for proper server-side session destruction
- July 15, 2025. Successfully migrated from Replit Agent to Replit environment
  * Completed full migration with all packages installed and dependencies resolved
  * Fixed database schema deployment using npm run db:push
  * Configured Firebase authentication with proper domain authorization
  * Established PostgreSQL database connection with all required tables
  * Verified complete authentication flow from Firebase to backend sessions
  * Application now fully functional at production URL with multi-tenant isolation
- July 15, 2025. Completed comprehensive rebranding from "PhantomAuth" to "NexxAuth"
  * Updated all class names, file names, and component references throughout codebase
  * Renamed PhantomAuth.cs to NexxAuth.cs with complete class structure updates
  * Updated CSS variables from --phantom-* to --nexx-* maintaining red theme
  * Replaced all "Nexx Auth" text with "Nexx Auth" in frontend components
  * Updated documentation, API examples, and integration guides
  * Maintained functionality while ensuring complete visual and code consistency
- July 16, 2025. Successfully completed migration from Replit Agent to Replit environment
  * Fixed Firebase authentication credentials configuration with proper environment variables
  * Implemented backend session synchronization for Firebase authentication flow
  * Created PostgreSQL database with complete schema deployment using Drizzle ORM
  * Resolved authentication middleware issues and established proper client-server communication
  * Application now fully functional with multi-tenant authentication system operational
- July 17, 2025. Completed migration to simple username/password authentication system
  * Replaced Firebase Google sign-in with custom JSON-based authentication using userauth.json
  * Created /api/auth/simple-login endpoint for credential validation
  * Implemented simple login page with username/password form at /login route
  * Updated authentication hooks to use new simple auth system without continuous polling
  * Disabled registration system completely - users can only login with predefined credentials
  * Fixed loading issues and simplified authentication flow for better performance
- July 18, 2025. Successfully completed migration from Replit Agent to Replit environment
  * Fixed missing tsx dependency issue that was preventing server startup
  * Resolved database schema mismatch by updating SQLite initialization script
  * Created proper database tables including missing active_sessions and updated activity_logs schema
  * Fixed authentication flow with proper column mappings and database persistence
  * Eliminated all database errors - application stats, session tracking, and activity logging now functional
  * Implemented automatic database initialization in db.ts to prevent restart issues
  * Application now fully operational in native Replit environment with complete functionality
  * All migration checklist items completed successfully with persistent database solution
- July 17, 2025. Fixed HTTP authentication compatibility for external server deployment
  * Modified session configuration to work with HTTP connections (secure: false)
  * Updated cookie settings with sameSite: 'lax' for better cross-origin compatibility
  * Fixed authentication middleware to properly validate sessions in non-HTTPS environments
  * Added debug endpoints for session testing and troubleshooting
  * Verified login flow works correctly on external HTTP servers (like http://176.100.37.241:6417)
  * Session persistence now working properly for both HTTPS and HTTP environments
- July 18, 2025. Successfully completed migration from Replit Agent to Replit environment
  * Fixed missing tsx dependency issue that was preventing server startup
  * Resolved HWID reset functionality by correcting HTTP method mismatch (frontend was using PATCH, backend expected POST)
  * Updated frontend resetHwidMutation to use POST method instead of PATCH
  * Verified all authentication and user management features are working correctly
  * Application now fully operational in native Replit environment with complete functionality
  * All migration checklist items completed successfully
- July 18, 2025. Fixed critical authentication and logging issues
  * Resolved "Too few parameter values" activity logging error by updating createActivityLog function to properly handle optional fields
  * Fixed HWID lock false ban issue by ensuring user object stays synchronized after HWID updates on first login
  * Verified HWID locking works correctly: first login sets HWID, subsequent logins with same HWID succeed, different HWID properly blocked
  * Enhanced activity logging with proper data cleaning and debugging to ensure all database operations succeed
  * All authentication flows now working perfectly with comprehensive logging and webhook integration
- July 20, 2025. Enhanced bulk actions and custom messaging system
  * Redesigned bulk actions UI with dropdown menu: Clear Selection button + 3-dot menu with Delete, Pause, and Unpause options
  * Added bulk pause/unpause functionality with new backend endpoints for batch user operations
  * Implemented pauseUserMessage field in database schema and Messages tab for customizable pause notifications
  * Added database migration to support new pause_user_message column with default value "Account Is Paused Temporally. Contract Support"
  * All bulk actions now working with proper error handling and user feedback
- July 20, 2025. Updated license key system and API configuration
  * Changed "Validity Days" field to "Expires At" date picker in both Generate and Create Custom License Key forms
  * Updated backend logic to handle expiresAt datetime input instead of calculating from validity days
  * Modified API Configuration Base URL from "url/api/auth" to just "url" for cleaner integration
  * Enhanced schema validation to support both expiresAt string/number and optional validityDays
  * Improved user experience with date picker matching Create User form pattern
- July 20, 2025. Successfully completed migration from Replit Agent to Replit environment
  * Fixed database schema mismatch by adding missing pause_user_message column to applications table
  * Resolved license key generation validation error by updating backend to accept expiresAt instead of validityDays
  * All packages installed and dependencies resolved, tsx runtime working correctly
  * Database properly initialized with all required tables and columns
  * Authentication system fully functional with session management
  * License generation and custom key creation both working properly
  * Application now fully operational in Replit environment with complete multi-tenant functionality
- July 20, 2025. Enhanced user management UI with IP tracking and improved messaging
  * Replaced Email column with IP Address column in user management table
  * Added IP address tracking to database and authentication system with proper real IP detection
  * Implemented "Show" popup dialogs for HWID and IP Address display with copy functionality
  * Fixed pause message functionality by adding pauseUserMessage to validation schemas
  * Enhanced IP detection to capture real user IPv4 addresses instead of internal network IPs
  * Updated pause message system to use application-specific messages instead of hardcoded defaults
  * All user management features now working with comprehensive IP tracking and custom messaging
- July 20, 2025. Optimized navigation by implementing compact dropdown menu system
  * Created "More" dropdown menu with three-dot icon containing Activity, Code, and Docs options
  * Reduced navigation bar size by consolidating 3 tabs into 1 dropdown menu
  * Improved UX with intuitive "More" label instead of confusing "Docs" for multiple functions
  * Maintained consistent navigation access across all pages while improving UI layout
  * Fixed oversized navigation tabs issue with more compact design
- July 20, 2025. Complete rebranding from "Nexx Auth" to "Prime Auth" across entire application
  * Updated all frontend components, loading screens, headers, and documentation pages
  * Changed backend database files from nexxauth.sqlite to primeauth.sqlite 
  * Updated email domains from @nexxauth.local to @primeauth.local in authentication system
  * Renamed C# class files from NexxAuth.cs to PrimeAuth.cs with updated class names and constructors
  * Updated API documentation and all integration examples to use PrimeAuth branding
  * Changed browser tab title from "NEXX AUTH" to "Prime Auth" in HTML file
  * Updated API key generation prefix from "nexx_" to "pa_" for new applications
  * Maintained full functionality while ensuring complete visual and code consistency
- July 20, 2025. Successfully completed migration from Replit Agent to Replit environment
  * Fixed tsx dependency issue that was preventing server startup
  * Enhanced clipboard functionality for HTTP environments to fix HWID and IP address copy issues
  * Improved clipboard utility with better dialog context handling and multiple fallback methods
  * Added comprehensive debugging and error handling for copy operations in HTTP-based deployments
  * Resolved TypeScript compilation error in checkbox indeterminate property handling
  * Updated "PRIME AUTH" capital text to "Prime Auth" proper capitalization in header components
  * All migration checklist items completed - application fully operational in native Replit environment
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
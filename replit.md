# NEXX AUTH - Multi-Tenant Authentication System

## Overview

NexxAuth is a comprehensive authentication system built as a multi-tenant SaaS platform. Each user (authenticated via Google Firebase) gets their own isolated authentication environment where they can create applications, manage users, and control access through API keys. The system provides enterprise-grade features including hardware ID locking, version control, blacklisting, webhook notifications, and comprehensive user management.

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
- **Database**: MongoDB with Mongoose ODM
- **Session Management**: express-session with in-memory store
- **Authentication**: Custom JSON-based authentication system
- **API Design**: RESTful API with multi-tenant isolation
- **Security**: CORS, rate limiting, API key validation, input sanitization

### Database Schema
The system uses a multi-tenant architecture with MongoDB collections:
- `users` - Main user accounts (custom authenticated)
- `applications` - User-created applications with unique API keys
- `appusers` - End users for each application (isolated per tenant)
- `licensekeys` - License management system
- `webhooks` - Webhook configuration for real-time notifications
- `blacklistentries` - IP/username/email/HWID blocking system
- `activitylogs` - Comprehensive audit trail
- `activesessions` - Session storage for authentication

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
- **ODM**: Mongoose with MongoDB
- **Schema**: Defined in `shared/mongo-schema.ts` with validation
- **Connection**: MongoDB Atlas with connection pooling and automatic reconnection

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
- July 17, 2025. Migrated database system from PostgreSQL to MongoDB
  * Replaced PostgreSQL/Drizzle ORM with MongoDB/Mongoose ODM
  * Updated all database schemas and models to use MongoDB collections
  * Fixed session storage to use in-memory store to avoid connection issues
  * Converted all integer IDs to MongoDB ObjectIds throughout the application
  * Updated storage layer to use MongoDB queries and operations
  * Maintained all existing functionality while improving scalability
- July 17, 2025. Completed MongoDB migration and fixed all remaining compatibility issues
  * Fixed ObjectId references throughout the frontend dashboard component
  * Updated all mutation functions to use string IDs instead of integer IDs
  * Fixed Zod schema validation for MongoDB with proper email and date handling
  * Resolved user creation functionality with proper MongoDB-compatible validation
  * Updated all query invalidation calls to use _id instead of id field
  * Successfully tested user creation API endpoint with proper authentication flow
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
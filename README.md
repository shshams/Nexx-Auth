# NexxAuth - Multi-Tenant Authentication System

A comprehensive authentication system built as a multi-tenant SaaS platform with Firebase authentication, PostgreSQL database, and enterprise-grade security features.

## Features

- **Multi-tenant Architecture**: Each user gets isolated authentication environment
- **Firebase Authentication**: Google OAuth integration for tenant authentication
- **Hardware ID Locking**: Prevent account sharing across devices
- **License Key System**: Manage user access with license validation
- **Webhook Integration**: Real-time notifications for authentication events
- **Blacklist Management**: Block users by IP, username, email, or hardware ID
- **Session Management**: Real-time session tracking and validation
- **Activity Logging**: Comprehensive audit trail for all actions

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Database Setup
```bash
npm run db:push
```

## Deployment

### Vercel Deployment
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment instructions.

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `SESSION_SECRET` - Session encryption secret

## API Documentation

The system provides RESTful APIs for:
- User authentication and management
- Application and license key management
- Webhook configuration
- Activity logging and session tracking

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase + custom session management
- **UI**: Tailwind CSS with Shadcn/ui components

## Support

For deployment issues or questions, check the troubleshooting section in VERCEL_DEPLOYMENT.md.
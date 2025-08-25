# MAP Assessment Backend API

A Node.js/Express.js backend API for the MAP Assessment system with advanced authentication, security features, and database integration.

## Features

- 🔐 **Advanced Authentication**: JWT-based authentication with bcrypt password hashing
- 🛡️ **Security**: Rate limiting, CORS, Helmet security headers, input validation
- 🗄️ **Database**: MySQL integration with connection pooling and transactions
- 📊 **Logging**: Comprehensive request logging and error tracking
- 🔄 **Caching**: Response compression and optimization
- ✅ **Validation**: Request validation using express-validator
- 🚀 **Performance**: Optimized for production with proper error handling

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. **Clone the repository and navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=map_assessment
   
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   JWT_EXPIRES_IN=24h
   
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Set up the database:**
   - Create a MySQL database named `map_assessment`
   - Run the migration file: `supabase/migrations/20250825084115_tender_hall.sql`

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with username and password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "first_name": "System",
    "last_name": "Administrator",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/register`
Register a new user (admin only).

**Request Body:**
```json
{
  "username": "newuser",
  "password": "Password123",
  "role": "student",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### GET `/api/auth/verify`
Verify JWT token (requires Authorization header).

**Headers:**
```
Authorization: Bearer <token>
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

#### PUT `/api/auth/profile`
Update user profile (requires authentication).

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name"
}
```

#### PUT `/api/auth/change-password`
Change user password (requires authentication).

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication).

### Health Check

#### GET `/health`
Check server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `INVALID_CREDENTIALS`: Wrong username/password
- `TOKEN_MISSING`: No authorization token provided
- `TOKEN_EXPIRED`: JWT token has expired
- `TOKEN_INVALID`: Invalid JWT token
- `USER_NOT_FOUND`: User doesn't exist
- `USERNAME_EXISTS`: Username already taken
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

## Security Features

- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers protection
- **Input Validation**: All inputs validated and sanitized
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Tokens**: Secure token-based authentication
- **SQL Injection Protection**: Parameterized queries

## Database Schema

The backend uses the existing MySQL schema from `supabase/migrations/20250825084115_tender_hall.sql` with the following tables:

- `users`: User accounts and authentication
- `subjects`: Available assessment subjects
- `questions`: Assessment questions with options
- `assessments`: Student assessment records
- `assessment_responses`: Detailed response tracking

## Development

### Project Structure
```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── validation.js       # Request validation
│   └── security.js         # Security middleware
├── routes/
│   └── auth.js             # Authentication routes
├── server.js               # Main server file
├── package.json            # Dependencies
└── README.md              # This file
```

### Adding New Features

1. Create controllers in `controllers/` directory
2. Add validation in `middleware/validation.js`
3. Create routes in `routes/` directory
4. Import and use routes in `server.js`

## Testing

```bash
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper database credentials
3. Set a strong `JWT_SECRET`
4. Configure CORS for your domain
5. Set up reverse proxy (nginx recommended)
6. Use PM2 or similar process manager

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Write tests for new features
5. Update documentation

## License

MIT License

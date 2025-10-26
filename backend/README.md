# EchoUs Backend

Node.js + Express + Socket.io + Prisma + PostgreSQL backend for EchoUs chat app.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (if not installed)
# Windows: Download from postgresql.org
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql

# Start PostgreSQL service
# Windows: Start from Services
# Mac: brew services start postgresql
# Linux: sudo service postgresql start

# Create database
psql -U postgres
CREATE DATABASE echous_db;
\q
```

**Option B: Render PostgreSQL (Free)**
1. Go to render.com
2. Create PostgreSQL database
3. Copy the connection string

### 3. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development

# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/echous_db?schema=public"

# Or Render PostgreSQL
# DATABASE_URL="postgresql://user:pass@host/dbname"

JWT_SECRET=change_this_to_a_random_string_abc123xyz789

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FRONTEND_URL=http://localhost:8081
```

### 4. Setup Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up (free)
3. Dashboard → Copy credentials
4. Paste into `.env`

### 5. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 6. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

## Database Schema

### Users Table
- Stores user accounts
- Fields: username, name, email, password (hashed), profilePic, status, isOnline, lastSeen

### Messages Table
- Stores all messages
- Fields: content, messageType (text/image/voice), mediaUrl, isRead, senderId, receiverId

### Calls Table
- Stores call history
- Fields: callType (audio/video), status, duration, callerId, receiverId

## API Testing

Use Postman or Thunder Client:

### Register User
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "john",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Copy the `token` from response, use it in headers:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name init

# Open database GUI
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

## Deployment to Render

### Automatic (using render.yaml)

1. Push code to GitHub
2. Go to Render → New → Blueprint
3. Connect repo
4. Done!

### Manual

1. Create PostgreSQL database on Render
2. Create Web Service
3. Connect repo
4. Set build command:
   ```
   npm install && npx prisma generate && npx prisma db push
   ```
5. Set start command:
   ```
   npm start
   ```
6. Add environment variables (from Render dashboard)
7. Deploy!

## Troubleshooting

### Database connection error?
- Check if PostgreSQL is running
- Verify DATABASE_URL format
- Ensure database exists

### Prisma errors?
```bash
# Regenerate client
npx prisma generate

# Clear cache
rm -rf node_modules/.prisma
npm install
```

### Port already in use?
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

## Project Structure

```
backend/
├── controllers/      # Request handlers
│   ├── authController.js
│   ├── messageController.js
│   ├── userController.js
│   └── callController.js
├── routes/          # API routes
│   ├── authRoutes.js
│   ├── messageRoutes.js
│   ├── userRoutes.js
│   └── callRoutes.js
├── middleware/      # Auth middleware
│   └── authMiddleware.js
├── socket/          # Socket.io handlers
│   └── socketHandlers.js
├── utils/           # Helper functions
│   ├── tokenUtils.js
│   └── cloudinaryConfig.js
├── prisma/          # Database
│   └── schema.prisma
├── server.js        # Entry point
├── package.json
├── Dockerfile
└── render.yaml
```

## License

MIT


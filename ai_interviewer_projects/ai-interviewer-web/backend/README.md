# AI Interviewer - Express.js Backend

## 🚀 Overview

This is the Express.js backend for the AI Interviewer application. It provides a RESTful API for user authentication, interview management, and AI-powered evaluation.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **CORS**: Cross-Origin Resource Sharing enabled

## 📋 Features

- ✅ User registration and authentication
- ✅ JWT-based session management
- ✅ Interview session creation and management
- ✅ Real-time answer evaluation
- ✅ MongoDB Atlas integration
- ✅ RESTful API endpoints
- ✅ CORS support for frontend integration

## 🔧 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Copy `config.env` and update with your MongoDB Atlas connection string
   - Update JWT secret key for production

3. **Test the setup**:
   ```bash
   node test_express.js
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Interviews
- `GET /api/roles` - Get available interview roles
- `POST /api/interview/start` - Start new interview session
- `POST /api/interview/submit-answer` - Submit answer for evaluation
- `POST /api/interview/complete` - Complete interview session
- `GET /api/interview/session/:session_id` - Get session details
- `GET /api/user/interviews` - Get user's interview history

## 🔒 Security Features

- **Password Hashing**: All passwords encrypted with bcryptjs
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured for frontend integration
- **Input Validation**: Request body validation
- **Error Handling**: Comprehensive error handling

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  hashed_password: String,
  created_at: Date
}
```

### Sessions Collection
```javascript
{
  _id: ObjectId,
  session_id: String (unique),
  user_id: String,
  role: String,
  name: String,
  questions: Array,
  start_time: Date,
  end_time: Date,
  status: String,
  answers: Array,
  overall_evaluation: Object
}
```

## 🚀 Development

### Start in development mode:
```bash
npm run dev
```

### Start in production mode:
```bash
npm start
```

## 🔧 Configuration

### Environment Variables (config.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_interviewer
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
PORT=8000
```

## 📝 API Documentation

### Register User
```bash
POST /api/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

### Login User
```bash
POST /api/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

### Start Interview
```bash
POST /api/interview/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "role": "Software Engineer"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check your connection string in `config.env`
   - Verify network access in MongoDB Atlas
   - Ensure database user exists

2. **JWT Token Issues**
   - Check JWT secret key configuration
   - Verify token expiration settings

3. **CORS Errors**
   - Ensure frontend URL is in CORS configuration
   - Check if frontend is running on correct port

## 📞 Support

For issues and questions, check the main project documentation or create an issue in the repository.

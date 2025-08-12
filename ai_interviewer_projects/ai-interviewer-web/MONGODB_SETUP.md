# MongoDB Atlas Setup Guide

## 🗄️ Setting Up MongoDB Atlas for AI Interviewer

### Step 1: Create MongoDB Atlas Account

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com/
2. **Sign up** for a free account
3. **Create a new cluster**:
   - Choose "FREE" tier (M0)
   - Select your preferred cloud provider (AWS, Google Cloud, or Azure)
   - Choose a region close to you
   - Click "Create"

### Step 2: Configure Database Access

1. **Go to "Database Access"** in the left sidebar
2. **Click "Add New Database User"**
3. **Create credentials**:
   - Username: `ai_interviewer_user`
   - Password: Create a strong password (save this!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

### Step 3: Configure Network Access

1. **Go to "Network Access"** in the left sidebar
2. **Click "Add IP Address"**
3. **Choose "Allow Access from Anywhere"** (for development)
   - Click "0.0.0.0/0"
   - Click "Confirm"

### Step 4: Get Your Connection String

1. **Go back to "Database"** in the left sidebar
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://ai_interviewer_user:your_password@cluster.mongodb.net/ai_interviewer?retryWrites=true&w=majority
   ```

### Step 5: Configure Your Application

1. **Create a `.env` file** in the `backend` directory:
   ```bash
   cd ai-interviewer-web/backend
   ```

2. **Create the `.env` file** with your connection string:
   ```env
   MONGODB_URI=mongodb+srv://ai_interviewer_user:your_password@cluster.mongodb.net/ai_interviewer?retryWrites=true&w=majority
   JWT_SECRET_KEY=your-secret-key-change-in-production
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

3. **Replace the placeholders**:
   - `your_password`: The password you created in Step 2
   - `your-secret-key-change-in-production`: A random secret key for JWT

### Step 6: Install Dependencies

```bash
cd ai-interviewer-web/backend
pip install -r requirements.txt
```

### Step 7: Test the Connection

```bash
cd ai-interviewer-web
node start.js
```

## 🔧 Troubleshooting

### Connection Issues
- Make sure your IP address is whitelisted in Network Access
- Verify your username and password are correct
- Check that your cluster is running

### Authentication Issues
- Ensure your database user has "Read and write to any database" privileges
- Verify the connection string format is correct

### Environment Variables
- Make sure the `.env` file is in the `backend` directory
- Verify the `MONGODB_URI` variable is set correctly

## 📊 Database Collections

The application will automatically create these collections:
- `users` - User accounts and authentication
- `sessions` - Interview sessions and answers
- `interviews` - Interview metadata

## 🔒 Security Notes

- **Never commit your `.env` file** to version control
- **Use strong passwords** for database users
- **Restrict network access** in production
- **Rotate JWT secrets** regularly

## 🚀 Production Considerations

- Use a paid MongoDB Atlas cluster for production
- Set up proper network security rules
- Enable MongoDB Atlas monitoring and alerts
- Set up automated backups
- Use environment-specific connection strings

# AI Interviewer Web Application

A modern web application that brings Gwen, your AI interviewer, to the web! Practice interviews with role-specific questions and receive real-time feedback from our AI interviewer.

## Features

- 🤖 **AI-Powered Interviews**: Conduct interviews with Gwen, your AI interviewer
- 🎯 **Role-Specific Questions**: Questions tailored for different tech roles
- 💬 **Real-time Feedback**: Get instant feedback on your answers
- 📊 **Interview History**: Track your progress and review past interviews
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🔐 **User Authentication**: Secure login and registration system
- 📄 **PDF Reports**: Generate detailed interview reports

## Tech Stack

### Backend

- **FastAPI**: Modern Python web framework
- **Ollama**: Local LLM for AI-powered evaluations
- **PyPDF2**: Resume parsing
- **ReportLab**: PDF report generation
- **JWT**: Authentication

### Frontend

- **React**: Modern UI framework
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Lucide React**: Beautiful icons
- **React Hot Toast**: Toast notifications

## Prerequisites

- Python 3.8+
- Node.js 16+
- Ollama (for AI evaluations)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ai-interviewer-web
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Ollama (if not already installed)
# Visit: https://ollama.ai/download
# Then pull the llama2 model:
ollama pull llama2
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build the application
npm run build
```

## Running the Application

### 1. Start the Backend

```bash
cd backend
npm start
```

The backend will start on `http://localhost:8000`

### 2. Start the Frontend

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## Usage

1. **Register/Login**: Create an account or sign in
2. **Select Role**: Choose from available interview roles
3. **Start Interview**: Begin your practice interview with Gwen
4. **Answer Questions**: Provide detailed answers to role-specific questions
5. **Receive Feedback**: Get real-time feedback from Gwen
6. **Review Results**: View your interview summary and detailed feedback
7. **Track Progress**: Monitor your interview history and improvements

## Available Roles

- **Cloud Engineer**: AWS, Azure, GCP, DevOps, Infrastructure
- **Backend Engineer**: APIs, Databases, Server-side development
- **Frontend Engineer**: React, JavaScript, UI/UX development
- **UI/UX Designer**: Design systems, User research, Prototyping
- **Software Development Engineer**: Full-stack development
- **Data Analyst**: Data analysis, SQL, Visualization
- **AI Engineer**: Machine Learning, AI, Neural Networks

## API Endpoints

### Authentication

- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Interviews

- `GET /api/roles` - Get available roles
- `POST /api/interview/start` - Start new interview
- `POST /api/interview/submit-answer` - Submit answer
- `POST /api/interview/complete` - Complete interview
- `GET /api/interview/session/{session_id}` - Get session details
- `GET /api/user/interviews` - Get user's interview history

## Deployment

### Backend Deployment (Heroku)

1. Create a `Procfile` in the backend directory:

```
web: node server.js
```

2. Deploy to Heroku:

```bash
heroku create your-app-name
git add .
git commit -m "Deploy backend"
git push heroku main
```

### Frontend Deployment (Vercel/Netlify)

1. Build the application:

```bash
cd frontend
npm run build
```

2. Deploy to Vercel:

```bash
vercel --prod
```

Or deploy to Netlify by dragging the `build` folder to Netlify's dashboard.

### Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=https://your-backend-url.herokuapp.com
```

## Configuration

### Backend Configuration

Update `backend/server.js` to configure:

- CORS origins for your frontend domain
- Database connection (MongoDB)
- JWT secret key

### Frontend Configuration

Update `frontend/src/services/api.js` to configure:

- API base URL
- Authentication headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Ollama not found**: Make sure Ollama is installed and running
2. **CORS errors**: Update CORS origins in backend/server.js
3. **Authentication errors**: Check JWT configuration
4. **Frontend build errors**: Clear node_modules and reinstall

### Getting Help

- Check the console for error messages
- Ensure all dependencies are installed
- Verify Ollama is running with `ollama list`
- Check network connectivity between frontend and backend

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with FastAPI and React
- Powered by Ollama for AI evaluations
- Styled with Tailwind CSS
- Icons from Lucide React

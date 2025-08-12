# AI Interview Agent - Voice Edition

An intelligent AI-powered interview agent that conducts voice-based interviews, analyzes resumes, and generates comprehensive reports.

## 🎯 Features

- **Voice-Based Interaction**: Natural voice conversation using text-to-speech and speech-to-text
- **Resume Analysis**: Automatically parse PDF resumes and extract relevant skills and experience
- **Role-Specific Questions**: Tailored interview questions for different positions:
  - Cloud Engineer
  - Backend Engineer
  - Frontend Engineer
  - UI/UX Designer
  - Software Development Engineer (SDE)
  - Data Analyst
  - AI Engineer
- **AI-Powered Evaluation**: Intelligent feedback using Ollama LLM
- **Comprehensive Reports**: Detailed PDF reports with analysis and recommendations
- **User-Friendly Interface**: Simple voice commands and natural conversation flow

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** installed on your system
2. **Ollama** installed and running locally
3. **Microphone** and **speakers** for voice interaction
4. **PDF resume** (optional) for enhanced analysis

### Installation

1. **Clone or download** the project files
2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Install Ollama** (if not already installed):
   - Visit [ollama.ai](https://ollama.ai) for installation instructions
   - Pull the required model:
     ```bash
     ollama pull llama2
     ```

### Usage

1. **Start the interview agent**:

   ```bash
   python main.py
   ```

2. **Follow the voice prompts**:

   - Provide your name when asked
   - Choose your role from the available options
   - Optionally provide a PDF resume for analysis
   - Answer the interview questions verbally
   - Receive real-time feedback on your responses

3. **Review your report**:
   - A comprehensive PDF report will be generated automatically
   - The report includes all Q&A, feedback, and recommendations

## 📁 Project Structure

```
ai-interviewer-voice/
├── main.py                 # Main application entry point
├── audio_utils.py         # Voice interaction utilities
├── evaluator.py           # AI-powered answer evaluation
├── questions.py           # Role-specific interview questions
├── resume_parser.py       # PDF resume analysis
├── report_writer.py       # PDF report generation
├── requirements.txt       # Python dependencies
├── test_agent.py         # Component testing script
└── README.md             # This file
```

## 🎤 Voice Commands

The agent responds to natural speech. Here are some key phrases:

- **"Yes"** or **"Yeah"** - Confirm selections
- **"No"** - Decline options
- **Role numbers** - Select your preferred role (1-7)
- **Clear speech** - Speak naturally and clearly for best recognition

## 📊 Supported Roles

### 1. Cloud Engineer

- AWS, Azure, GCP experience
- Containerization and orchestration
- Infrastructure as Code
- CI/CD pipelines
- Security and cost optimization

### 2. Backend Engineer

- Backend frameworks and technologies
- Database design and optimization
- API development
- Microservices architecture
- Performance optimization

### 3. Frontend Engineer

- Frontend frameworks (React, Vue, Angular)
- Responsive design and accessibility
- State management
- Build tools and bundlers
- Modern JavaScript/TypeScript

### 4. UI/UX Designer

- Design process and methodology
- User research and testing
- Design systems and tools
- Collaboration with developers
- Accessibility and inclusivity

### 5. Software Development Engineer (SDE)

- Data structures and algorithms
- System design and architecture
- Problem-solving approaches
- Version control and collaboration
- Technology trends

### 6. Data Analyst

- Data analysis and visualization
- SQL and database querying
- Statistical analysis
- Data storytelling
- Business intelligence

### 7. AI Engineer

- Machine learning frameworks
- Deep learning and neural networks
- MLOps and model deployment
- NLP and computer vision
- AI research and development

## 🔧 Configuration

### Audio Settings

The agent automatically adjusts for ambient noise. For best results:

- Use a quiet environment
- Speak clearly and at a moderate pace
- Position microphone close to your mouth
- Avoid background noise

### Ollama Configuration

The agent uses Ollama with the `llama2` model. To use a different model:

1. Pull your preferred model:

   ```bash
   ollama pull <model-name>
   ```

2. Update the model name in `evaluator.py`:
   ```python
   response = ollama.chat(model='your-model-name', messages=[...])
   ```

## 📈 Report Features

Generated reports include:

- **Interview Summary**: Date, role, total questions
- **Overall Evaluation**: AI-generated feedback on performance
- **Question-by-Question Analysis**: Individual Q&A with feedback
- **Recommendations**: Specific areas for improvement
- **Resume Analysis** (if provided): Skills and experience insights

## 🧪 Testing

Run the test suite to verify all components:

```bash
python test_agent.py
```

This will test:

- Module imports
- Question generation
- Resume parsing
- Answer evaluation
- Audio utilities
- Report generation

## 🐛 Troubleshooting

### Common Issues

1. **Audio not working**:

   - Check microphone permissions
   - Ensure speakers are connected and working
   - Test with `python -c "from audio_utils import test_audio; test_audio()"`

2. **Ollama not responding**:

   - Ensure Ollama is running: `ollama serve`
   - Check if llama2 model is installed: `ollama list`
   - Pull the model if needed: `ollama pull llama2`

3. **PDF parsing issues**:

   - Ensure PDF is not password-protected
   - Check if PDF contains extractable text
   - Verify PyPDF2 is installed correctly

4. **Speech recognition problems**:
   - Check internet connection (uses Google Speech Recognition)
   - Ensure microphone is working
   - Try speaking more clearly and slowly

### Error Messages

- **"Sorry, I didn't catch that"** - Speech recognition failed, try speaking again
- **"Error with microphone"** - Check microphone settings and permissions
- **"Ollama connection failed"** - Ensure Ollama is running and accessible

## 🤝 Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Ollama** for providing the LLM capabilities
- **Google Speech Recognition** for voice-to-text conversion
- **PyPDF2** for PDF parsing functionality
- **ReportLab** for PDF report generation

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Run the test suite to identify problems
3. Review the error messages for specific issues
4. Ensure all dependencies are properly installed

---

**Happy Interviewing! 🎯**

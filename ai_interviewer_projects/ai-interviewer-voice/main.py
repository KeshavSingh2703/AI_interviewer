# Main voice-only bot logic
import os
import json
from datetime import datetime
from audio_utils import speak, listen
from evaluator import evaluate_answer, evaluate_interview_session
from questions import get_questions_for_role, get_available_roles
from resume_parser import resume_parser
from report_writer import write_report

class AIInterviewAgent:
    def __init__(self):
        self.interview_data = []
        self.current_role = None
        self.resume_data = None
        self.user_name = None
        self.agent_name = "Gwen"
    
    def greet_user(self):
        """Gwen's personalized greeting and introduction for a real interview experience."""
        speak("Hello! I'm Gwen, and I will be conducting your interview today. I'm excited to meet you and learn more about your background and experience!")
        
        # Get user's name - ensure Gwen continues even if voice recognition fails
        speak("What is your name?")
        
        # Use a more robust approach to get the name
        name = None
        try:
            name = listen(timeout=10, phrase_time_limit=10)
            if name and name.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
                self.user_name = name
                speak(f"Pleased to meet you, {name}! How are you doing today?")
            else:
                self.user_name = "Candidate"
                speak("Pleased to meet you! How are you doing today?")
        except Exception as e:
            self.user_name = "Candidate"
            speak("Pleased to meet you! How are you doing today?")
        
        # Always continue to ask how they're doing - this is crucial for conversation flow
        speak("How are you doing today?")
        
        # Use a more robust approach to get the response
        response = None
        try:
            response = listen(timeout=10, phrase_time_limit=10)
            if response and response.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
                speak("That's wonderful! I'm glad you're doing well. I'm here to make this interview experience comfortable and professional for you.")
            else:
                speak("I understand! Let's make this interview experience comfortable and professional for you.")
        except Exception as e:
            speak("I understand! Let's make this interview experience comfortable and professional for you.")
        
        # Ensure Gwen continues to the next step - this is the key fix
        speak("Now, let's proceed with your interview preparation.")
        
        # Additional confirmation that Gwen is continuing
        speak("I'm ready to help you with your interview today.")
        
        # Now ask about the role - this is the new addition
        self.ask_for_role()
    
    def ask_for_role(self):
        """Ask user for their preferred role after greeting."""
        roles = get_available_roles()
        role_names = {
            'cloud_engineer': 'Cloud Engineer',
            'backend_engineer': 'Backend Engineer', 
            'frontend_engineer': 'Frontend Engineer',
            'ui_ux_designer': 'UI/UX Designer',
            'sde': 'Software Development Engineer',
            'data_analyst': 'Data Analyst',
            'ai_engineer': 'AI Engineer'
        }
        
        # Use the user's name if available
        user_display = self.user_name if self.user_name and self.user_name != "Candidate" else "there"
        
        speak(f"Now {user_display}, I'd like to understand what role you're interested in. I have several positions available:")
        for i, role in enumerate(roles, 1):
            speak(f"{i}. {role_names.get(role, role.replace('_', ' ').title())}")
        
        speak("Which role are you most interested in? You can say the number or tell me the role name directly.")
        
        # Use a more robust approach to get the role selection
        response = None
        try:
            response = listen(timeout=10, phrase_time_limit=10)
            if response and response.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
                response = response.lower()
                # Try to extract number from response
                try:
                    for i, role in enumerate(roles, 1):
                        if str(i) in response or role.replace('_', ' ') in response:
                            self.current_role = role
                            speak(f"Excellent! I'll be conducting your interview for the {role_names.get(role, role.replace('_', ' ').title())} position.")
                            return role
                except:
                    pass
            else:
                # Default to SDE if selection fails
                self.current_role = 'sde'
                speak("I'll proceed with the Software Development Engineer role, which is a fantastic opportunity!")
                return 'sde'
        except Exception as e:
            # Default to SDE if selection fails
            self.current_role = 'sde'
            speak("I'll proceed with the Software Development Engineer role, which is a fantastic opportunity!")
            return 'sde'
        
        # Default to SDE if selection fails
        self.current_role = 'sde'
        speak("I'll proceed with the Software Development Engineer role, which is a fantastic opportunity!")
        return 'sde'
    
    def get_voice_response_with_retry(self, context=""):
        """Get a voice response from the user with proper retry logic."""
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                response = listen()
                # Check if we got a valid response
                if response and response.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
                    return response
                elif attempt < max_attempts - 1:
                    speak("I didn't catch that clearly. Could you please repeat?")
                else:
                    # Return a default response to keep conversation flowing
                    return "No response"
            except Exception as e:
                if attempt < max_attempts - 1:
                    speak("I didn't catch that clearly. Could you please repeat?")
                else:
                    return "No response"
        return "No response"
    
    def select_role(self):
        """Let user select a role through natural voice conversation."""
        roles = get_available_roles()
        role_names = {
            'cloud_engineer': 'Cloud Engineer',
            'backend_engineer': 'Backend Engineer', 
            'frontend_engineer': 'Frontend Engineer',
            'ui_ux_designer': 'UI/UX Designer',
            'sde': 'Software Development Engineer',
            'data_analyst': 'Data Analyst',
            'ai_engineer': 'AI Engineer'
        }
        
        speak("Now, I'd like to understand what role you're interested in. I have several positions available:")
        for i, role in enumerate(roles, 1):
            speak(f"{i}. {role_names.get(role, role.replace('_', ' ').title())}")
        
        speak("Which role are you most interested in? You can say the number or tell me the role name directly.")
        response = self.get_voice_response_with_retry("role selection").lower()
        
        # Try to extract number from response
        try:
            for i, role in enumerate(roles, 1):
                if str(i) in response or role.replace('_', ' ') in response:
                    self.current_role = role
                    speak(f"Excellent! I'll be conducting your interview for the {role_names.get(role, role.replace('_', ' ').title())} position.")
                    return role
        except:
            pass
        
        # Default to SDE if selection fails
        self.current_role = 'sde'
        speak("I'll proceed with the Software Development Engineer role, which is a fantastic opportunity!")
        return 'sde'
    
    def parse_resume(self):
        """Parse user's resume if provided - voice-based conversation."""
        speak("Do you have a resume with you today that you'd like me to review? If yes, please place it in the current directory and say 'yes'. Otherwise, say 'no'.")
        response = self.get_voice_response_with_retry("resume question").lower()
        
        if 'yes' in response or 'yeah' in response:
            # Look for PDF files in current directory
            pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
            
            if pdf_files:
                resume_file = pdf_files[0]  # Use the first PDF found
                speak(f"Perfect! I found {resume_file}. Let me take a moment to review your background.")
                
                try:
                    self.resume_data = resume_parser.parse_resume(resume_file)
                    if self.resume_data.get('parsed_successfully'):
                        suggested_role = self.resume_data.get('suggested_role', 'sde')
                        speak(f"Based on your resume, I think the {suggested_role.replace('_', ' ').title()} role would be an excellent fit for your background. Would you like to proceed with this role for our interview?")
                        
                        response = self.get_voice_response_with_retry("resume role suggestion").lower()
                        if 'yes' in response or 'yeah' in response or 'sure' in response:
                            self.current_role = suggested_role
                            speak(f"Wonderful! I'll proceed with the {suggested_role.replace('_', ' ').title()} role questions.")
                        else:
                            speak("No problem! I'll use your previously selected role then.")
                    else:
                        speak("I had a bit of trouble reading your resume, but that's perfectly fine. We can proceed with the interview.")
                except Exception as e:
                    speak("I encountered a small issue reading your resume, but that's okay. We can proceed with the interview.")
            else:
                speak("I couldn't find any PDF files in the current directory. We'll proceed without resume review.")
        else:
            speak("No problem at all! We'll proceed with the interview without resume review.")
        
        # Ensure Gwen continues talking after resume check
        speak("Now, let's proceed with the interview.")
    
    def run_interview(self):
        """Run the complete voice-based interview process with Gwen's personality."""
        # Gwen's introduction and greeting (this now includes role selection)
        self.greet_user()
        
        # Ensure conversation continues - this is the key fix
        speak("Let me help you prepare for your interview today.")
        
        # Parse resume if available
        self.parse_resume()
        
        # Role selection is already handled in greet_user(), so we don't need to call it again
        
        # Get questions for the selected role
        questions = get_questions_for_role(self.current_role, num_questions=6)
        
        speak(f"Perfect! I'll be asking you {len(questions)} questions for the {self.current_role.replace('_', ' ').title()} position.")
        speak("Let's begin the interview. Please speak clearly and take your time with your answers. I'm here to conduct a thorough and professional interview.")
        
        # Conduct the interview with natural conversation flow
        for i, question in enumerate(questions, 1):
            # Ask the question naturally
            if i == 1:
                speak("Let's start with our first question.")
            elif i == len(questions):
                speak("And now for our final question.")
            else:
                speak("Moving on to our next question.")
            
            speak(question)
            
            # Get user's answer with natural conversational flow
            speak("Please go ahead and share your thoughts.")
            answer = self.get_voice_response_with_retry(f"question {i}")
            
            if answer and answer.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
                speak("Thank you for that detailed response. Let me provide you with some feedback.")
                
                # Evaluate the answer
                feedback = evaluate_answer(answer, question)
                speak(feedback)
                
                # Store the interview data
                self.interview_data.append({
                    'question': question,
                    'answer': answer,
                    'feedback': feedback,
                    'question_number': i
                })
                
                # Add natural transition to next question
                if i < len(questions):
                    speak("Thank you. Let's continue with our interview.")
            else:
                speak("I didn't catch your response clearly. Could you please repeat your answer?")
                # Give them another chance
                answer = self.get_voice_response_with_retry(f"question {i} retry")
                if answer and answer.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
                    speak("Thank you for clarifying. Let me provide some feedback.")
                    feedback = evaluate_answer(answer, question)
                    speak(feedback)
                    self.interview_data.append({
                        'question': question,
                        'answer': answer,
                        'feedback': feedback,
                        'question_number': i
                    })
                else:
                    speak("I understand. Let's move forward with the next question.")
        
        # Generate final evaluation
        speak("Excellent! We've completed our interview. Let me take a moment to review our conversation and provide you with a comprehensive evaluation.")
        final_evaluation = evaluate_interview_session(self.interview_data)
        
        # Generate report
        self.generate_report(final_evaluation)
        
        speak("Your interview report has been generated and saved. Thank you for participating in this interview with me today. I hope this experience was helpful and professional for you. Is there anything else you'd like to discuss or any questions you have for me?")
        
        # Listen for any final questions or comments
        final_response = self.get_voice_response_with_retry("final questions")
        if final_response and final_response.lower() not in ["sorry, i didn't catch that", "sorry, i didn't hear anything", "sorry, there was an error", "no response"]:
            speak("I appreciate your questions and feedback. Thank you again for your time today. I wish you the very best in your career endeavors!")
        else:
            speak("Thank you again for your time today. I wish you the very best in your career endeavors!")
    
    def generate_report(self, final_evaluation):
        """Generate and save the interview report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"interview_report_{self.user_name}_{timestamp}.pdf"
        
        # Prepare data for report
        report_data = {
            'user_name': self.user_name,
            'role': self.current_role,
            'date': datetime.now().strftime("%B %d, %Y"),
            'interview_data': self.interview_data,
            'final_evaluation': final_evaluation,
            'resume_data': self.resume_data
        }
        
        try:
            write_report(self.user_name, self.interview_data, filename)
        except Exception as e:
            pass

def main():
    """Main function to run the AI interview agent with Gwen."""
    agent = AIInterviewAgent()
    agent.run_interview()

if __name__ == "__main__":
    main()

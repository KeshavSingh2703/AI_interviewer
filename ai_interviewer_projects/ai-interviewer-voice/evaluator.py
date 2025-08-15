# Evaluate answers using Ollama
import ollama
import json
from typing import Dict, Any

def evaluate_answer(answer: str, question: str = None) -> str:
    """
    Evaluate an interview answer using Ollama with Rick's natural interview feedback.
    
    Args:
        answer (str): The candidate's answer
        question (str, optional): The question that was asked
    
    Returns:
        str: Feedback on the answer
    """
    try:
        # Create a prompt for evaluation with Rick's personality
        if question:
            prompt = f"""
            You are Rick, a professional and friendly AI interviewer conducting a real interview. You're providing natural, conversational feedback to a candidate's response.
            
            Question: {question}
            Answer: {answer}
            
            Please provide natural, conversational feedback on this answer as if you're in a real interview. Consider:
            1. Relevance to the question
            2. Clarity and communication
            3. Specificity and examples
            4. Professionalism
            5. Areas for improvement
            
            Provide feedback in 2-3 sentences that sounds natural and conversational. Use a warm, professional tone as if you're a real interviewer giving immediate feedback. Don't use phrases like "Thank you for your answer" or "I noticed you provided" - just give natural feedback.
            """
        else:
            prompt = f"""
            You are Rick, a professional and friendly AI interviewer conducting a real interview. You're providing natural, conversational feedback to a candidate's response.
            
            Answer: {answer}
            
            Please provide natural, conversational feedback on this answer as if you're in a real interview. Consider:
            1. Clarity and communication
            2. Specificity and examples
            3. Professionalism
            4. Areas for improvement
            
            Provide feedback in 2-3 sentences that sounds natural and conversational. Use a warm, professional tone as if you're a real interviewer giving immediate feedback. Don't use phrases like "Thank you for your answer" or "I noticed you provided" - just give natural feedback.
            """
        
        # Use Ollama to generate feedback
        response = ollama.chat(model='llama2', messages=[
            {
                'role': 'user',
                'content': prompt
            }
        ])
        
        # Extract the feedback from the response
        feedback = response['message']['content'].strip()
        
        # If feedback is too long, truncate it
        if len(feedback) > 500:
            feedback = feedback[:497] + "..."
        
        return feedback
    
    except Exception as e:
        # Fallback feedback if Ollama fails - still natural and conversational
        return f"Your response shows good understanding of the topic. Consider adding more specific examples from your experience to make it even stronger. That would help demonstrate your practical knowledge."

def evaluate_interview_session(interview_data: list) -> Dict[str, Any]:
    """
    Evaluate an entire interview session with Rick's natural personality.
    
    Args:
        interview_data (list): List of dictionaries with 'question', 'answer', and 'feedback' keys
    
    Returns:
        Dict[str, Any]: Overall evaluation results
    """
    try:
        total_questions = len(interview_data)
        if total_questions == 0:
            return {"error": "No interview data provided"}
        
        # Calculate average answer length
        total_length = sum(len(item.get('answer', '')) for item in interview_data)
        avg_length = total_length / total_questions
        
        # Generate overall feedback with Rick's personality
        overall_prompt = f"""
        You are Rick, a professional and friendly AI interviewer providing overall feedback for an interview session.
        
        Interview Summary:
        - Total questions answered: {total_questions}
        - Average answer length: {avg_length:.0f} characters
        
        Individual responses:
        {chr(10).join([f"Q: {item.get('question', 'N/A')} | A: {item.get('answer', 'N/A')[:100]}..." for item in interview_data])}
        
        Please provide overall feedback on the candidate's interview performance. Consider:
        1. Overall communication skills
        2. Consistency in responses
        3. Areas of strength
        4. Areas for improvement
        5. Overall impression
        
        Provide feedback in 3-4 sentences that sounds natural and conversational. Use a warm, professional tone as if you're wrapping up a real interview. Be encouraging but honest about areas for improvement.
        """
        
        response = ollama.chat(model='llama2', messages=[
            {
                'role': 'user',
                'content': overall_prompt
            }
        ])
        
        overall_feedback = response['message']['content'].strip()
        
        return {
            "total_questions": total_questions,
            "average_answer_length": avg_length,
            "overall_feedback": overall_feedback,
            "individual_feedback": [item.get('feedback', 'No feedback available') for item in interview_data]
        }
    
    except Exception as e:
        return {
            "error": f"Failed to evaluate interview session: {str(e)}",
            "total_questions": len(interview_data),
            "overall_feedback": "I really enjoyed our conversation today! You showed good potential and I'm confident you'll continue to improve with practice. Your communication skills are developing well."
        }

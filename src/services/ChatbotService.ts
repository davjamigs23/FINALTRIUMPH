import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are the Triumph Yearbook Publishing FAQ assistant. 
Answer questions about photo sessions, requirements, payments, and batch management.
Rules:
1. If you don't know the answer, ask them to contact the staff via the Help section.
2. Photo sessions are booked in the 'Schedule' section.
3. Documents (Clearance, Payment Proof) are uploaded in 'Documents'.
4. Students must reach 100% completion status to finalize their entries.
5. Dress code for photo sessions: Formal attire (Men: White shirt/Blazer; Women: White blouse/Blazer).
6. Deadlines are visible on the Student Dashboard.
Be professional, encouraging, and helpful.
`;

const LOCAL_FAQ: { keywords: string[], answer: string, hint?: string }[] = [
  {
    keywords: ['dress code', 'wear', 'outfit', 'clothes', 'attire'],
    answer: "For your photo session, please wear formal attire. Men: White shirt with blazer. Women: White blouse with blazer. This ensures consistency for the yearbook layout.",
    hint: "Are you asking about the dress code? Please wear formal attire (white shirt/blouse with blazer) for your session."
  },
  {
    keywords: ['clearance', 'document', 'requirement', 'upload'],
    answer: "You can upload your Clearance Form and Payment Receipt in the 'Documents' section of your dashboard. Once uploaded, our staff will review them within 2-3 working days.",
    hint: "Do you need help with requirements? You can upload your Clearance and Receipt in 'Documents'."
  },
  {
    keywords: ['payment', 'receipt', 'fee', 'how much', 'pay'],
    answer: "Graduation package fees can be paid via authorized channels. Please upload your proof of payment (receipt) in 'Documents' for verification.",
    hint: "Are you checking on payments? You can upload your receipt in the 'Documents' tab."
  },
  {
    keywords: ['schedule', 'booking', 'photo', 'appointment', 'slot', 'book'],
    answer: "You can book or manage your photo session appointment in the 'Schedule' tab on your dashboard. Please choose a slot that fits your batch's designated schedule.",
    hint: "Do you mean book an appointment? You can manage your photo session in the 'Schedule' tab."
  },
  {
    keywords: ['completion', 'status', 'progress', '100%'],
    answer: "To reach 100% completion, you must: 1. Complete your profile details, 2. Book a photo session, 3. Upload your Clearance form, and 4. Upload your Payment Receipt.",
    hint: "Want to check your progress? Ensure your profile, booking, and documents are all complete!"
  },
  {
    keywords: ['contact', 'help', 'staff', 'support'],
    answer: "You can reach our help desk at support@triumphyearbook.com or visit our office during business hours (Monday-Friday, 8AM - 5PM).",
    hint: "Need to contact us? Email support@triumphyearbook.com or visit our help desk."
  }
];

export const ChatbotService = {
  async getResponse(message: string) {
    const lowCaseMsg = message.toLowerCase().trim();
    
    // Check multiple possible sources for the API key
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                   (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ||
                   (typeof window !== 'undefined' ? (window as any).VITE_GEMINI_API_KEY : undefined) ||
                   (typeof window !== 'undefined' ? (window as any).process?.env?.GEMINI_API_KEY : undefined);
    
    // Quick search in local FAQ first before checking API key
    const localMatch = LOCAL_FAQ.find(faq => 
      faq.keywords.some(keyword => lowCaseMsg.includes(keyword))
    );

    if (!apiKey || apiKey === 'undefined' || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      if (localMatch) {
        return lowCaseMsg.length < 8 ? localMatch.hint || localMatch.answer : localMatch.answer;
      }
      console.error('Gemini API key is missing.');
      return "I'm here to help! Did you mean to ask about the dress code, document requirements, or how to book a session?";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      if (!response || !response.text) {
        throw new Error('Empty response from Gemini API');
      }

      return response.text;
    } catch (error: any) {
      console.error('Gemini Chatbot Error:', error);
      
      const errorString = typeof error === 'string' ? error : JSON.stringify(error) + (error.message || '');

      // On common errors, try local FAQ as fallback without mentioning "quota" or "errors"
      if (localMatch) {
        return lowCaseMsg.length < 8 ? localMatch.hint || localMatch.answer : localMatch.answer;
      }
      
      return "I'm focusing on graduation inquiries right now. Could you tell me if you're looking for help with the dress code, requirements, or booking?";
    }
  }
};

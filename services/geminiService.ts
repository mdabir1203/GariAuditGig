
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeVehicleDefect = async (imageBase64: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64.split(',')[1] || imageBase64,
            },
          },
          {
            text: "Analyze this vehicle image and identify any specific physical defects like scratches, dents, or cracks. Provide a professional description and estimate the severity (Low/Medium/High)."
          }
        ]
      },
      config: {
        temperature: 0.4,
        topP: 0.8,
      }
    });

    return response.text || "Unable to analyze defect at this time.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error analyzing image. Please describe the defect manually.";
  }
};

export const verifyRegistrationCard = async (
  imageBase64: string, 
  expectedPlate: string, 
  expectedModel: string
): Promise<{ verified: boolean; extractedInfo: string }> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64.split(',')[1] || imageBase64,
            },
          },
          {
            text: `This is a vehicle registration document. Verify if the License Plate (Registration No) is "${expectedPlate}" and the Car Model is related to "${expectedModel}". Return "VERIFIED: YES" if both match or are highly similar, otherwise "VERIFIED: NO". Also list the extracted registration number and model.`
          }
        ]
      }
    });

    const text = response.text || "";
    const isVerified = text.toUpperCase().includes("VERIFIED: YES");
    
    return {
      verified: isVerified,
      extractedInfo: text
    };
  } catch (error) {
    console.error("Registration Verification Error:", error);
    return { verified: false, extractedInfo: "Analysis failed." };
  }
};

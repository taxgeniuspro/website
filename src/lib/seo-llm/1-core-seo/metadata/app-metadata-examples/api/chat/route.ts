import { type NextRequest, NextResponse } from 'next/server'

import { SERVICE_ENDPOINTS } from '@/lib/constants'

const OLLAMA_URL = SERVICE_ENDPOINTS.OLLAMA
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3'

// System prompt for the printing assistant
const SYSTEM_PROMPT = `You are a helpful assistant for GangRun Printing, a professional printing company.
You help customers with:
- Product information and recommendations
- Pricing and quotes
- Order status inquiries
- Technical specifications for print files
- Design tips and best practices
- Shipping and delivery information

Be friendly, professional, and knowledgeable about printing services.
If you don't know something specific, offer to connect the customer with a human representative.

Available products include:
- Business Cards (standard, premium suede, foil)
- Flyers and Brochures
- Postcards and Mailers
- Posters and Banners
- Stickers and Labels
- Letterheads and Envelopes
- Greeting Cards
- Presentation Folders

We offer various paper stocks, sizes, quantities, and finishing options like lamination, UV coating, and foil stamping.`

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Prepare messages for Ollama
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    // Call Ollama API
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 500,
        },
      }),
    })

    if (!response.ok) {
      // Fallback response if Ollama is not available
      return NextResponse.json({
        response:
          "I apologize, but I'm temporarily unable to process your request. Please try again later or contact our support team at support@gangrunprinting.com for immediate assistance.",
        fallback: true,
      })
    }

    const data = await response.json()

    // Extract the assistant's response
    const aiResponse =
      data.message?.content || data.response || "I'm sorry, I couldn't generate a response."

    // Check if the response suggests connecting with a human
    const needsHuman =
      aiResponse.toLowerCase().includes('representative') ||
      aiResponse.toLowerCase().includes('support team') ||
      aiResponse.toLowerCase().includes('contact us')

    return NextResponse.json({
      response: aiResponse,
      needsHuman,
      model: OLLAMA_MODEL,
    })
  } catch (error) {
    // Return a helpful fallback message
    return NextResponse.json({
      response:
        "I apologize, but I'm having trouble connecting to our chat service. For immediate assistance, please email us at support@gangrunprinting.com or call during business hours.",
      fallback: true,
      error: true,
    })
  }
}

// GET endpoint to check if chat service is available
export async function GET(): Promise<unknown> {
  try {
    // Check if Ollama is running
    const response = await fetch(`${OLLAMA_URL}/api/tags`)

    if (response.ok) {
      const data = await response.json()
      const hasModel = data.models?.some((m: Record<string, unknown>) => {
        const name = m.name as string
        return name?.includes(OLLAMA_MODEL) || false
      })

      return NextResponse.json({
        status: 'online',
        model: OLLAMA_MODEL,
        modelAvailable: hasModel,
        endpoint: OLLAMA_URL,
      })
    }

    return NextResponse.json({
      status: 'offline',
      message: 'Ollama service is not responding',
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Unable to connect to Ollama service',
    })
  }
}

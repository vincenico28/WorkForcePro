import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Sparkles, TrendingUp, Users, Clock, BarChart3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: 'Attendance trends this week' },
  { icon: Users, text: 'Who is on leave today?' },
  { icon: Clock, text: 'Overtime report this month' },
  { icon: BarChart3, text: 'Department headcount' },
]

const MOCK_RESPONSES: Record<string, string> = {
  default: "I analyzed your workforce data. Here's what I found:\n\n**Key Insights:**\n- Attendance rate is 87% this week (above average)\n- 3 pending leave requests require your attention\n- Engineering team has the highest overtime this month (avg 2.4 hrs/day)\n\nWould you like me to dig deeper into any of these areas?",
  attendance: "**Attendance Analysis — This Week:**\n\n📊 Overall rate: **87%** (↑4% from last week)\n\n**By Department:**\n- Engineering: 91% ✅\n- Sales: 83% ⚠️\n- Marketing: 86%\n- HR: 94%\n\n**Flagged:** 2 employees with 3+ late arrivals this week. Recommended action: schedule 1:1 check-ins.",
  leave: "**Employees Currently On Leave:**\n\n1. **Chris Taylor** (Operations) — Maternity leave, returns Aug 24\n2. **Olivia Kim** (Engineering) — Sick leave, 2 days\n\n**Pending Requests:**\n- James Park: 5 days vacation (Jun 30 – Jul 4) 🟡\n- Zoe Martinez: 5 days vacation 🟡\n- Priya Sharma: 1 day emergency 🟡\n\nAll 3 require HR approval.",
  overtime: "**Overtime Report — June:**\n\n💼 Total overtime hours: **284 hrs**\n\n**Top Earners:**\n1. Elena Rodriguez — 28.5 hrs\n2. James Park — 24.2 hrs\n3. Olivia Kim — 21.8 hrs\n\n**Projected cost:** $12,400\n**Recommendation:** Consider hiring 1 additional engineer to reduce overtime by ~40%.",
  headcount: "**Department Headcount:**\n\nEngineering: **24** 📈 (+2 since Q1)\nSales: **15**\nMarketing: **10**\nOperations: **9**\nFinance: **7**\nProduct: **8**\nDesign: **6**\nHR: **5**\n\n**Total: 84 employees** | 1 on leave | 3 open positions",
}

import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'You are an AI HR Assistant for a Smart Workforce Management System. You help managers and employees analyze workforce data, generate reports, answer HR questions, and provide insights. Keep your answers concise, professional, and helpful. Use markdown for formatting.',
})

function formatMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.startsWith('**')) {
      return <p key={i} className="text-sm">{line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</p>
    }
    if (line.startsWith('#')) {
      return <p key={i} className="font-bold text-lg mt-2 mb-1">{line.replace(/#/g, '')}</p>
    }
    if (line.startsWith('* ')) {
      return <li key={i} className="text-sm ml-4 list-disc">{line.substring(2)}</li>
    }
    if (line === '') return <div key={i} className="h-1" />
    return <p key={i} className="text-sm leading-relaxed">{line}</p>
  })
}

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm your AI HR Assistant powered by Gemini. I can help you analyze workforce data, generate reports, answer HR questions, and provide insights. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Store the chat session to maintain conversation history
  const chatRef = useRef<any>(null)

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = model.startChat({
        history: [],
      })
    }
  }, [])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim()
    if (!content) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      if (!chatRef.current) {
        chatRef.current = model.startChat({ history: [] })
      }
      
      const result = await chatRef.current.sendMessage(content)
      const responseText = result.response.text()
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (error) {
      console.error('Gemini API Error:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error connecting to the AI service. Please make sure your API key is configured correctly.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600">
          <Brain className="size-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">AI HR Assistant</h2>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          <Sparkles className="mr-1 size-3" />
          GPT-4
        </Badge>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto p-3 pb-0">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.text}
            onClick={() => sendMessage(p.text)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <p.icon className="size-3" />
            {p.text}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-scroll p-4 pr-2">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-600">
                  <Brain className="size-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}
              >
                <div className="space-y-0.5">
                  {formatMessage(msg.content)}
                </div>
                <p className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-600">
                <Brain className="size-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage() }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about attendance, leaves, schedules..."
            className="flex-1 text-sm"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
            <Send className="size-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          AI responses are based on your workforce data. Always verify critical decisions.
        </p>
      </div>
    </div>
  )
}

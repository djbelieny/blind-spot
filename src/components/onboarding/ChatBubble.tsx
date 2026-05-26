interface ChatBubbleProps {
  role: 'tutor' | 'user'
  content: string
  isStreaming?: boolean
}

export default function ChatBubble({ role, content, isStreaming }: ChatBubbleProps) {
  const isTutor = role === 'tutor'
  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isTutor
            ? 'bg-transparent text-[#F0F0F5]'
            : 'bg-[#1a1f2e] text-[#F0F0F5]'
        }`}
      >
        <p
          className={`${isTutor ? 'text-base leading-relaxed' : 'text-sm'} whitespace-pre-wrap`}
          style={{ letterSpacing: isTutor ? '0.01em' : undefined }}
        >
          {content}
          {isStreaming && <span className="inline-block w-1 h-4 bg-[#F5A623] ml-1 animate-pulse" />}
        </p>
      </div>
    </div>
  )
}

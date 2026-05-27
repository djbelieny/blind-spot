'use client'
import React from 'react'

interface ChatBubbleProps {
  role: 'tutor' | 'user'
  content: string
  isStreaming?: boolean
}

function renderInline(text: string): React.ReactNode[] {
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g
  const nodes: React.ReactNode[] = []
  let last = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] != null) nodes.push(<strong key={m.index} className="font-semibold text-white">{m[1]}</strong>)
    else if (m[2] != null) nodes.push(<em key={m.index} className="italic">{m[2]}</em>)
    else if (m[3] != null) nodes.push(<code key={m.index} className="bg-[#1a1f2e] px-1.5 py-0.5 rounded text-[#F94716] text-[0.85em] font-mono">{m[3]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderMarkdown(content: string, isStreaming?: boolean): React.ReactNode {
  const blocks = content.split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        return (
          <p key={bi} className="mb-2 last:mb-0 leading-relaxed">
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        )
      })}
      {isStreaming && <span className="inline-block w-1 h-4 bg-[#F94716] ml-1 animate-pulse" />}
    </>
  )
}

export default function ChatBubble({ role, content, isStreaming }: ChatBubbleProps) {
  const isTutor = role === 'tutor'
  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isTutor ? 'bg-transparent text-[#F0F0F5]' : 'bg-[#1a1f2e] text-[#F0F0F5]'
        }`}
      >
        <div
          className={`${isTutor ? 'text-base' : 'text-sm'}`}
          style={{ letterSpacing: isTutor ? '0.01em' : undefined }}
        >
          {renderMarkdown(content, isStreaming)}
        </div>
      </div>
    </div>
  )
}

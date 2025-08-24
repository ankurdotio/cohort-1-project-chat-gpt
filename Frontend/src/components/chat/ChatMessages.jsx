import React, { useEffect, useRef } from 'react';
import './ChatMessages.css';


const ChatMessages = ({ messages, isSending }) => {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isSending]);
  return (
    <div className="messages" aria-live="polite">
      {messages.map((m,index) => {
        // Detect error message by content (could be improved with a dedicated error flag)
        const isError = m.type === 'ai' && (
          typeof m.content === 'string' && (
            m.content.toLowerCase().includes('error occurred') || m.content.toLowerCase().includes('connection lost')
          )
        );
        return (
          <div key={index} className={`msg msg-${m.type}${isError ? ' msg-error' : ''}`}>
            <div className="msg-role" aria-hidden="true">{m.type === 'user' ? 'You' : 'AI'}</div>
            <div className={`msg-bubble${isError ? ' error' : ''}`}>{isError ? <span>⚠️ {m.content}</span> : m.content}</div>
            {!isError && (
              <div className="msg-actions" role="group" aria-label="Message actions">
                <button type="button" aria-label="Copy message" onClick={() => navigator.clipboard.writeText(m.content)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                </button>
                {m.role === 'ai' && (
                  <>
                    <button type="button" aria-label="Like response">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 10v11" /><path d="M15 21H9a2 2 0 0 1-2-2v-9l5-7 1 1a2 2 0 0 1 .5 1.3V9h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2Z" /></svg>
                    </button>
                    <button type="button" aria-label="Dislike response">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 14V3" /><path d="M9 3h6a2 2 0 0 1 2 2v9l-5 7-1-1a2 2 0 0 1-.5-1.3V15H5a2 2 0 0 1-2-2l2-8a2 2 0 0 1 2-2Z" /></svg>
                    </button>
                    <button type="button" aria-label="Speak message" onClick={() => { try { const u = new SpeechSynthesisUtterance(m.content); speechSynthesis.speak(u);} catch { /* speech synthesis unsupported */ } }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 8v8" /><path d="M8 4v16" /><path d="M12 2v20" /><path d="M19 5c1.5 2 1.5 12 0 14" /><path d="M16 8c.8 1 1 7 0 8" /></svg>
                    </button>
                    <button type="button" aria-label="Regenerate" onClick={() => { /* placeholder for regenerate logic */ }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12A10 10 0 0 1 12 2c2.5 0 4.8 1 6.5 2.5L22 8" /><path d="M22 2v6h-6" /><path d="M22 12a10 10 0 0 1-10 10c-2.5 0-4.8-1-6.5-2.5L2 16" /><path d="M2 22v-6h6" /></svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {isSending && (
        <div className="msg msg-ai pending">
          <div className="msg-role" aria-hidden="true">AI</div>
          <div className="msg-bubble typing-dots" aria-label="AI is typing">
            <span/><span/><span/>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;

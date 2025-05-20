'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

interface Message {
  text: string;
  isUser: boolean;
  isError?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    const userMessage = input;
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add bot response to chat
        setMessages(prev => [...prev, { text: data.answer, isUser: false }]);
      } else {
        setMessages(prev => [...prev, { 
          text: data.error || 'Sorry, something went wrong. Please try again.',
          isUser: false,
          isError: true
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        text: 'Network error. Please check your connection and try again.',
        isUser: false,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-24 pt-4">
      <div className="z-10 w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-4 text-center">PDF Knowledge Assistant</h1>
        
        <div className="bg-gray-100 rounded-lg p-4 h-[60vh] overflow-auto mb-4">
          {messages.length === 0 ? (
            <div className="text-black text-center mt-24">
              Ask me anything about the documents!
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index}
                className={`mb-3 p-3 rounded-lg text-black  ${
                  message.isUser 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : message.isError 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-white border border-gray-200'
                } max-w-[80%] ${message.isUser ? 'ml-auto' : 'mr-auto'}`}
              >
                {message.text}
              </div>
            ))
          )}
          {isLoading && (
            <div className="bg-white border border-gray-200 p-3 rounded-lg max-w-[80%] mr-auto mb-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your PDFs..."
            className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`bg-blue-500 text-white p-2 rounded ${
              isLoading || input.trim() === '' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
            disabled={isLoading || input.trim() === ''}
          >
            Send
          </button>
        </form>

        
      </div>
      <div className="text-center">
          <Link href="/upload" className="text-blue-500 hover:underline">
            Upload PDFs
          </Link>
        </div>
    </main>
  );
}
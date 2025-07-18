import { useState, useRef, useEffect } from 'react';
import { cn } from '../client/cn';
import { generateChatbotResponse } from 'wasp/client/operations';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function DemoAppPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantReply = (await generateChatbotResponse({
        messages: [...messages, userMsg],
      })) as string;

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: 'assistant', content: assistantReply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Üzgünüm, cevap alınamadı. Lütfen tekrar deneyin.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='max-w-3xl mx-auto py-12 px-4 space-y-6'>
      <h2 className='text-center text-4xl font-bold'>
        <span className='text-yellow-500'>AI</span> Chatbot
      </h2>

      <div className='h-[60vh] overflow-y-auto rounded-lg border border-gray-200 p-4 bg-white/80 space-y-4 shadow-sm'>
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cn(
              'whitespace-pre-wrap rounded-lg px-4 py-2 text-sm',
              m.role === 'user'
                ? 'bg-purple-100 self-end'
                : 'bg-yellow-50 self-start border border-yellow-200'
            )}
          >
            {m.content}
          </div>
        ))}
        {isLoading && <div className='italic text-gray-500'>...yazıyor</div>}
        <div ref={bottomRef} />
      </div>

      <div className='flex gap-2'>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder='Sorunuzu yazın...'
          className='flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none'
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className='rounded-md bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600 disabled:opacity-50'
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
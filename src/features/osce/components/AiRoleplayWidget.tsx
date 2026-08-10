import { useState, useRef, useEffect } from 'react';
import { StationConfig } from '../schemas/stationConfig';
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client';
import { Send, Mic } from 'lucide-react';

interface Props {
  config: StationConfig;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export function AiRoleplayWidget({ config }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Halo. (Pasien masuk ke ruangan)' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('simulate-osce', {
        body: { config, history: messages, newMessage: userMessage.content }
      });

      if (error) {
        // Try to extract the actual error message from the response body
        let errorMessage = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const body = await error.context.json();
            errorMessage = body?.message || body?.error || errorMessage;
          }
        } catch { /* ignore parsing errors */ }
        throw new Error(errorMessage);
      }
      if (!data?.text) {
        throw new Error("AI tidak mengembalikan respons teks.");
      }
      setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
    } catch (err) {
      console.error("Simulate OSCE frontend error:", err);
      setMessages(prev => [...prev, { role: 'ai', content: `⚠️ Error: ${(err as Error).message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl m-4 shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          AI Patient Roleplay
        </h3>
        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">Text Mode</span>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
              <div className="text-[10px] uppercase font-bold opacity-70 mb-1">{msg.role === 'user' ? 'Kandidat (Anda)' : 'Pasien (AI)'}</div>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-500 rounded-lg p-3 text-sm italic rounded-tl-none">Pasien sedang membalas...</div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ketik percakapan Anda di sini..."
          className="flex-grow p-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button 
          className="p-3 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-xl transition-colors cursor-not-allowed" 
          title="Fitur Suara (Segera Hadir)"
        >
          <Mic size={18} />
        </button>
        <button 
          onClick={handleSend} 
          disabled={isLoading || !input.trim()} 
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center min-w-[3rem]"
        >
          <Send size={18} className={isLoading ? 'opacity-50' : ''} />
        </button>
      </div>
    </div>
  );
}

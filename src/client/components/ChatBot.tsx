// src/pages/components/ChatBot.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "wasp/client/auth";
import { spendCredit } from "wasp/client/operations";

/* ---------- ChatMessageFormatted ---------- */
type Block =
  | { type: "header"; content: string }
  | { type: "text"; content: string };

const ChatMessageFormatted: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;

  // Başlıkları böl
  const regex = /###([^\n]*)\n?/g;
  const blocks: Block[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    blocks.push({ type: "header", content: match[1].trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    blocks.push({ type: "text", content: text.slice(lastIndex) });
  }

  // **bold** parser
  const parseBold = (input: string) => {
    const elements: Array<string | React.ReactElement> = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let last = 0;
    let bMatch: RegExpExecArray | null;
    let i = 0;

    while ((bMatch = boldRegex.exec(input)) !== null) {
      if (bMatch.index > last) elements.push(input.slice(last, bMatch.index));
      elements.push(<strong key={`b-${i}`}>{bMatch[1]}</strong>);
      last = boldRegex.lastIndex;
      i++;
    }
    if (last < input.length) elements.push(input.slice(last));

    const parsed: React.ReactNode[] = [];
    elements.forEach((el, idx) => {
      if (typeof el === "string") {
        const lines = el.split("\n");
        lines.forEach((line, j) => {
          parsed.push(line);
          if (j < lines.length - 1) parsed.push(<br key={`br-${idx}-${j}`} />);
        });
      } else {
        parsed.push(el);
      }
    });
    return parsed;
  };

  return (
    <>
      {blocks.map((block, idx) =>
        block.type === "header" ? (
          <div key={`hdr-${idx}`} className="font-bold text-[17px] my-2">
            {parseBold(block.content)}
          </div>
        ) : (
          <span key={`txt-${idx}`}>{parseBold(block.content ?? "")}</span>
        )
      )}
    </>
  );
};
/* ---------- /ChatMessageFormatted ---------- */

/* ---------- ChatBot ---------- */
type ChatMessage = {
  sender: "user" | "bot";
  text: string;
  quickQuestions?: string[];
};

type ChatPair = [string, string];
type ChatHistory = ChatPair[];

type QAResponseSuccess = {
  success: true;
  result: { chat_history: ChatHistory };
};

type QAResponseError = {
  success: false;
  error?: string;
};

type ChatBotProps = {
  fileHash: string | null;
};

const ChatBot: React.FC<ChatBotProps> = ({ fileHash }) => {
  const { data: user } = useAuth();
  const [localCredits, setLocalCredits] = useState<number>(0);

  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Sadece liste içinde kaydırma için alt anchor
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalCredits(Number(user?.credits ?? 0));
  }, [user?.credits]);

  // MUI mantığı: her mesajda sadece içerik scroll'u, pencere değil
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (!fileHash) {
      setMessages([]);
      setChatHistory([]);
    } else {
      setMessages([
        {
          sender: "bot",
          text: `Hoş geldiniz! Bu dosya için sorularınızı sorabilirsiniz.

Aşağıda sık sorulan sorulara tıklayabilirsiniz:`,
          quickQuestions: [
            "Sözleşmenin konusu nedir ?",
            "Sözleşmenin tarafları kimlerdir ?",
            "Fesih koşulları nelerdir ?",
            "Cezai şartlar var mı ?",
          ],
        },
      ]);
      setChatHistory([]);
    }
  }, [fileHash]);

  const handleSendMessage = async (customQuestion?: string) => {
    const trimmed = (customQuestion ?? inputValue).trim();
    if (!trimmed || !fileHash) return;

    // Summarizer mantığı: her sorudan önce kredi harca
    if (localCredits <= 0) {
      alert("Krediniz bitti. Lütfen paket satın alın veya kredilerinizi yenileyin");
      return;
    }
    try {
      await spendCredit();
      setLocalCredits((c) => Math.max(0, (c ?? 0) - 1));
    } catch (e: any) {
      if (e?.status === 401) {
        alert("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }
      if (e?.status === 402) {
        setLocalCredits(0);
        alert("Krediniz bitti. Lütfen paket satın alın veya kredilerinizi yenileyin");
        return;
      }
      console.error("Kredi hatası:", e);
      alert("Kredi kontrolü sırasında hata oluştu.");
      return;
    }

    const newUserMessage: ChatMessage = { sender: "user", text: trimmed };
    setInputValue("");
    setLoading(true);
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const payload = { question: trimmed, hash: fileHash, chat_history: chatHistory };

      const response = await fetch("/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: QAResponseSuccess | QAResponseError = await response.json();

      if ("success" in data && data.success) {
        const formattedMessages: ChatMessage[] = data.result.chat_history
          .map<ChatMessage[]>(([q, a]) => [
            { sender: "user", text: q },
            { sender: "bot", text: a },
          ])
          .flat();

        setChatHistory(data.result.chat_history);
        setMessages((prev) => {
          const welcome = prev.find((m) => m.text.includes("Hoş geldiniz"));
          return welcome ? [welcome, ...formattedMessages] : formattedMessages;
        });
      } else {
        console.error("Servis hata:", (data as QAResponseError).error ?? "Bilinmeyen hata");
      }
    } catch (err) {
      console.error("Sunucu hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Mesajlar: sadece burada scroll */}
      <div className="flex-1 overflow-y-auto py-2 px-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={[
              "m-1 px-3 py-2 rounded-2xl max-w-[70%] break-words",
              msg.sender === "user"
                ? "self-end bg-indigo-600 text-white"
                : "self-start bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-100",
            ].join(" ")}
          >
            <ChatMessageFormatted text={msg.text} />

            {/* quickQuestions varsa göster */}
            {msg.quickQuestions && (
              <div className="mt-2 flex flex-col gap-2">
                {msg.quickQuestions.map((question, i) => (
                  <button
                    key={i}
                    className="text-left text-sm rounded-lg border border-indigo-500
                               text-indigo-600 dark:text-indigo-400 px-3 py-2
                               bg-indigo-50/40 dark:bg-transparent
                               hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                    onClick={() => void handleSendMessage(question)}
                    disabled={loading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="m-1 px-3 py-2 rounded-2xl self-start bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-100 inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span>Yazıyor...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Giriş alanı: alta sabit, üstteki içerik taşarsa yukarısı scroll olur */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendMessage();
        }}
        className="border-t border-slate-200 dark:border-slate-700 p-3"
      >
        <div className="relative">
          <input
            type="text"
            placeholder="Mesajınızı yazın..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700
                       bg-white/90 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100
                       pl-4 pr-12 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            aria-label="Gönder"
            disabled={!inputValue.trim() || !fileHash || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg
                       text-indigo-600 dark:text-indigo-400
                       hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                       disabled:opacity-50 disabled:pointer-events-none
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 0 24 24" width="22" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBot;

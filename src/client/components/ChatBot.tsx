// src/components/ChatBot.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";

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
    blocks.push({
      type: "header",
      content: match[1].trim(),
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    blocks.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // **bold** parser
  const parseBold = (input: string) => {
    const elements: Array<string | React.ReactElement> = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let last = 0;
    let bMatch: RegExpExecArray | null;
    let i = 0;

    while ((bMatch = boldRegex.exec(input)) !== null) {
      if (bMatch.index > last) {
        elements.push(input.slice(last, bMatch.index));
      }
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
          <div
            key={`hdr-${idx}`}
            style={{
              fontWeight: "bold",
              fontSize: 17,
              margin: "10px 0 2px 0",
            }}
          >
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
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!fileHash) {
      // Dosya kaldırıldığında her şey temizlenir
      setMessages([]);
      setChatHistory([]);
    } else {
      // Default sorular
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

    const newUserMessage: ChatMessage = { sender: "user", text: trimmed };
    setInputValue("");
    setLoading(true);

    // Kullanıcının mesajı anında ekranda gösterilsin
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const payload = {
        question: trimmed,
        hash: fileHash,
        chat_history: chatHistory, // ilkinde [], sonra backend’den gelenle güncellenir
      };

      // Relative endpoint: proxy/backend yönetsin
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
          const welcome = prev.find((m) =>
            m.text.includes("Hoş geldiniz")
          );
          return welcome ? [welcome, ...formattedMessages] : formattedMessages;
        });
      } else {
        // eslint-disable-next-line no-console
        console.error("Servis hata:", (data as QAResponseError).error ?? "Bilinmeyen hata");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Sunucu hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        width: "100%",
        height: "100%",
        flex: "1",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Mesajları içeren kaydırılabilir alan */}
      <CardContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          py: 2,
        }}
      >
        {messages.map((msg, index) => (
          <Box
            key={index}
            sx={{
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              bgcolor: msg.sender === "user" ? "#3f51b5" : "grey.800",
              color: "text.primary",
              px: 2,
              py: 1,
              m: 1,
              borderRadius: 2,
              maxWidth: "70%",
              wordBreak: "break-word",
            }}
          >
            <ChatMessageFormatted text={msg.text} />
            {/* quickQuestions varsa göster */}
            {msg.quickQuestions && (
              <Box
                sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}
              >
                {msg.quickQuestions.map((question, i) => (
                  <Button
                    key={i}
                    size="small"
                    variant="outlined"
                    sx={{
                      color: "primary.main",
                      borderColor: "primary.main",
                      textTransform: "none",
                      justifyContent: "flex-start",
                      background: "rgba(0,188,212,0.04)",
                      "&:hover": {
                        background: "rgba(0,188,212,0.15)",
                      },
                    }}
                    onClick={() => {
                      void handleSendMessage(question);
                    }}
                    disabled={loading}
                  >
                    {question}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box
            sx={{
              alignSelf: "flex-start",
              bgcolor: "grey.800",
              color: "text.primary",
              px: 2,
              py: 1,
              m: 1,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
            <span>Yazıyor...</span>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Mesaj yazma alanı ve Gönder butonu */}
      <CardActions
        sx={{
          p: 2,
          pt: 1,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ position: "relative", width: "100%" }}>
          <TextField
            variant="outlined"
            placeholder="Mesajınızı yazın..."
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            sx={{
              "& input": {
                pr: 5.5,
              },
            }}
          />
          <Box
            onClick={() => void handleSendMessage()}
            sx={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Gönder"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="22"
              viewBox="0 0 24 24"
              width="22"
              fill="currentColor"
            >
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </Box>
        </Box>
      </CardActions>
    </Card>
  );
};

export default ChatBot;

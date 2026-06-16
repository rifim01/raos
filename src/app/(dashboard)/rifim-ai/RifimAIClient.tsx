"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AiConversationRow, AIMessage } from "@/lib/ai-engine";

interface Props {
  userName: string;
  userRole: string;
  userRoleLevel: number;
  airportCode: string | null | undefined;
  initialHistory: AiConversationRow[];
}

// Quick prompts per role
const QUICK_PROMPTS: Record<string, string[]> = {
  executive: [
    "Bandara mana yang performanya paling baik bulan ini?",
    "Berapa total pendapatan nasional bulan ini?",
    "Bandara mana yang perlu tambahan driver?",
    "Analisis produktivitas driver secara nasional",
  ],
  coordinator: [
    "Berapa driver aktif hari ini?",
    "Siapa staff yang belum absen hari ini?",
    "Status antrian pickup saat ini?",
    "Rekap payroll bulan ini bandara saya",
  ],
  staff: [
    "Bagaimana SOP check-in driver?",
    "Apa prosedur alur pickup penumpang?",
    "Aturan antrian driver di bandara?",
    "Cara mengajukan kasbon?",
  ],
};

function getQuickPrompts(roleLevel: number) {
  if (roleLevel >= 4) return QUICK_PROMPTS.executive;
  if (roleLevel === 3) return QUICK_PROMPTS.coordinator;
  return QUICK_PROMPTS.staff;
}

// Simple text formatter: bold **text** and newlines
function formatText(text: string) {
  return text
    .split("\n")
    .map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return (
        <span key={i}>
          {parts}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
}

function groupHistoryByDate(history: AiConversationRow[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; items: AiConversationRow[] }[] = [];
  const map = new Map<string, AiConversationRow[]>();

  for (const item of history) {
    const d = new Date(item.created_at);
    let label = d.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
    if (d.toDateString() === today) label = "Hari Ini";
    else if (d.toDateString() === yesterday) label = "Kemarin";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }

  for (const [label, items] of map) {
    groups.push({ label, items });
  }
  return groups;
}

export default function RifimAIClient({
  userName,
  userRole,
  userRoleLevel,
  airportCode,
  initialHistory,
}: Props) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [history, setHistory] = useState<AiConversationRow[]>(initialHistory);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyGroups = groupHistoryByDate(history);
  const quickPrompts = getQuickPrompts(userRoleLevel);
  const isNewChat = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const question = text.trim();
      setInputText("");
      setIsLoading(true);
      setStreamingText("");

      const newMessages: AIMessage[] = [...messages, { role: "user", content: question }];
      setMessages(newMessages);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history: messages.slice(-8) }),
        });

        if (!res.ok || !res.body) {
          const err = await res.text();
          setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Error: ${err}` }]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamingText(accumulated);
        }

        const finalAnswer = accumulated;
        setStreamingText("");
        setMessages((prev) => [...prev, { role: "assistant", content: finalAnswer }]);

        // Optimistically add to history sidebar
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            question,
            answer: finalAnswer,
            created_at: new Date().toISOString(),
            model: "gpt-4o-mini",
          },
          ...prev,
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Terjadi kesalahan jaringan. Coba lagi." },
        ]);
      } finally {
        setIsLoading(false);
        setStreamingText("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [messages, isLoading]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  function loadHistoryItem(item: AiConversationRow) {
    setMessages([
      { role: "user", content: item.question },
      { role: "assistant", content: item.answer },
    ]);
    setSidebarOpen(false);
  }

  const airportLabel = airportCode ?? (userRoleLevel >= 4 ? "Semua Bandara" : "");

  return (
    <div className="flex h-full overflow-hidden rounded-2xl" style={{ background: "var(--bg-primary)", minHeight: "calc(100vh - 120px)" }}>
      {/* History Sidebar */}
      <aside
        className={`
          flex-shrink-0 border-r flex flex-col transition-all duration-300 overflow-hidden
          ${sidebarOpen ? "w-72" : "w-0 lg:w-64"}
        `}
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Riwayat</p>
          <button
            onClick={() => { setMessages([]); setStreamingText(""); setSidebarOpen(false); }}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: "#1565C0", color: "#fff" }}
          >
            + Baru
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {historyGroups.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Belum ada riwayat</p>
          ) : (
            historyGroups.map((group) => (
              <div key={group.label}>
                <p className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left px-4 py-2 hover:bg-black/5 transition-colors group"
                  >
                    <p
                      className="text-xs font-medium truncate leading-snug"
                      style={{ color: "var(--text-primary)" }}
                      title={item.question}
                    >
                      {item.question}
                    </p>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {item.answer.slice(0, 60)}...
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" style={{ color: "var(--text-muted)" }}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* AI Avatar */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #1565C0, #0D47A1)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>RIFIM AI</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {userRole} · {airportLabel}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {isNewChat && !isLoading ? (
            /* Welcome / Empty State */
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center py-12">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                style={{ background: "linear-gradient(135deg, #1565C0, #1976D2)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
                Selamat datang, {userName.split(" ")[0]}!
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                Saya RIFIM AI — asisten cerdas untuk operasional bandara Anda.
                <br />Tanyakan tentang driver, antrian, payroll, keuangan, atau SOP perusahaan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span className="text-[#1565C0] mr-2">✦</span>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
                  {msg.role === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ background: "linear-gradient(135deg, #1565C0, #0D47A1)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-tr-sm text-white"
                        : "rounded-tl-sm"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "#1565C0" }
                        : { background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }
                    }
                  >
                    {msg.role === "assistant" ? formatText(msg.content) : msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div
                      className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 text-xs font-black text-white"
                      style={{ background: "#374151" }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming text */}
              {(isLoading || streamingText) && (
                <div className="flex justify-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: "linear-gradient(135deg, #1565C0, #0D47A1)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div
                    className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    {streamingText ? (
                      <>
                        {formatText(streamingText)}
                        <span className="inline-block w-0.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse align-text-bottom" />
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 py-0.5">
                        {[0, 1, 2].map((n) => (
                          <span
                            key={n}
                            className="w-2 h-2 rounded-full bg-blue-300 animate-bounce"
                            style={{ animationDelay: `${n * 0.15}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          className="px-4 py-3 border-t flex-shrink-0"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div
            className="flex items-end gap-3 rounded-2xl border px-4 py-3 transition-shadow focus-within:shadow-md"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tanya RIFIM AI... (Enter untuk kirim, Shift+Enter untuk baris baru)"
              disabled={isLoading}
              className="flex-1 resize-none text-sm bg-transparent outline-none min-h-[24px]"
              style={{ color: "var(--text-primary)", lineHeight: "1.5" }}
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: inputText.trim() && !isLoading ? "#1565C0" : "var(--border-subtle)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={inputText.trim() && !isLoading ? "white" : "var(--text-muted)"} strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
            RIFIM AI dapat membuat kesalahan. Verifikasi data penting sebelum digunakan.
          </p>
        </div>
      </div>
    </div>
  );
}

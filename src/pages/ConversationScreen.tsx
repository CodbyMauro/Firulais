import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToConversation,
  fetchConversations,
  type Conversation,
  type Message,
} from "../lib/chatService";
import { fetchProfile, type Profile } from "../lib/profileService";
import UserAvatar from "../components/UserAvatar";
import { supabase } from "../lib/supabase";
import { chatOpenedFromMessagesList } from "../lib/chatNavigation";


export default function ConversationScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    fetchConversations(user.id).then((list) => {
      const conv = list.find((c) => c.id === id) ?? null;
      setConversation(conv);
      if (conv) {
        const otherId = conv.initiator_id === user.id ? conv.reporter_id : conv.initiator_id;
        fetchProfile(otherId).then(setOtherProfile);
      }
    });
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;

    fetchMessages(id, user.id).then((msgs) => {
      setMessages(msgs);
      markMessagesAsRead(id, user.id);
    });

    const channel = subscribeToConversation(
      id,
      (newMsg) => {
        setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.sender_id !== user.id) markMessagesAsRead(id, user.id);
      },
      (updated) => {
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
      },
      (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
    );

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !id || !user || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const newMsg = await sendMessage(id, user.id, content);
      setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    } finally {
      setSending(false);
    }
  };


  const otherName = conversation
    ? user?.id === conversation.initiator_id ? conversation.reporter_name : conversation.initiator_name
    : "Chat";

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const ReadTick = ({ msg }: { msg: Message }) => {
    if (msg.sender_id !== user?.id) return null;
    return msg.read_at
      ? <span className="text-[#2b9dee] text-[10px] leading-none select-none">✓✓</span>
      : <span className="text-white/60 text-[10px] leading-none select-none">✓</span>;
  };

  return (
    <div className="conversation-route w-full max-w-[430px] lg:max-w-none mx-auto bg-white dark:bg-slate-800 font-display text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
        <button
          type="button"
          onClick={() => {
            if (chatOpenedFromMessagesList(location.state)) navigate(-1);
            else navigate("/chat", { replace: true });
          }}
          className="flex size-9 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <UserAvatar
          name={otherName}
          avatarData={otherProfile?.avatar_data}
          avatarUrl={otherProfile?.avatar_url}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{otherName}</p>
          {conversation?.pet_name && (
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
              <span className="material-symbols-outlined text-[11px] align-middle">pets</span>{" "}
              {conversation.pet_name}
            </p>
          )}
        </div>
      </div>

      {/* Mensajes: min-h-0 para que sólo esta zona use scroll (flex). */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4 flex flex-col gap-2 bg-[#f6f7f8] dark:bg-slate-900">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-slate-400 dark:text-slate-500 py-16">
            <span className="material-symbols-outlined text-[40px]">chat_bubble</span>
            <p className="text-sm font-medium">Iniciá la conversación</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? "bg-[#2b9dee] text-white rounded-tr-sm"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700"
                  }`}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatTime(msg.created_at)}
                  </span>
                  <ReadTick msg={msg} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700"
      >
        <input
          className="flex-1 h-11 rounded-full bg-slate-100 dark:bg-slate-700 px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          placeholder="Escribí un mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex size-11 items-center justify-center bg-[#2b9dee] text-white rounded-full disabled:opacity-50 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>

    </div>
  );
}

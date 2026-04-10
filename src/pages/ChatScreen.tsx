import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import {
  fetchConversations,
  fetchUnreadCounts,
  deleteConversation,
  type Conversation,
} from "../lib/chatService";
import { fetchProfilesByIds, type Profile } from "../lib/profileService";
import UserAvatar from "../components/UserAvatar";

// Swipe para borrar usando touch-action:pan-y (el browser maneja scroll vertical, JS maneja horizontal)
function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const THRESHOLD = 80;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = startX.current - e.touches[0].clientX;
    const next = Math.max(0, Math.min(startOffset.current + dx, THRESHOLD + 16));
    setOffset(next);
  };

  const onTouchEnd = () => {
    setOffset((prev) => (prev >= THRESHOLD / 2 ? THRESHOLD : 0));
  };

  const close = () => setOffset(0);

  return (
    <div className="relative overflow-hidden" onClick={offset > 0 ? close : undefined}>
      {/* Botón rojo detrás */}
      <div
        className="absolute right-0 inset-y-0 w-20 bg-red-500 flex items-center justify-center"
        style={{ opacity: Math.min(offset / THRESHOLD, 1) }}
      >
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex flex-col items-center gap-0.5">
          <span className="material-symbols-outlined text-white text-[22px]">delete</span>
          <span className="text-white text-[10px] font-semibold">Borrar</span>
        </button>
      </div>
      {/* Contenido deslizable — touch-action:pan-y le dice al browser que solo maneje scroll vertical */}
      <div
        style={{
          transform: `translateX(-${offset}px)`,
          transition: offset === 0 || offset === THRESHOLD ? "transform 0.2s ease" : "none",
          touchAction: "pan-y",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-[26px]">chat_bubble</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Borrar esta conversación?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Tu chat con <span className="font-semibold text-slate-700 dark:text-slate-300">{name}</span> va a desaparecer. No se puede recuperar.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-red-500 text-white text-sm font-bold"
          >
            Sí, borrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id).then(async (list) => {
      setConversations(list);
      const [counts, profs] = await Promise.all([
        fetchUnreadCounts(user.id, list.map((c) => c.id)),
        fetchProfilesByIds(list.map((c) => c.initiator_id === user.id ? c.reporter_id : c.initiator_id)),
      ]);
      setUnread(counts);
      setProfiles(profs);
    }).finally(() => setIsLoading(false));
  }, [user]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setConversations((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    setConfirmDelete(null);
    await deleteConversation(confirmDelete.id, user!.id);
  };

  const otherName = (conv: Conversation) =>
    user?.id === conv.initiator_id ? conv.reporter_name : conv.initiator_name;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "ayer";
    return `${diffDays}d`;
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full max-w-[430px] lg:max-w-none mx-auto flex-col bg-[#f6f7f8] dark:bg-slate-900 font-display text-slate-900 dark:text-white pb-24 lg:pb-0">
      <div className="flex items-center px-4 py-4 pb-3 justify-between bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
        <h2 className="text-lg font-bold">Mensajes</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-[#2b9dee]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-24 gap-3 text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined text-[52px]">chat_bubble</span>
          <p className="text-sm font-semibold">Sin conversaciones aún</p>
          <p className="text-xs text-center px-10 leading-relaxed">
            Cuando contactes al dueño de una mascota, la conversación aparecerá acá.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
          {conversations.map((conv) => {
            const name = otherName(conv);
            const unreadCount = unread[conv.id] ?? 0;
            const hasUnread = unreadCount > 0;

            const otherId = conv.initiator_id === user?.id ? conv.reporter_id : conv.initiator_id;
            const otherProfile = profiles[otherId];

            return (
              <SwipeableRow key={conv.id} onDelete={() => setConfirmDelete(conv)}>
                <button
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left w-full bg-white dark:bg-slate-800"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={name}
                      avatarData={otherProfile?.avatar_data}
                      avatarUrl={otherProfile?.avatar_url}
                      size={48}
                    />
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#2b9dee] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${hasUnread ? "font-bold" : "font-semibold"}`}>{name}</p>
                      <span className={`text-[10px] shrink-0 ${hasUnread ? "text-[#2b9dee] font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    {conv.pet_name && (
                      <p className="text-xs text-[#2b9dee] font-semibold truncate">
                        <span className="material-symbols-outlined text-[11px] align-middle">pets</span>{" "}
                        {conv.pet_name}
                      </p>
                    )}
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-slate-700 dark:text-slate-300 font-semibold" : "text-slate-400 dark:text-slate-500"}`}>
                      {conv.last_message ?? "Iniciá la conversación"}
                    </p>
                  </div>
                </button>
              </SwipeableRow>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          name={otherName(confirmDelete)}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

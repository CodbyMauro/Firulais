import { useState, useEffect, useRef, useCallback } from "react";
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

const LONG_PRESS_MS = 520;
const MOVE_CANCEL_PX = 12;

function ConfirmDeleteModal({
  title,
  body,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overscroll-none"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-[26px]">delete</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
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

type ChatRowProps = {
  conv: Conversation;
  name: string;
  hasUnread: boolean;
  unreadCount: number;
  otherProfile: Profile | undefined;
  lastPreview: string;
  timeLabel: string;
  selectionMode: boolean;
  selected: boolean;
  onEnterSelection: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onOpenChat: () => void;
};

function ChatRow({
  conv,
  name,
  hasUnread,
  unreadCount,
  otherProfile,
  lastPreview,
  timeLabel,
  selectionMode,
  selected,
  onEnterSelection,
  onToggleSelection,
  onOpenChat,
}: ChatRowProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const longPressConsumedClick = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    longPressConsumedClick.current = false;
    originRef.current = { x: e.clientX, y: e.clientY };
    if (selectionMode) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      longPressConsumedClick.current = true;
      onEnterSelection(conv.id);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!timerRef.current) return;
    const dx = Math.abs(e.clientX - originRef.current.x);
    const dy = Math.abs(e.clientY - originRef.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearTimer();
  };

  const onPointerUp = () => {
    clearTimer();
  };

  const onClick = () => {
    if (longPressConsumedClick.current) {
      longPressConsumedClick.current = false;
      return;
    }
    if (selectionMode) onToggleSelection(conv.id);
    else onOpenChat();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`grid w-full cursor-pointer select-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-b-0 dark:border-slate-700/50 ${
        selected ? "bg-[#2b9dee]/10 dark:bg-[#2b9dee]/15" : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/30"
      }`}
    >
      {/* Avatar + tilde de selección (WPP) esquina inferior derecha */}
      <div className="relative shrink-0 justify-self-start self-center">
        <UserAvatar
          name={name}
          avatarData={otherProfile?.avatar_data}
          avatarUrl={otherProfile?.avatar_url}
          size={48}
        />
        {hasUnread && !selectionMode && (
          <span className="absolute -right-0.5 -top-0.5 z-[1] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#2b9dee] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {selectionMode && selected && (
          <div
            className="pointer-events-none absolute -bottom-0.5 -right-0.5 z-[2] flex size-[22px] items-center justify-center rounded-full border-[2.5px] border-white bg-[#2b9dee] shadow-md dark:border-slate-800"
            aria-hidden
          >
            <span className="material-symbols-outlined text-[15px] leading-none text-white" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
              check
            </span>
          </div>
        )}
      </div>
      {/* Textos: grid alinea este bloque al centro vertical de la fila */}
      <div className="flex min-w-0 flex-col justify-center space-y-2 py-0.5">
        <p
          className={`min-w-0 truncate text-sm leading-tight ${hasUnread && !selectionMode ? "font-bold" : "font-semibold"}`}
        >
          {name}
        </p>
        {conv.pet_name && (
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="material-symbols-outlined flex size-5 shrink-0 items-center justify-center text-[18px] leading-none text-[#2b9dee]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              pets
            </span>
            <span className="flex min-h-5 min-w-0 flex-1 items-center text-xs font-semibold leading-none text-[#2b9dee]">
              <span className="min-w-0 truncate">{conv.pet_name}</span>
            </span>
          </div>
        )}
        <p
          className={`min-w-0 truncate text-xs leading-tight ${
            hasUnread && !selectionMode ? "font-semibold text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {lastPreview}
        </p>
      </div>
      <div className="min-w-[4.25rem] max-w-[5.5rem] justify-self-end self-center text-right">
        <span
          className={`inline-block text-[10px] leading-tight tabular-nums ${
            hasUnread && !selectionMode ? "font-bold text-[#2b9dee]" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {timeLabel}
        </span>
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id)
      .then(async (list) => {
        setConversations(list);
        const [counts, profs] = await Promise.all([
          fetchUnreadCounts(
            user.id,
            list.map((c) => c.id),
          ),
          fetchProfilesByIds(list.map((c) => (c.initiator_id === user.id ? c.reporter_id : c.initiator_id))),
        ]);
        setUnread(counts);
        setProfiles(profs);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const enterSelectionWith = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Si no queda ninguno marcado, volver a la vista normal (como fuera de modo selección). */
  useEffect(() => {
    if (selectionMode && selectedIds.size === 0) exitSelectionMode();
  }, [selectionMode, selectedIds.size, exitSelectionMode]);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmIds?.length || !user) return;
    const ids = deleteConfirmIds;
    setDeleteConfirmIds(null);
    exitSelectionMode();

    setConversations((prev) => prev.filter((c) => !ids.includes(c.id)));
    setUnread((u) => {
      const next = { ...u };
      for (const id of ids) delete next[id];
      return next;
    });

    try {
      await Promise.all(ids.map((id) => deleteConversation(id, user.id)));
    } catch {
      const list = await fetchConversations(user.id);
      setConversations(list);
      const counts = await fetchUnreadCounts(
        user.id,
        list.map((c) => c.id),
      );
      setUnread(counts);
    }
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

  const nSelected = selectedIds.size;
  const deleteModalTitle =
    deleteConfirmIds && deleteConfirmIds.length > 1
      ? `¿Eliminar ${deleteConfirmIds.length} conversaciones?`
      : "¿Eliminar esta conversación?";
  const deleteModalBody =
    deleteConfirmIds && deleteConfirmIds.length > 1
      ? "Van a desaparecer de tu lista. No se pueden recuperar."
      : (() => {
          const c = conversations.find((x) => x.id === deleteConfirmIds?.[0]);
          const nm = c ? otherName(c) : "";
          return `Tu chat con ${nm} va a desaparecer. No se puede recuperar.`;
        })();

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-[#f6f7f8] pb-mobile-tab font-display text-slate-900 dark:bg-slate-900 dark:text-white lg:max-w-none lg:pb-0">
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        {selectionMode ? (
          <>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200"
              aria-label="Cancelar selección"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <h2 className="min-w-0 flex-1 truncate text-center text-base font-bold">
              {nSelected === 0
                ? "Seleccioná chats"
                : nSelected === 1
                  ? "1 seleccionado"
                  : `${nSelected} seleccionados`}
            </h2>
            {nSelected > 0 ? (
              <button
                type="button"
                onClick={() => setDeleteConfirmIds(Array.from(selectedIds))}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-300 dark:hover:bg-red-900/25 dark:hover:text-red-400"
                aria-label="Eliminar conversaciones seleccionadas"
              >
                <span className="material-symbols-outlined text-[26px]">delete</span>
              </button>
            ) : (
              <div className="size-10 shrink-0" aria-hidden />
            )}
          </>
        ) : (
          <div className="flex min-w-0 w-full flex-1 items-center">
            <button
              type="button"
              onClick={() => navigate("/home", { replace: true })}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200"
              aria-label="Volver al inicio"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back_ios</span>
            </button>
            <h2 className="min-w-0 flex-1 pr-10 text-center text-lg font-bold">Mensajes</h2>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-12">
          <svg className="h-8 w-8 animate-spin text-[#2b9dee]" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined text-[52px]">chat_bubble</span>
          <p className="text-sm font-semibold">Sin conversaciones aún</p>
          <p className="px-10 text-center text-xs leading-relaxed">
            Cuando contactes al dueño de una mascota, la conversación aparecerá acá.
          </p>
        </div>
      ) : (
        <div className="flex flex-col bg-white dark:bg-slate-800">
          {conversations.map((conv) => {
            const name = otherName(conv);
            const unreadCount = unread[conv.id] ?? 0;
            const hasUnread = unreadCount > 0;
            const otherId = conv.initiator_id === user?.id ? conv.reporter_id : conv.initiator_id;
            const otherProfile = profiles[otherId];

            return (
              <ChatRow
                key={conv.id}
                conv={conv}
                name={name}
                hasUnread={hasUnread}
                unreadCount={unreadCount}
                otherProfile={otherProfile}
                lastPreview={conv.last_message ?? "Iniciá la conversación"}
                timeLabel={formatTime(conv.last_message_at)}
                selectionMode={selectionMode}
                selected={selectedIds.has(conv.id)}
                onEnterSelection={enterSelectionWith}
                onToggleSelection={toggleSelection}
                onOpenChat={() => navigate(`/chat/${conv.id}`, { state: { fromChatList: true } })}
              />
            );
          })}
        </div>
      )}

      {deleteConfirmIds && (
        <ConfirmDeleteModal
          title={deleteModalTitle}
          body={deleteModalBody}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirmIds(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

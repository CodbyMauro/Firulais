/** `location.state` al abrir un chat desde la lista de mensajes (permite volver con -1 sin duplicar `/chat` en el historial). */
export type ChatConversationLocationState = { fromChatList?: boolean };

export function chatOpenedFromMessagesList(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as ChatConversationLocationState).fromChatList === true;
}

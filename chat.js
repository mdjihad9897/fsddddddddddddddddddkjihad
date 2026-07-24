'use strict';

import {
  auth,
  db,
  serverTimestamp
} from "./firebase-config.js";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  toast,
  State
} from "./core.js";

const ChatState = {

  chatId: null,

  unsubscribe: null,

  typingTimeout: null,

  typing: false

};

/* ==========================================================================
   CHAT
   ========================================================================== */

async function ensureChat() {

  if (!auth.currentUser) {

    throw new Error(
      "Please login first."
    );

  }

  if (ChatState.chatId) {

    return ChatState.chatId;

  }

  const snapshot = await getDocs(

    query(

      collection(db, "chats"),

      where(
        "uid",
        "==",
        auth.currentUser.uid
      ),

      limit(1)

    )

  );

  if (!snapshot.empty) {

    ChatState.chatId =
      snapshot.docs[0].id;

    return ChatState.chatId;

  }

  const ref = await addDoc(

    collection(db, "chats"),

    {

      uid:
        auth.currentUser.uid,

      customerName:
        auth.currentUser.displayName,

      customerPhoto:
        auth.currentUser.photoURL || "",

      online: true,

      unreadAdmin: 0,

      unreadUser: 0,

      lastMessage: "",

      lastMessageAt:
        serverTimestamp(),

      typingUser: false,

      typingAdmin: false,

      createdAt:
        serverTimestamp()

    }

  );

  ChatState.chatId = ref.id;

  return ChatState.chatId;

}

/* ==========================================================================
   SEND
   ========================================================================== */

export async function sendMessage(
  text
) {

  text = text.trim();

  if (!text) {

    return;

  }

  const chatId =
    await ensureChat();

  await addDoc(

    collection(
      db,
      "messages"
    ),

    {

      chatId,

      sender:
        auth.currentUser.uid,

      senderRole:
        "user",

      text,

      image: "",

      seen: false,

      createdAt:
        serverTimestamp()

    }

  );

  await updateDoc(

    doc(
      db,
      "chats",
      chatId
    ),

    {

      lastMessage: text,

      unreadAdmin: 1,

      typingUser: false,

      lastMessageAt:
        serverTimestamp()

    }

  );

  toast(
    "Message sent.",
    "success"
  );

}

/* ==========================================================================
   MESSAGE SUBSCRIPTION
   ========================================================================== */

export async function subscribeMessages(callback) {

  const chatId = await ensureChat();

  if (ChatState.unsubscribe) {

    ChatState.unsubscribe();

    ChatState.unsubscribe = null;

  }

  const q = query(
    collection(db, "messages"),
    where("chatId", "==", chatId),
    orderBy("createdAt", "asc")
  );

  ChatState.unsubscribe = onSnapshot(
    q,
    snapshot => {

      const messages =
        snapshot.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }));

      callback(messages);

      markMessagesRead(chatId);

    }
  );

  return ChatState.unsubscribe;

}

/* ==========================================================================
   READ STATUS
   ========================================================================== */

async function markMessagesRead(chatId) {

  const unread = await getDocs(
    query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      where("senderRole", "==", "admin"),
      where("seen", "==", false)
    )
  );

  for (const item of unread.docs) {

    await updateDoc(
      item.ref,
      {
        seen: true
      }
    );

  }

  await updateDoc(
    doc(db, "chats", chatId),
    {
      unreadUser: 0
    }
  );

}

/* ==========================================================================
   TYPING STATUS
   ========================================================================== */

export async function setTyping(status) {

  const chatId =
    await ensureChat();

  clearTimeout(
    ChatState.typingTimeout
  );

  await updateDoc(
    doc(db, "chats", chatId),
    {
      typingUser: status
    }
  );

  if (status) {

    ChatState.typingTimeout =
      setTimeout(async () => {

        await updateDoc(
          doc(db, "chats", chatId),
          {
            typingUser: false
          }
        );

      }, 2500);

  }

}

/* ==========================================================================
   ONLINE STATUS
   ========================================================================== */

export async function updateOnlineStatus(
  online
) {

  if (!auth.currentUser) {

    return;

  }

  const chatId =
    await ensureChat();

  await updateDoc(
    doc(db, "chats", chatId),
    {
      online,
      lastSeen: serverTimestamp()
    }
  );

}

/* ==========================================================================
   CHAT STATUS
   ========================================================================== */

export async function subscribeChatStatus(
  callback
) {

  const chatId =
    await ensureChat();

  return onSnapshot(
    doc(db, "chats", chatId),
    snapshot => {

      if (!snapshot.exists()) {

        return;

      }

      callback(snapshot.data());

    }
  );

}

/* ==========================================================================
   CLEANUP
   ========================================================================== */

export function destroyChat() {

  if (ChatState.unsubscribe) {

    ChatState.unsubscribe();

    ChatState.unsubscribe = null;

  }

  clearTimeout(
    ChatState.typingTimeout
  );

}


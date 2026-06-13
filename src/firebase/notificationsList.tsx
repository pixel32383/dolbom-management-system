import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type NotificationForm = {
  title: string;
  date: string;
  type: string;
  urgent: boolean;
  content: string;
  read?: boolean;
};

export type NotificationRow = NotificationForm & {
  id: string;
  firestoreId?: string;
};

export const NOTIFICATION_EMPTY: NotificationForm = {
  title: "",
  date: "",
  type: "공지",
  urgent: false,
  content: "",
};

const NOTIFICATIONS_COLLECTION = "notifications";

type NotificationDoc = Partial<NotificationForm>;

const toNotificationPayload = (notification: NotificationForm) => ({
  title: notification.title,
  date: notification.date,
  type: notification.type,
  urgent: notification.urgent,
  content: notification.content,
  read: Boolean(notification.read),
});

const mapNotificationDoc = (
  firestoreId: string,
  data: NotificationDoc,
): NotificationRow => ({
  id: firestoreId,
  firestoreId,
  title: data.title ?? "",
  date: data.date ?? "",
  type: data.type ?? "공지",
  urgent: Boolean(data.urgent),
  content: data.content ?? "",
  read: Boolean(data.read),
});

const sortNotifications = (notifications: NotificationRow[]) =>
  [...notifications].sort((a, b) => b.date.localeCompare(a.date));

export const fetchNotifications = async (): Promise<NotificationRow[]> => {
  const snapshot = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));

  if (snapshot.empty) return [];

  return sortNotifications(
    snapshot.docs
      .map((document) =>
        mapNotificationDoc(document.id, document.data() as NotificationDoc),
      )
      .filter((notification) => notification.title.trim().length > 0),
  );
};

export const addNotification = async (
  notification: NotificationForm,
): Promise<NotificationRow> => {
  const ref = await addDoc(
    collection(db, NOTIFICATIONS_COLLECTION),
    toNotificationPayload(notification),
  );
  return {
    id: ref.id,
    firestoreId: ref.id,
    ...notification,
    read: Boolean(notification.read),
  };
};

export const updateNotification = async (notification: NotificationRow) => {
  if (!notification.firestoreId) return;
  await updateDoc(
    doc(db, NOTIFICATIONS_COLLECTION, notification.firestoreId),
    toNotificationPayload(notification),
  );
};

export const markNotificationRead = async (notification: NotificationRow) => {
  if (!notification.firestoreId) return;
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notification.firestoreId), {
    read: true,
  });
};

export const markAllNotificationsRead = async (
  notifications: NotificationRow[],
) => {
  await Promise.all(
    notifications.map((notification) => markNotificationRead(notification)),
  );
};

export const deleteNotification = async (notification: NotificationRow) => {
  if (!notification.firestoreId) return;
  await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notification.firestoreId));
};

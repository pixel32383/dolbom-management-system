import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoAnfVThAjVpR-2caj7AYBTvEiCyzce3o",
  authDomain: "dolbom-management-system.firebaseapp.com",
  projectId: "dolbom-management-system",
  storageBucket: "dolbom-management-system.firebasestorage.app",
  messagingSenderId: "177844246964",
  appId: "1:177844246964:web:c73132c5d845e1e09bbae1",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

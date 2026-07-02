import { isFirebaseConfigured } from "../src/services/firebase.service.js";

if (!isFirebaseConfigured()) {
  console.error("Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env");
  process.exit(1);
}

console.log("Firebase Admin SDK is configured and ready to send FCM push notifications.");

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpsError = exports.onCall = exports.Timestamp = exports.FieldValue = exports.db = exports.adminAuth = void 0;
const https_1 = require("firebase-functions/v2/https");
Object.defineProperty(exports, "onCall", { enumerable: true, get: function () { return https_1.onCall; } });
Object.defineProperty(exports, "HttpsError", { enumerable: true, get: function () { return https_1.HttpsError; } });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const auth_1 = require("firebase-admin/auth");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
exports.db = db;
const adminAuth = (0, auth_1.getAuth)();
exports.adminAuth = adminAuth;
//# sourceMappingURL=index.js.map
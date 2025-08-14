import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, collection, query, orderBy,
  serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBjVxsqx7A7o2-2dTUsxV9qu88gu2ul7OA",
  authDomain: "saturday-group-run.firebaseapp.com",
  projectId: "saturday-group-run",
  storageBucket: "saturday-group-run.firebasestorage.app",
  messagingSenderId: "827712128113",
  appId: "1:827712128113:web:995131a096784daf8dc7d0",
  measurementId: "G-BFTS6MB3ND"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Helpers ---
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const runDateEl = $("runDate");
const nameEl = $("name");
const meetTimeEl = $("meetTime");
const list6 = $("list6");
const list7 = $("list7");
const dateText = $("dateText");

// --- Default to next Saturday ---
function nextSaturdayISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

runDateEl.value = nextSaturdayISO();
dateText.textContent = prettyDate(runDateEl.value);

// --- Real-time listener ---
let unsubscribe = null;
function watchDate(dateISO) {
  if (unsubscribe) unsubscribe();
  dateText.textContent = prettyDate(dateISO);
  list6.innerHTML = "";
  list7.innerHTML = "";

  const qAll = query(collection(db, "runs", dateISO, "signups"), orderBy("createdAt"));
  unsubscribe = onSnapshot(qAll, (snap) => {
    list6.innerHTML = "";
    list7.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.textContent = data.name;
      if (data.meetTime === "6:00 AM") list6.appendChild(li);
      else list7.appendChild(li);
    });
  });
}

watchDate(runDateEl.value);
runDateEl.addEventListener("change", () => {
  if (!runDateEl.value) return;
  watchDate(runDateEl.value);
});

// --- Prevent duplicate signups ---
function makeId(name, meetTime) {
  const slug = meetTime === "6:00 AM" ? "6am" : "7am";
  const norm = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return `${slug}__${norm}`;
}

// --- Sign up function ---
async function signUp() {
  const name = nameEl.value.trim();
  const meetTime = meetTimeEl.value;
  const dateISO = runDateEl.value;

  statusEl.textContent = "";
  if (!name) { statusEl.textContent = "Please enter your name."; statusEl.className = "error"; return; }
  if (!dateISO) { statusEl.textContent = "Please choose a valid date."; statusEl.className = "error"; return; }

  const signupId = makeId(name, meetTime);
  const ref = doc(db, "runs", dateISO, "signups", signupId);

  try {
    await setDoc(ref, {
      name,
      meetTime,
      createdAt: serverTimestamp()
    }, { merge: false });

    statusEl.textContent = `You're in for ${meetTime} on ${prettyDate(dateISO)}!`;
    statusEl.className = "success";
    nameEl.value = "";
  } catch (e) {
    statusEl.textContent = "Could not save your signup. Try again.";
    statusEl.className = "error";
    console.error(e);
  }
}

$("signupBtn").addEventListener("click", signUp);
$("refreshBtn").addEventListener("click", () => {
  watchDate(runDateEl.value);
  statusEl.textContent = "Refreshed.";
  statusEl.className = "muted";
  setTimeout(() => (statusEl.textContent = ""), 1200);
});

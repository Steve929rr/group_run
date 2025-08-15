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

const $ = id => document.getElementById(id);

// --- CREATE RUN ---
async function createRun() {
  const date = $("runDate").value;
  const time = $("runTime").value.trim();
  const location = $("runLocation").value.trim();
  const notes = $("runNotes").value.trim();
  const statusEl = $("createStatus");
  statusEl.textContent = "";
  statusEl.className = "";

  if (!date || !time || !location) {
    statusEl.textContent = "Please fill out date, time, and location.";
    statusEl.className = "error";
    return;
  }

  const runId = `${date}_${time.replace(/[:\s]/g,"")}_${location.toLowerCase().replace(/\s+/g,"_")}`;
  const runRef = doc(db, "runs", runId);

  try {
    await setDoc(runRef, { date, time, location, notes, createdAt: serverTimestamp() }, { merge: false });
    statusEl.textContent = "Run created!";
    statusEl.className = "success";
    $("runDate").value = $("runTime").value = $("runLocation").value = $("runNotes").value = "";
  } catch(e) {
    console.error(e);
    statusEl.textContent = "Could not create run.";
    statusEl.className = "error";
  }
}

$("createRunBtn").addEventListener("click", createRun);

// --- LIST RUNS ---
const runsList = $("runsList");
const joinRunSelect = $("joinRunSelect");

function populateRunDropdown() {
  onSnapshot(query(collection(db, "runs"), orderBy("createdAt")), snapshot => {
    runsList.innerHTML = "";
    joinRunSelect.innerHTML = "";
    snapshot.forEach(docSnap => {
      const run = docSnap.data();
      const li = document.createElement("li");
      li.textContent = `${run.date} @ ${run.time} - ${run.location} ${run.notes ? `(${run.notes})` : ""}`;
      runsList.appendChild(li);

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${run.date} @ ${run.time} - ${run.location}`;
      joinRunSelect.appendChild(option);
    });
    // trigger participant list for first run
    if(joinRunSelect.value) watchParticipants(joinRunSelect.value);
  });
}

populateRunDropdown();

// --- JOIN RUN ---
const participantsList = $("participantsList");
let unsubscribeParticipants = null;

function watchParticipants(runId) {
  if (unsubscribeParticipants) unsubscribeParticipants();
  participantsList.innerHTML = "";

  const participantsQuery = collection(db, "runs", runId, "participants");
  unsubscribeParticipants = onSnapshot(participantsQuery, snapshot => {
    participantsList.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.textContent = data.name;
      participantsList.appendChild(li);
    });
  });
}

$("joinRunSelect").addEventListener("change", () => {
  watchParticipants(joinRunSelect.value);
});

$("joinRunBtn").addEventListener("click", async () => {
  let name = $("participantName").value.trim();
  const runId = joinRunSelect.value;
  const statusEl = $("joinStatus");
  statusEl.textContent = "";
  statusEl.className = "";

  if (!runId) {
    statusEl.textContent = "Select a run to join.";
    statusEl.className = "error";
    return;
  }

  const isAnonymous = !name || name === "+1";
  if (isAnonymous) {
    name = "+1";
  }

  // Use random ID for anonymous; deterministic ID for named participants
  const participantRef = isAnonymous
    ? doc(collection(db, "runs", runId, "participants"))
    : doc(db, "runs", runId, "participants",
          name.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_+]/g,"")
      );

  try {
    await setDoc(participantRef, { name, joinedAt: serverTimestamp() });
    statusEl.textContent = "You joined!";
    statusEl.className = "success";
    $("participantName").value = "";
  } catch(e) {
    console.error(e);
    statusEl.textContent = "Could not join run.";
    statusEl.className = "error";
  }
});

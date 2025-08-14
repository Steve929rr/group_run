import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDocs, collection, query, orderBy,
  serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

    // TODO: replace with your own config from Firebase console
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT.appspot.com",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Helpers
    const $ = (id) => document.getElementById(id);
    const statusEl = $("status");
    const runDateEl = $("runDate");
    const nameEl = $("name");
    const meetTimeEl = $("meetTime");
    const list6 = $("list6");
    const list7 = $("list7");
    const dateText = $("dateText");

    // Set default to next Saturday
    function nextSaturdayISO() {
      const d = new Date();
      const day = d.getDay(); // 0=Sun..6=Sat
      const diff = (6 - day + 7) % 7 || 7; // next Saturday (if today is Sat, move to next week)
      d.setDate(d.getDate() + diff);
      // format YYYY-MM-DD
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

    // Real-time listener per date
    let unsubscribe = null;
    function watchDate(dateISO) {
      if (unsubscribe) { unsubscribe(); }
      dateText.textContent = prettyDate(dateISO);
      list6.innerHTML = "";
      list7.innerHTML = "";

      // Listen to both times (or fetch all and split)
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

    // Prevent duplicate signup per date/time by using deterministic doc id:
    // id = <meetTimeSlug>__<normalizedName>
    function makeId(name, meetTime) {
      const slug = meetTime === "6:00 AM" ? "6am" : "7am";
      const norm = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      return `${slug}__${norm}`;
    }

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
        }, { merge: false }); // overwrite same person/time for the same date

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
    $("refreshBtn").addEventListener("click", async () => {
      // Forced refresh: reattach watcher
      watchDate(runDateEl.value);
      statusEl.textContent = "Refreshed.";
      statusEl.className = "muted";
      setTimeout(() => (statusEl.textContent = ""), 1200);
    });
  
import './style.css';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div class="tech-corner top-left"></div>
    <div class="tech-corner top-right"></div>
    <div class="tech-corner bottom-left"></div>
    <div class="tech-corner bottom-right"></div>
    <div id="image-container">
      <div class="overlay"></div>
      <img src="/bumblebee.png" alt="Bumblebee" class="robot-display-left">
      <img src="/optimus-prime.png" alt="Optimus Prime" class="robot-display">
    </div>
    <div id="content">
      <h2>🎉 Eliana's 5th Birthday Party! 🎉<br>Autobots & Bits</h2>
      <p class="details" id="message"></p>
      <p class="details event-info">
        📅 Sat Jan 24th, 2026 @ 5:00 PM <br>
        📍 Idea Lab Kids, Ballantyne <br>
        16041 Johnston Rd Suite E <br>
        Charlotte, NC 28277
      </p>
      <div id="name-input-container" style="display: none;">
        <label for="name-input" class="input-label">Your Name</label>
        <input type="text" id="name-input" placeholder="Enter your name" />
      </div>
      <div class="button-container">
        <button id="confirm">⚡ Count Me In!</button>
        <button id="deny">Can't Make It</button>
      </div>
    </div>
  </div>
`

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVtvC1ZckIGbySOzXcxL9HmEoShOJqVrE",
  authDomain: "eliana-tewodros.firebaseapp.com",
  projectId: "eliana-tewodros",
  storageBucket: "eliana-tewodros.firebasestorage.app",
  messagingSenderId: "995428783429",
  appId: "1:995428783429:web:ab1e03bf9fef877d64da2c",
  measurementId: "G-YE1DQ71S4F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Parse the URL for invite ID
const urlParams = new URLSearchParams(window.location.search);
const inviteId = urlParams.get("id");

const messageElement = document.getElementById("message")!;
const confirmButton = document.getElementById("confirm")!;
const denyButton = document.getElementById("deny")!;
const nameInputContainer = document.getElementById("name-input-container")!;
const nameInput = document.getElementById("name-input") as HTMLInputElement;

// Track if this is a walk-in guest (no invite ID)
let isWalkIn = false;
let currentInviteRef: ReturnType<typeof doc> | null = null;

async function checkInvite() {
if (!inviteId) {
    // No invite ID - show name input for walk-in guests
    isWalkIn = true;
    nameInputContainer.style.display = "block";
    messageElement.innerText = "Autobots, assemble! 🤖⚡ Eliana is turning 5 and YOU'RE invited to the party! Ready to roll out?";
    setupWalkInListeners();
    return;
  }

  try {
    const inviteRef = doc(db, "invites", inviteId);
    currentInviteRef = inviteRef;
    const inviteSnapshot = await getDoc(inviteRef);

if (!inviteSnapshot.exists()) {
      // Invalid invite ID - treat as walk-in
      isWalkIn = true;
      nameInputContainer.style.display = "block";
      messageElement.innerText = "Autobots, assemble! 🤖⚡ Eliana is turning 5 and YOU'RE invited to the party! Ready to roll out?";
      setupWalkInListeners();
      return;
    }

    const inviteData = inviteSnapshot.data();
    const name = inviteData?.name || "Guest";

    if (inviteData?.status) {
      const statusText = inviteData.status === 'confirmed' ? "You're on the team! 🎉🤖" : "Sorry we'll miss you! Hope to see you next time! 💙";
      messageElement.innerText = `${name}! ${statusText}\nChanged your mind? Update below!`;
    } else {
      messageElement.innerText = `Autobots, assemble! 🤖⚡ ${name}, Eliana is turning 5 and YOU'RE invited to the party! Ready to roll out?`;
    }

    setupEventListeners(inviteRef, name);
  } catch (error) {
    console.error("Error checking invite:", error);
    messageElement.innerText = "An error occurred. Please try again later.";
  }
}

function setupWalkInListeners() {
  confirmButton.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) {
      messageElement.innerText = "Oops! We need your name first! 😄";
      nameInput.focus();
      return;
    }
    await createWalkInRsvp(name, "confirmed");
  });

  denyButton.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) {
      messageElement.innerText = "Wait! Tell us who you are first! 😉";
      nameInput.focus();
      return;
    }
    await createWalkInRsvp(name, "denied");
  });
}

async function createWalkInRsvp(name: string, status: "confirmed" | "denied") {
  try {
    const invitesCollection = collection(db, "invites");
    const newDoc = await addDoc(invitesCollection, { 
      name, 
      status,
      walkIn: true,
      createdAt: new Date().toISOString()
    });
    
    currentInviteRef = doc(db, "invites", newDoc.id);
    isWalkIn = false;
    nameInputContainer.style.display = "none";
    
    if (status === "confirmed") {
      messageElement.innerText = `YAYYY ${name}! 🎉🤖 You're on the team! Eliana can't wait to party with you! Autobots, roll out!`;
    } else {
      messageElement.innerText = `Aww ${name}, we'll miss you! 😢 If things change, you know where to find us! 💙`;
    }
    
    // Update buttons and switch to regular update mode
    confirmButton.innerText = "⚡ Actually, I'm In!";
    denyButton.innerText = "Change My Mind";
    
    // Remove old listeners and add new ones for updating
    const newConfirmBtn = confirmButton.cloneNode(true) as HTMLButtonElement;
    const newDenyBtn = denyButton.cloneNode(true) as HTMLButtonElement;
    confirmButton.parentNode!.replaceChild(newConfirmBtn, confirmButton);
    denyButton.parentNode!.replaceChild(newDenyBtn, denyButton);
    
    setupEventListeners(currentInviteRef, name);
  } catch (error) {
    console.error("Error creating RSVP:", error);
    messageElement.innerText = "Error saving your response. Please try again.";
  }
}

function setupEventListeners(inviteRef: ReturnType<typeof doc>, name: string) {
  confirmButton.addEventListener("click", async () => {
    await updateAttendance(inviteRef, "confirmed", name);
  });

  denyButton.addEventListener("click", async () => {
    await updateAttendance(inviteRef, "denied", name);
  });
}

async function updateAttendance(
  inviteRef: ReturnType<typeof doc>,
  status: "confirmed" | "denied",
  name: string
) {
  try {
    await setDoc(inviteRef, { status }, { merge: true });
    if (status === "confirmed") {
      messageElement.innerText = `YAYYY ${name}! 🎉🤖 You're on the team! Eliana can't wait to party with you! Autobots, roll out!`;
    } else if (status === "denied") {
      messageElement.innerText = `Aww ${name}, we'll miss you! 😢 If things change, you know where to find us! 💙`;
    }
    confirmButton.innerText = "⚡ Actually, I'm In!";
    denyButton.innerText = "Change My Mind";
  } catch (error) {
    console.error("Error updating attendance:", error);
    messageElement.innerText = "Error updating your response. Please try again.";
  }
}

// Run the invite check on page load
checkInvite();

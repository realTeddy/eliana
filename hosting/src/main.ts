import './style.css';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div id="image-container"></div>
    <div id="content">
      <h2>You're Invited to Eliana's Ladybug Birthday Party!</h2>
      <p id="message"></p>
      <button id="confirm">Count Me In!</button>
      <button id="deny">Sorry, Can't Make It</button>
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

async function checkInvite() {
  if (!inviteId) {
    messageElement.innerText = "Invalid invite link.";
    return;
  }

  try {
    const inviteRef = doc(db, "invites", inviteId);
    const inviteSnapshot = await getDoc(inviteRef);

    if (!inviteSnapshot.exists()) {
      messageElement.innerText = "Invalid invite link.";
      confirmButton.style.display = "none";
      denyButton.style.display = "none";
      return;
    }

    const inviteData = inviteSnapshot.data();
    const name = inviteData?.name || "Guest";

    if (inviteData?.status) {
      messageElement.innerText = `Hi ${name}, your current status: ${inviteData.status.toUpperCase()}.\nYou can update your response below.`;
    } else {
      messageElement.innerText = `Hi ${name}, please confirm or deny your attendance at Eliana's Butterfly Party!`;
    }

    setupEventListeners(inviteRef, name);
  } catch (error) {
    console.error("Error checking invite:", error);
    messageElement.innerText = "An error occurred. Please try again later.";
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
      messageElement.innerText = `Thank you for RSVPing, ${name}! Eliana will be so happy to see you at her butterfly party! 🦋`;
    } else if (status === "denied") {
      messageElement.innerText = `We're sorry you can't make it, ${name}. We'll miss you at Eliana's special day. 🌸`;
    }
    confirmButton.innerText = "Update RSVP";
    denyButton.innerText = "Change Response";
  } catch (error) {
    console.error("Error updating attendance:", error);
    messageElement.innerText = "Error updating your response. Please try again.";
  }
}

// Run the invite check on page load
checkInvite();

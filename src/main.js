// ----------------- Firebase 설정 -----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ⚠️ 환경 변수로 Firebase 구성
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ----------------- 화면 요소 -----------------
const loginScreen = document.getElementById("loginScreen");
const mainScreen = document.getElementById("mainScreen");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const chatBox = document.getElementById("chat");
const resolveBtn = document.getElementById("resolve-btn");
const input = document.getElementById("input");
const trash = document.getElementById("trash");
const sendBtn = document.getElementById("sendBtn");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const moodModal = document.getElementById("moodModal");
const resolvedModal = document.getElementById("resolvedMoodModal");

let initialMood = "";
let resolvedMood = "";

// ----------------- 로그인 처리 -----------------
googleLoginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    if(result && result.user) handleLogin(result.user);
  } catch (err) {
    console.error(err);
    alert("로그인 실패!");
  }
});

onAuthStateChanged(auth, (user) => {
  user ? handleLogin(user) : handleLogout();
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  handleLogout();
});

// ----------------- 로그인/로그아웃 -----------------
function handleLogin(user) {
  loginScreen.style.display = "none";
  mainScreen.style.display = "block";
  userName.textContent = user.displayName;
  userName.style.display = "inline";
  if(user.photoURL){
    userPhoto.src = user.photoURL;
    userPhoto.style.display = "inline";
  }
  logoutBtn.style.display = "inline";

  // 로그인 후 인사 모달 → 3초 후 자동 닫힘 → 기분 체크 모달
  showGreetingModal();
}

function handleLogout() {
  loginScreen.style.display = "flex";
  mainScreen.style.display = "none";
  userName.style.display = "none";
  userPhoto.style.display = "none";
  logoutBtn.style.display = "none";
}

// ----------------- 인사 모달 -----------------
function showGreetingModal() {
  const greetingModal = document.createElement("div");
  greetingModal.className = "modal";
  greetingModal.innerHTML = `<div class="modal-content">안녕하세요? 오늘의 기분은 어떠셨나요?</div>`;
  document.body.appendChild(greetingModal);
  greetingModal.style.display = "flex";

  setTimeout(() => {
    greetingModal.remove();
    showMoodModal();
  }, 3000);
}

// ----------------- 기분 체크 모달 -----------------
function showMoodModal() {
  moodModal.style.display = "flex";
}

moodModal.querySelectorAll(".mood-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    initialMood = btn.textContent;
    moodModal.style.display = "none";
    appendMessage(`현재 기분: ${initialMood}`, "user");
    appendMessage("무슨 일이 있었나요?", "bot");
  });
});

// ----------------- 상담 후 해소 감정 -----------------
resolveBtn.addEventListener("click", () => {
  if(chatBox.children.length === 0) return;
  Array.from(chatBox.children).forEach(m => m.style.display = "none");
  resolvedModal.style.display = "flex";
});

const resolvedMoodMessages = {
  "☺️": ["좋아요! 행복해졌어요 😊", "오늘 기분 최고! 🌞", "웃음이 가득하네요 😄"],
  "😌": ["마음이 편안해졌어요 🕊️", "스트레스가 사라졌어요 🌿", "여유로운 하루네요 🌸"],
  "🙃": ["조금 더 가벼워졌네요 😉", "오늘 하루 괜찮아요 🍀", "미소가 생겼어요 😎"],
  "❌": ["속이 시원하네요 🌀", "모든 걸 털어냈어요 💨", "새로운 마음으로 시작해요 ✨"]
};

resolvedModal.querySelectorAll(".resolved-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    resolvedMood = btn.dataset.emoji;
    resolvedModal.style.display = "none";

    const paper = document.createElement("div");
    paper.className = "paper";
    paper.textContent = `${initialMood} ➡️ ${resolvedMood}`;
    const rect = chatBox.getBoundingClientRect();
    paper.style.left = rect.left + rect.width/2 - 100 + "px";
    paper.style.top  = rect.top + rect.height/2 - 70 + "px";
    document.body.appendChild(paper);
    makeDraggable(paper);
    paper.dataset.resolvedMood = resolvedMood;
  });
});

// ----------------- 메시지 -----------------
async function sendMessage() {
  const msg = input.value.trim();
  if(!msg) return;
  appendMessage(msg, "user");
  input.value = "";
  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({message: msg})
    });
    const data = await res.json();
    appendMessage(data.choices[0].message.content, "bot");
  } catch {
    appendMessage("⚠️ AI 응답 실패", "bot");
  }
}

function appendMessage(text, type){
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", e => {
  if(e.isComposing) return;
  if(e.key==="Enter" && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});

// ----------------- 포스트잇 & 쓰레기통 -----------------
function makeDraggable(elem){
  elem.draggable = true;
  elem.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", null);
    e.dataTransfer.setDragImage(elem, 0,0);
    elem.classList.add("dragging");
  });
  elem.addEventListener("dragend", ()=> elem.classList.remove("dragging"));
}

trash.addEventListener("dragover", e => e.preventDefault());
trash.addEventListener("drop", e => {
  e.preventDefault();
  const dragging = document.querySelector(".dragging");
  if(!dragging) return;
  const mood = dragging.dataset.resolvedMood;
  dragging.classList.add("crumple");
  setTimeout(()=> dragging.remove(), 600);
  Array.from(chatBox.children).forEach(m => m.remove());
  const messages = resolvedMoodMessages[mood];
  const randomMsg = messages[Math.floor(Math.random()*messages.length)];
  alert(randomMsg);
});

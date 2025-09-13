// ==================== Firebase 설정 ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

document.addEventListener("DOMContentLoaded", () => {
  // ==================== 요소 선택 ====================
  const loginScreen = document.getElementById("loginScreen");
  const mainScreen = document.getElementById("mainScreen");

  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userPhoto = document.getElementById("userPhoto");
  const userName = document.getElementById("userName");

  const header = document.querySelector("header");
  const nav = document.querySelector("nav.nav");
  const homeBtn = document.getElementById("homeBtn");
  const gardenBtn = document.getElementById("gardenBtn");

  // 상담 기능
  const chatBox = document.getElementById("chat");
  const resolveBtn = document.getElementById("resolve-btn");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  const trash = document.getElementById("trash");
  const moodModal = document.getElementById("moodModal");
  const resolvedModal = document.getElementById("resolvedMoodModal");

  // 정원 기능
  const gardenScreen = document.getElementById("gardenScreen");
  const gardenContainer = document.getElementById("gardenContainer");
  const plantButton = document.getElementById("plantButton");
  const waterButton = document.getElementById("waterButton");
  const plantStatus = document.getElementById("plantStatus").querySelector(".status-text");
  const gardenIntroModal = document.getElementById("gardenIntroModal");
  const startGardenBtn = document.getElementById("startGardenBtn");

  // ✅ 1회 사용권 플래그
  let canUseGardenAction = false;

  let initialMood = "";
  let resolvedMood = "";

  // ==================== 초기 상태 ====================
  loginScreen.style.display = "flex";
  mainScreen.style.display = "none";
  gardenScreen.style.display = "none";
  header.style.display = 'none';
  nav.style.display = 'none';
  document.querySelector('.user-info').style.display = 'none';

  // ==================== 로그인/로그아웃 ====================
  googleLoginBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if(result?.user) handleLogin(result.user);
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

  function handleLogin(user) {
    loginScreen.style.display = "none";
    mainScreen.style.display = "block";
    header.style.display = 'block';
    nav.style.display = 'flex';
    document.querySelector('.user-info').style.display = 'flex';
    userName.textContent = user.displayName;
    userPhoto.src = user.photoURL || "";
    showGreetingModal();
  }

  function handleLogout() {
    loginScreen.style.display = "flex";
    mainScreen.style.display = "none";
    gardenScreen.style.display = "none";
    header.style.display = 'none';
    nav.style.display = 'none';
    document.querySelector('.user-info').style.display = 'none';
  }

  // ==================== 헤더·네비 버튼 ====================
  homeBtn.addEventListener("click", () => {
    mainScreen.style.display = "block";
    gardenScreen.style.display = "none";
    resetChat(); // 상담 초기화
  });

  gardenBtn.addEventListener("click", () => {
    mainScreen.style.display = "none";
    gardenScreen.style.display = "block";

    if (!localStorage.getItem("gardenIntroShown")) {
      gardenIntroModal.style.display = "flex";
    } else {
      Garden.startGarden();
    }
  });

  startGardenBtn.addEventListener("click", () => {
    gardenIntroModal.style.display = "none";
    Garden.startGarden();
    localStorage.setItem("gardenIntroShown", "true");
  });

  // ==================== 상담 초기화 ====================
  function resetChat() {
    chatBox.innerHTML = "";
    input.value = "";
    moodModal.style.display = "none";
    resolvedModal.style.display = "none";
    initialMood = "";
    resolvedMood = "";
    document.querySelectorAll(".paper").forEach(p => p.remove());

    canUseGardenAction = false;
    plantButton.disabled = true;
    waterButton.disabled = true;
    plantStatus.textContent = "꽃을 심어 정원을 만들어봐요 ! 🌳";

    showGreetingModal();
  }

  // ==================== 인사 모달 ====================
  function showGreetingModal() {
    const greetingModal = document.createElement("div");
    greetingModal.className = "modal";
    greetingModal.innerHTML = `<div class="modal-content">안녕하세요, 오늘의 기분은 어떠셨나요?</div>`;
    document.body.appendChild(greetingModal);
    greetingModal.style.display = "flex";

    setTimeout(() => {
      greetingModal.remove();
      moodModal.style.display = "flex"; // 2초 후에 기분 선택창
    }, 2000);
  }

  // ==================== 초기 상담 메시지 ====================
  const initialBotMessages = {
    "🤬": "엄청 화났을 때 답변",
    "😡": "조금 화났을 때 답변",
    "😠": "약간 화났을 때 답변",
    "🥲": "약간 슬플 때 답변.",
    "😢": "조금 슬플 때 답변",
    "😭": "엄청 슬플 때 답변"
  };

  moodModal.querySelectorAll(".mood-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      initialMood = btn.textContent;
      moodModal.style.display = "none";
      appendMessage(`현재 기분: ${initialMood}`, "user");
      const botMessage = initialBotMessages[initialMood] || "오늘 기분은 어떠신가요?";
      appendMessage(botMessage, "bot");
    });
  });

  // ==================== 메시지 전송 ====================
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

  // ==================== 포스트잇 & 쓰레기통 ====================
  function makeDraggable(elem){
    elem.draggable = true;
    elem.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", "drag");
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

    canUseGardenAction = true;
    plantButton.disabled = false;
    waterButton.disabled = false;
    plantStatus.textContent = "🌱 오늘 1회 정원 가꾸기 가능!";
  });

  resolveBtn.addEventListener("click", () => {
    if(chatBox.children.length === 0) return;
    Array.from(chatBox.children).forEach(m => m.style.display = "none");
    resolvedModal.style.display = "flex";
  });

  const resolvedMoodMessages = {
    "☺️": ["완전 해소 됐을 때 -1", "완전 해소 됐을 때 -2", "완전 해소 됐을 때 -3"],
    "😌": ["조금 해소 됐을 때 -1", "조금 해소 됐을 때 -2", "조금 해소 됐을 때 -3"],
    "🙃": ["약간 해소 됐을 때 -1", "약간 해소 됐을 때 -2", "약간 해소 됐을 때 -3"],
    "❌": ["해소 안 됐을 때 -1", "해소 안 됐을 때 -2", "해소 안 됐을 때 -3"]
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

  // ==================== 정원 가꾸기 ====================
  const Garden = (() => {
    const sprouts = [];
    const flowers = ["🌸","🌼","🌺","🌻","🌹","🪻","🌷"];
    let lastInsectTrigger = 0;

    function startGarden() {
      gardenContainer.innerHTML = "";
      sprouts.length = 0;
      plantStatus.textContent = "꽃을 심어 정원을 만들어봐요 ! 🌳";
      lastInsectTrigger = 0;
    }

    plantButton.addEventListener("click", () => {
      if (!canUseGardenAction) return;
      canUseGardenAction = false;
      plantButton.disabled = true;
      waterButton.disabled = true;

      const sproutCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < sproutCount; i++) {
        const sprout = document.createElement("div");
        sprout.className = "flower";
        sprout.textContent = "🌱";
        sprout.style.left = `${Math.random() * (gardenContainer.clientWidth - 30)}px`;
        sprout.style.bottom = `${Math.random() * (gardenContainer.clientHeight - 30)}px`;
        const scale = 0.8 + Math.random() * 0.4;
        const rotate = Math.random() * 30 - 15;
        sprout.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
        gardenContainer.appendChild(sprout);
        sprouts.push(sprout);
      }
      plantStatus.textContent = `${sproutCount}개의 새싹을 심었어요 ! ☘️`;
    });

    waterButton.addEventListener("click", () => {
      if (!canUseGardenAction) return;
      canUseGardenAction = false;
      plantButton.disabled = true;
      waterButton.disabled = true;

      if (sprouts.length === 0) return;
      const index = Math.floor(Math.random() * sprouts.length);
      const sprout = sprouts.splice(index, 1)[0];
      const flowerEmoji = flowers[Math.floor(Math.random() * flowers.length)];
      sprout.textContent = flowerEmoji;
      const scale = 1 + Math.random() * 0.5;
      const rotate = Math.random() * 40 - 20;
      sprout.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
      plantStatus.textContent = "꽃이 폈어요 ! 🌻";
      maybeSpawnInsect();
    });

    return {
      startGarden,
      get lastInsectTrigger() { return lastInsectTrigger; },
      set lastInsectTrigger(val) { lastInsectTrigger = val; }
    };
  })();

  function maybeSpawnInsect() {
    if (!gardenContainer) return;
    const flowers = gardenContainer.querySelectorAll(".flower");
    const flowerCount = flowers.length;
    if (flowerCount < 8) return;
    if (flowerCount - Garden.lastInsectTrigger < 8) return;
    Garden.lastInsectTrigger = flowerCount;

    const insects = ["🦋","🐝"];
    const insect = document.createElement("div");
    insect.className = "insect";
    insect.textContent = insects[Math.floor(Math.random()*insects.length)];
    
    let left = Math.random() * (gardenContainer.clientWidth - 30);
    let top  = Math.random() * (gardenContainer.clientHeight - 30);

    insect.style.position = "absolute";
    insect.style.left = left+"px";
    insect.style.top = top+"px";
    insect.style.fontSize = "24px";
    gardenContainer.appendChild(insect);

    const duration = 5000;
    const startTime = performance.now();
    const amplitude = 20 + Math.random()*15;
    const speed = 0.005 + Math.random()*0.002;

    function animate(time){
      const elapsed = time-startTime;
      if(elapsed<duration){
        const newTop = top-(elapsed/duration)*100;
        const newLeft = left + Math.sin(elapsed*speed)*amplitude;
        insect.style.top = newTop+"px";
        insect.style.left = newLeft+"px";
        requestAnimationFrame(animate);
      } else { insect.remove(); }
    }
    requestAnimationFrame(animate);
  }

  setInterval(maybeSpawnInsect, 2000);
});

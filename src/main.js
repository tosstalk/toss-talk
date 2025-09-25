// ==================== Firebase 설정 ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const db = getFirestore(app);

// ==================== Firestore 연동 함수 ====================
async function loadGarden(userId) {
  if(!userId) return { plants: [], harvestedCount: 0 };
  const ref = doc(db, "gardens", userId);
  const snap = await getDoc(ref);
  if(snap.exists() && snap.data().garden){
    const g = snap.data().garden;
    return { plants: g.plants || [], harvestedCount: g.harvestedCount || 0 };
  }
  return { plants: [], harvestedCount: 0 };
}

async function saveGarden(userId, plants, harvestedCount){
  console.log("saveGarden 호출", {userId, plants, harvestedCount});
  if(!userId) return;
  const ref = doc(db, "gardens", userId);
  try {
    await setDoc(ref, {
      garden: { plants, harvestedCount },
      lastGardenUse: serverTimestamp()
    }, { merge:true });
    console.log("Firestore 저장 성공");
  } catch(err) {
    console.error("Firestore 저장 실패:", err);
  }
}

// ==================== DOM 요소 ====================
const loginScreen = document.getElementById("loginScreen");
const mainScreen = document.getElementById("mainScreen");
const gardenScreen = document.getElementById("gardenScreen");

const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");

const header = document.querySelector("header");
const nav = document.querySelector("nav.nav");
const homeBtn = document.getElementById("homeBtn");
const gardenBtn = document.getElementById("gardenBtn");

const chatBox = document.getElementById("chat");
const resolveBtn = document.getElementById("resolve-btn");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const trash = document.getElementById("trash");
const moodModal = document.getElementById("moodModal");
const resolvedModal = document.getElementById("resolvedMoodModal");

const gardenContainer = document.getElementById("gardenContainer");
const plantButton = document.getElementById("plantButton");
const waterButton = document.getElementById("waterButton");
const plantStatus = document.getElementById("plantStatus");
const harvestCountStatus = document.getElementById("harvestCountStatus");

// ==================== 전역 상태 ====================
let userId = null;
let canUseGardenAction = false;
let harvestedCount = 0;
let initialMood = "";
let resolvedMood = "";

// ==================== 상태창 텍스트 ====================
function updatePlantStatusInitial(){ plantStatus.textContent = "🐞 씨앗을 심어 채소를 키워봐요 ! 🫛"; }
function onSeedPlanted(count=1){ plantStatus.textContent = `🐞 ${count}개의 씨앗을 심었어요 🌱`; }
function onGrowing(){ plantStatus.textContent = "🐞 쑥쑥 자라고 있어요 🥦"; }
function onFullyGrown(){ plantStatus.textContent = "🐞 다 자랐어요! 채소를 수확해주세요 🌽"; }

// ==================== Harvest 상태창 모듈 ====================
const HarvestStatus = (() => {
  const el = document.getElementById("harvestCountStatus");
  function update(count) {
    if (el) el.textContent = `🍠 수확한 채소: ${count}개 🥔`;
  }
  return { update };
})();

// ==================== 로그인/로그아웃 ====================
googleLoginBtn.addEventListener("click", async()=>{
  try{ const result = await signInWithPopup(auth, provider); if(result?.user) handleLogin(result.user); }
  catch(err){ console.error(err); alert("로그인 실패!"); }
});

onAuthStateChanged(auth, user=> user? handleLogin(user): handleLogout());

logoutBtn.addEventListener("click", async()=>{
  await signOut(auth); handleLogout();
});

async function handleLogin(user){
  userId = user.uid;
  resetChat();
  loginScreen.style.display = "none";
  mainScreen.style.display  = "block";
  header.style.display = 'block';
  nav.style.display    = 'flex';
  document.querySelector('.user-info').style.display = 'flex';
  userName.textContent = user.displayName;
  userPhoto.src = user.photoURL || "";

  const { plants, harvestedCount: savedCount } = await loadGarden(userId);
  Garden.startGarden(plants, savedCount);

  canUseGardenAction = true;
  setGardenButtonsState(true);
}

function handleLogout(){
  userId = null;
  loginScreen.style.display = "flex";
  mainScreen.style.display  = "none";
  gardenScreen.style.display= "none";
  header.style.display = 'none';
  nav.style.display    = 'none';
  document.querySelector('.user-info').style.display = 'none';
  resetChat(false);
  Garden.startGarden([]);
}

// ==================== 화면 전환 ====================
homeBtn.addEventListener("click", ()=>{
  mainScreen.style.display="block";
  gardenScreen.style.display="none"; resetChat(); });

gardenBtn.addEventListener("click", ()=>{
  mainScreen.style.display="none";
  gardenScreen.style.display="block";
  Garden.render();
});

// ==================== 상담 초기화 ====================
function resetChat(showGreeting=true){
  chatBox.innerHTML="";
  input.value="";
  moodModal.style.display="none";
  moodModal.classList.remove("no-bg");
  resolvedModal.style.display="none";
  initialMood="";
  resolvedMood="";
  document.querySelectorAll(".paper").forEach(p=>p.remove());
  canUseGardenAction = true;
  setGardenButtonsState(true);
  plantStatus.textContent = "잘 자라고 있어요 🌱";
  if(showGreeting) showGreetingModal();
}

function setGardenButtonsState(enabled){
  plantButton.disabled = !enabled;
  waterButton.disabled = !enabled;
  if(enabled){ plantButton.classList.remove("disabled"); waterButton.classList.remove("disabled"); }
  else{ plantButton.classList.add("disabled"); waterButton.classList.add("disabled"); }
}

function showGreetingModal(){
  const greetingModal = document.createElement("div");
  greetingModal.className="modal";
  greetingModal.innerHTML=`<div class="modal-content">안녕하세요, 오늘의 기분은 어떠셨나요?</div>`;
  document.body.appendChild(greetingModal);
  greetingModal.style.display="flex";
  setTimeout(()=>{ greetingModal.remove(); moodModal.style.display="flex"; },2000);
}

// ==================== 감정 별 메시지 ====================
const initialBotMessages = {
  "🤬": "누가 그랬어? 빨리 말해",
  "😡": "기분 나빠? 무슨 일이야?",
  "😠": "좀 짜증났구나.. 왜 그래?",
  "🥲": "오늘 좀 우울해?",
  "😢": "속상하구나 밥은 먹었어?",
  "😭": "많이 힘들지.. 힘들 때는 그냥 울어도 돼"
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
  let offsetX=0, offsetY=0, isDragging=false;

  const start = e => {
    isDragging = true;
    elem.classList.add("dragging");
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = elem.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    elem.style.position = "absolute";
    elem.style.zIndex = 1000;
  };

  const move = e => {
    if(!isDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    elem.style.left = clientX - offsetX + "px";
    elem.style.top  = clientY - offsetY + "px";
  };

  const end = e => {
    if (!isDragging) return;
    const trashRect = trash.getBoundingClientRect();
    const paperRect = elem.getBoundingClientRect();
    const isInTrash =
      paperRect.left + paperRect.width/2 > trashRect.left &&
      paperRect.left + paperRect.width/2 < trashRect.right &&
      paperRect.top + paperRect.height/2 > trashRect.top &&
      paperRect.top + paperRect.height/2 < trashRect.bottom;

    if(isInTrash){
      const mood = elem.dataset.resolvedMood;
      elem.classList.add("crumple", "fly-to-trash");
      setTimeout(() => {
        elem.remove();
        const messages = resolvedMoodMessages[mood];
        if(messages){
          const randomMsg = messages[Math.floor(Math.random()*messages.length)];
          alert(randomMsg);
        }
        canUseGardenAction = true;
        setGardenButtonsState(true);
        plantStatus.textContent = "🌱 농사 짓기 시작 ";
        Array.from(chatBox.children).forEach(m => m.remove());
      }, 600);
    }
    isDragging = false;
    elem.classList.remove("dragging");
  };

  elem.addEventListener("mousedown", start);
  elem.addEventListener("mousemove", move);
  elem.addEventListener("mouseup", end);
  elem.addEventListener("mouseleave", end);
  elem.addEventListener("touchstart", start);
  elem.addEventListener("touchmove", move);
  elem.addEventListener("touchend", end);
}

trash.addEventListener("dragover", e => e.preventDefault());

const resolvedMoodMessages = {
  "☺️": ["😃 기분 풀려서 다행이야 !", "😁 남은 하루는 기분 좋게 보내!", "🎶 AKMU - I Love You"],
  "😌": ["☺️ 조금 나아졌다니 다행이다.", "😊 많이 웃고 좋은 생각만 해.", "🎶 GongGongGoo009 - 산책"],
  "🙃": ["😌 시간이 지나면 천천히 괜찮아질 거야.", "🫠 맛있는 거 먹으러 갔다 와.", "🎶 pH-1 - Homebody"],
  "❌": ["🥺 지금도 힘들구나. 한 숨 푹 자는 건 어때?", "🥹 넌 혼자가 아니야. 우리 또 대화할까?", "🎶 Damons year - D16 D17"]
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
    paper.dataset.stage = "flat";
   
    paper.addEventListener("click", () => {
      if (paper.dataset.stage !== "flat") return;
      paper.dataset.stage = "image";

      const img = document.createElement("img");
      img.src = '../images/paper.png';
      img.style.width = "80px";
      img.style.height = "80px";

      paper.textContent = "";
      paper.appendChild(img);

      resolvedModal.style.background = "none";
      resolvedModal.style.backdropFilter = "none";
      resolvedModal.classList.add("no-backdrop-filter");
    });
  });
});

resolveBtn.addEventListener("click", () => {
  if (chatBox.children.length === 0) return;
  Array.from(chatBox.children).forEach(m => m.remove());

  resolvedModal.style.background = "";
  resolvedModal.style.backdropFilter = "";
  resolvedModal.style.display = "flex";

  canUseGardenAction = false;
  setGardenButtonsState(false);
});

// ==================== 텃밭 가꾸기 ====================
const Garden = (() => {
  let plants = [];
  let harvestedCount = 0;
  const plantIcons = { seed:"🌱", sprout:"🥬", crops:["🥕","🍅","🥒","🍆","🧅","🥔","🌽","🍠","🫑"] };

  function render() {
    gardenContainer.querySelectorAll(".plant").forEach(el => {
      if (!plants.some(p => p.el === el)) el.remove();
    });
    const placed = [];
    plants.forEach((p) => {
      let el;
      if (p.el) {
        el = p.el;
        if (!el.parentElement) gardenContainer.appendChild(el);
      } else {
        el = document.createElement("div");
        el.className = "plant";
        el.style.position = "absolute";
        el.style.fontSize = "24px";
        el.style.userSelect = "none";
        
        let x = p.x;
        let y = p.y;
        if (x == null || y == null) {
          const plantSize = 30;
          let attempts = 0;
          const bottomRange = gardenContainer.clientHeight * 0.2;
          do {
            x = Math.random() * (gardenContainer.clientWidth - plantSize);
            y = Math.random() * bottomRange;
            attempts++;
          } while (
            placed.some(pos => Math.abs(pos.x - x) < plantSize && Math.abs(pos.y - y) < plantSize) && 
            attempts < 50
          );
          placed.push({ x, y });
        }
        el.style.left = `${x}px`;
        el.style.bottom = `${y}px`;
        
        p.x = x; 
        p.y = y;
        gardenContainer.appendChild(el);
        p.el = el;
      }
      
      // 아이콘 처리
      if (!p.icon) {
        if (p.stage === "seed") p.icon = "🌱";
        else if (p.stage === "sprout") p.icon = "🥬";
        else p.icon = plantIcons.crops[Math.floor(Math.random() * plantIcons.crops.length)];
      }
      el.textContent = p.icon;
      el.onclick = null;
      if (p.stage === "crop") {
        el.style.cursor = "pointer";
        el.onclick = () => harvestPlantByElement(el);
      } else {
        el.style.cursor = "default";
      }
    });
  }

  async function plantSeed(count = 1) {
    if (!canUseGardenAction) return;
    canUseGardenAction = false;
    setGardenButtonsState(false);
    for (let i = 0; i < count; i++) plants.push({ stage: "seed", icon: "🌱" });
    render();
    onSeedPlanted(count);
    HarvestStatus.update(harvestedCount);
    if (userId) await saveGarden(
      userId, 
      plants.map(p => ({ 
        stage: p.stage, 
        icon: p.icon,
        x: p.x ?? null,
        y: p.y ?? null 
      })), 
      harvestedCount);
  }

  async function waterPlants() {
    if (!canUseGardenAction) return;
    canUseGardenAction = false;
    setGardenButtonsState(false);
    plants.forEach(p => {
      if (p.stage === "seed") { p.stage = "sprout"; p.icon = "🥬"; }
      else if (p.stage === "sprout") {
        p.stage = "crop";
        p.icon = plantIcons.crops[Math.floor(Math.random() * plantIcons.crops.length)];
      }
    });
    render();
    if (userId) await saveGarden(
      userId, 
      plants.map(p => ({ 
        stage: p.stage, 
        icon: p.icon,
      x: p.x ?? null,
    y: p.y ?? null })), 
    harvestedCount
  );
    if (plants.some(p => p.stage === "crop")) onFullyGrown();
    else if (plants.some(p => p.stage === "sprout")) onGrowing();
    else plantStatus.textContent = "🐞 채소를 수확해봐요 ! 🌽";
    HarvestStatus.update(harvestedCount);
  }

  async function harvestPlantByElement(el) {
    const idx = plants.findIndex(p => p.el === el);
    if (idx === -1 || plants[idx].stage !== "crop") return;
    plants.splice(idx, 1);
    harvestedCount++;
    if (userId) await saveGarden(userId, plants.map(p => ({ stage: p.stage, icon: p.icon })), harvestedCount);
    render();
    plantStatus.textContent = "🐞 채소를 수확했어요! 🥕";
    HarvestStatus.update(harvestedCount);
    canUseGardenAction = false;
    setGardenButtonsState(false);
  }

  function startGarden(initialPlants = [], initialHarvested = 0) {
    plants = initialPlants.map(p => {
      let stage = p.stage || "seed";
      let icon = p.icon;
      if (!icon) {
        if (stage === "seed") icon = "🌱";
        else if (stage === "sprout") icon = "🥬";
        else icon = plantIcons.crops[Math.floor(Math.random() * plantIcons.crops.length)];
      }
      const x = p.x ?? null;
      const y = p.y ?? null;
      return { stage, icon, x, y };
    });
    harvestedCount = initialHarvested;
    render();
    HarvestStatus.update(harvestedCount);
    if (plants.some(p => p.stage === "crop")) onFullyGrown();
    else if (plants.some(p => p.stage === "sprout")) onGrowing();
    else if (plants.length > 0) onSeedPlanted(plants.length);
    else updatePlantStatusInitial();
  }

  return { startGarden, plantSeed, waterPlants, render, plants };
})();

plantButton.addEventListener("click", async()=>{
  if(!userId) return;
  await Garden.plantSeed(Math.floor(Math.random()*3)+1);
});

waterButton.addEventListener("click", async()=>{
  if(!userId) return;
  await Garden.waterPlants();
});

// ============ 계란깨기 ===============
const eggbreakBtn = document.getElementById("eggbreakBtn");
const eggbreakScreen = document.getElementById("eggbreakScreen");

document.addEventListener('DOMContentLoaded', () => {
  const gameContainer = document.getElementById('game-container');
  const selectionScreen = document.getElementById('selection-screen');
  const startGameBtn = document.getElementById('start-game-btn');
  const gameScreen = document.getElementById('game-screen');
  const counterElement = document.querySelector('#counter span');
  const eggImage = document.getElementById('egg-image');
  const toolImage = document.getElementById('tool-image');
  const eggDisplay = document.getElementById('egg-display');
  const prevEggBtn = document.getElementById('prev-egg');
  const nextEggBtn = document.getElementById('next-egg');
  const toolDisplay = document.getElementById('tool-display');
  const prevToolBtn = document.getElementById('prev-tool');
  const nextToolBtn = document.getElementById('next-tool');
  const eggStatus = document.getElementById('egg-status');

  eggbreakBtn.addEventListener("click", () => {
      mainScreen.style.display = "none";
      gardenScreen.style.display = "none";
      eggbreakScreen.style.display = "block";
      gameContainer.style.display = "block";
  });

  let clickCount = 0;
  let selectedEggIndex = 0;
  let selectedToolIndex = 0;

  const eggs = [
    {
      src: "./images/red_egg.png",
      alt: "계란 1",
      crackedImages: [
        "./images/red_egg_crack1.png",
        "./images/red_egg_crack2.png"
      ],
    },
    {
      src: "./images/pupple_egg.png",
      alt: "계란 2",
      crackedImages: [
        "./images/pupple_egg_crack1.png",
        "./images/pupple_egg_crack2.png"
      ],
    },
    {
      src: "./images/green_egg.png",
      alt: "계란 3",
      crackedImages: [
        "./images/green_egg_crack1.png",
        "./images/green_egg_crack2.png"
      ],
    }
  ];
  const tools = [
    { src: "./images/hammer.png", alt: "망치" },
    { src: "./images/baseball.png", alt: "야구 방망이" },
    { src: "./images/pan.png", alt: "프라이팬" },
    { src: "./images/mic.png", alt: "마이크" }
  ];

  const finalExplosionImage = "./images/fire.png";

  const countStages = {
    crack1: 10,
    crack2: 20,
    explode: 30
  };

  function resetEggGame() {
    clickCount = 0;
    selectedEggIndex = 0;
    selectedToolIndex = 0;
    selectionScreen.style.display = 'block';
    gameScreen.style.display = 'none';
    eggStatus.textContent = "🥚 계란과 도구를 골라줘 🔨";
    startGameBtn.disabled = false;
    startGameBtn.style.display = 'inline-block';
    eggDisplay.src = eggs[0].src;
    toolDisplay.src = tools[0].src;
    counterElement.textContent = '0';
  }

  eggbreakBtn.addEventListener("click", () => {
    mainScreen.style.display = "none";
    gardenScreen.style.display = "none";
    eggbreakScreen.style.display = "block";
    resetEggGame();
  });

  prevEggBtn.addEventListener('click', () => {
    selectedEggIndex = (selectedEggIndex - 1 + eggs.length) % eggs.length;
    eggDisplay.src = eggs[selectedEggIndex].src;
  });

  nextEggBtn.addEventListener('click', () => {
    selectedEggIndex = (selectedEggIndex + 1) % eggs.length;
    eggDisplay.src = eggs[selectedEggIndex].src;
  });

  prevToolBtn.addEventListener('click', () => {
    selectedToolIndex = (selectedToolIndex - 1 + tools.length) % tools.length;
    toolDisplay.src = tools[selectedToolIndex].src;
  });

  nextToolBtn.addEventListener('click', () => {
    selectedToolIndex = (selectedToolIndex + 1) % tools.length;
    toolDisplay.src = tools[selectedToolIndex].src;
  });

  function checkSelection() {
    if (selectedEggIndex !== null && selectedToolIndex !== null) {
      startGameBtn.disabled = false;
    }
  }

  eggDisplay.classList.add('selected');
  toolDisplay.classList.add('selected');
  checkSelection();

  startGameBtn.addEventListener('click', () => {
    selectionScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    eggImage.src = eggs[selectedEggIndex].src;
    toolImage.src = tools[selectedToolIndex].src;
    eggStatus.textContent = "🐣 계란을 마구마구 때려봐 ! 🔨";
    startGameBtn.style.display = 'none';
  });

  eggImage.addEventListener('click', () => {
    if (clickCount >= countStages.explode) return;
    clickCount++;
    counterElement.textContent = clickCount;

    toolImage.style.opacity = 1;
    toolImage.classList.add('tool-animation');
    setTimeout(() => {
      toolImage.classList.remove('tool-animation');
      toolImage.style.opacity = 0;
    }, 200);

    const currentEgg = eggs[selectedEggIndex];
    if (clickCount === countStages.crack1) {
      eggImage.src = currentEgg.crackedImages[0];
      eggStatus.textContent = "🐣 금 가기 시작했어 ! 🪓";
    } else if (clickCount === countStages.crack2) {
      eggImage.src = currentEgg.crackedImages[1];
      eggStatus.textContent = "🐣 거의 다 왔어 ! ⛏️";
    }
    if (clickCount >= countStages.explode) {
      eggImage.src = finalExplosionImage;
      eggStatus.textContent = "🐣 스트레스 완전 박살 ! 💥";
      eggImage.style.cursor = 'default';
    }
  });
});
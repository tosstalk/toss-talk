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

// 구글 로그인 및 유저정보
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");

const header = document.querySelector("header");
const nav = document.querySelector("nav.nav");
const homeBtn = document.getElementById("homeBtn");
const gardenBtn = document.getElementById("gardenBtn");

// 상담 관련
const chatBox = document.getElementById("chat");
const resolveBtn = document.getElementById("resolve-btn");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const trash = document.getElementById("trash");
const moodModal = document.getElementById("moodModal");
const resolvedModal = document.getElementById("resolvedMoodModal");

// 정원 관련
const gardenContainer = document.getElementById("gardenContainer");
const plantButton = document.getElementById("plantButton");
const waterButton = document.getElementById("waterButton");
const harvestButton = document.getElementById("harvestButton");
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
  mainScreen.style.display  = "block";
  header.style.display = 'block';
  nav.style.display    = 'flex';
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
  mainScreen.style.display  = "none";
  gardenScreen.style.display= "none";
  header.style.display = 'none';
  nav.style.display    = 'none';
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
    elem.style.top  = clientY - offsetY + "px";
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

        // 상태창 메시지
        const messages = resolvedMoodMessages[mood];
        if(messages){
          const randomMsg = messages[Math.floor(Math.random()*messages.length)];
          alert(randomMsg);
        }
        // 텃밭 버튼 활성화
        canUseGardenAction = true;
        setGardenButtonsState(true);

        // 상태창 텍스트 업데이트
        plantStatus.textContent = "🌱 농사 짓기 시작 ";

        // 채팅 내용 초기화
        Array.from(chatBox.children).forEach(m => m.remove());
      }, 600);
    }

    isDragging = false;
    elem.classList.remove("dragging");
  };

  // 마우스 이벤트
  elem.addEventListener("mousedown", start);
  elem.addEventListener("mousemove", move);
  elem.addEventListener("mouseup", end);
  elem.addEventListener("mouseleave", end);

  // 터치 이벤트
  elem.addEventListener("touchstart", start);
  elem.addEventListener("touchmove", move);
  elem.addEventListener("touchend", end);
}

  // ==================== Resolve 버튼 ====================
resolveBtn.addEventListener("click", () => {
  if(chatBox.children.length === 0) return;

  // 채팅 내용 제거
  Array.from(chatBox.children).forEach(m => m.remove());

  // 해소된 기분 선택 모달 띄우기
  resolvedModal.style.display = "flex";

  // 텃밭 버튼은 아직 비활성화 상태로 유지
  canUseGardenAction = false;
  setGardenButtonsState(false);
  
  // 상태창 메시지는 모달 선택 후에 업데이트
});


// 쓰레기통 기본 동작
trash.addEventListener("dragover", e => e.preventDefault());

const resolvedMoodMessages = {
  "☺️": ["😃 기분 풀려서 다행이야 !",
          "😁 남은 하루는 기분 좋게 보내!",
          "🎶 AKMU - I Love You"],

  "😌": ["☺️ 조금 나아졌다니 다행이다.",
          "😊 많이 웃고 좋은 생각만 해.",
          "🎶 GongGongGoo009 - 산책"],

  "🙃": ["😌 시간이 지나면 천천히 괜찮아질 거야.",
          "🫠 맛있는 거 먹으러 갔다 와.",
          "🎶 pH-1 - Homebody"],

  "❌": ["🥺 지금도 힘들구나. 한 숨 푹 자는 건 어때?",
          "🥹 넌 혼자가 아니야. 우리 또 대화할까?",
          "🎶 Damons year - D16 D17"]
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
    paper.style.top  = rect.top + rect.height/2 - 70 + "px";

    document.body.appendChild(paper);
    makeDraggable(paper);
    paper.dataset.resolvedMood = resolvedMood;
    paper.dataset.stage = "flat";

    paper.addEventListener("click", () => {
      if (paper.dataset.stage !== "flat") return;
      paper.dataset.stage = "crumpled";
      paper.classList.add("crumple");
    });
  });
});

// ==================== 텃밭 가꾸기 ====================
const Garden = (() => {
  let plants = [];
  let harvestedCount = 0;

  const plantIcons = { seed:"🌱", sprout:"🥬", crops:["🥕","🍅","🥒","🍆","🧅","🥔","🌽","🍠","🫑"] };

  function render() {
    // 기존 식물 DOM 제거
    gardenContainer.querySelectorAll(".plant").forEach(el => {
      if (!plants.some(p => p.el === el)) el.remove();
    });

    const placed = [];

     plants.forEach((p) => {
      let el;

      if (p.el) {
        // 기존 엘리먼트 사용
        el = p.el;
        if (!el.parentElement) gardenContainer.appendChild(el);
      } else {
        // 새 엘리먼트 생성
        el = document.createElement("div");
        el.className = "plant";
        el.style.position = "absolute";
        el.style.fontSize = "24px";
        el.style.userSelect = "none";

        // 위치 계산
        const plantSize = 30;
        let x, y, attempts = 0;
        do {
          const bottomRange = gardenContainer.clientHeight * 0.2;
          x = Math.random() * (gardenContainer.clientWidth - plantSize);
          y = Math.random() * bottomRange;
          attempts++;
        } while (
          placed.some(pos => Math.abs(pos.x - x) < plantSize && Math.abs(pos.y - y) < plantSize) &&
          attempts < 50
        );

        placed.push({ x, y });
        el.style.left = `${x}px`;
        el.style.bottom = `${y}px`;

        gardenContainer.appendChild(el);
        p.el = el;
      }

      // 아이콘 설정
      if (!p.icon) {
        if (p.stage === "seed") p.icon = "🌱";
        else if (p.stage === "sprout") p.icon = "🥬";
        else p.icon = plantIcons.crops[Math.floor(Math.random() * plantIcons.crops.length)];
      }
      el.textContent = p.icon;

      // 클릭 이벤트
      el.onclick = null;
      if (p.stage === "crop") {
        el.style.cursor = "pointer";
        el.onclick = () => harvestPlantByElement(el);
      } else {
        el.style.cursor = "default";
      }
    });
  }

  // ==================== 씨앗 심기 ====================
  async function plantSeed(count = 1) {
    if (!canUseGardenAction) return;
    canUseGardenAction = false;
    setGardenButtonsState(false);

    for (let i = 0; i < count; i++) plants.push({ stage: "seed", icon: "🌱" });
    render();
    onSeedPlanted(count);
    HarvestStatus.update(harvestedCount);

    if (userId) await saveGarden(userId, plants.map(p => ({ stage: p.stage, icon: p.icon })), harvestedCount);
  }

  // ==================== 물주기 ====================
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
    if (userId) await saveGarden(userId, plants.map(p => ({ stage: p.stage, icon: p.icon })), harvestedCount);

    if (plants.some(p => p.stage === "crop")) onFullyGrown();
    else if (plants.some(p => p.stage === "sprout")) onGrowing();
    else plantStatus.textContent = "🐞 채소를 수확해봐요 ! 🌽";
    HarvestStatus.update(harvestedCount);
  }

  // ==================== 수확 ====================
  async function harvestPlantByElement(el) {
    const idx = plants.findIndex(p => p.el === el);
    if (idx === -1 || plants[idx].stage !== "crop") return;

    plants.splice(idx, 1);
    harvestedCount++;

    if (userId) await saveGarden(userId, plants.map(p => ({ stage: p.stage, icon: p.icon })), harvestedCount);

    render();
    plantStatus.textContent = "🐞 채소를 수확했어요! 🥕";
    HarvestStatus.update(harvestedCount);

    // 버튼 잠금 (상담 후 쓰레기통으로 드래그 시만 풀리도록)
    canUseGardenAction = false;
    setGardenButtonsState(false);
  }

  // ==================== 시작 ====================
  function startGarden(initialPlants = [], initialHarvested = 0) {
    plants = initialPlants.map(p => {
      let stage = p.stage || "seed";
      let icon = p.icon;
      if (!icon) {
        if (stage === "seed") icon = "🌱";
        else if (stage === "sprout") icon = "🥬";
        else icon = plantIcons.crops[Math.floor(Math.random() * plantIcons.crops.length)];
      }
      return { stage, icon };
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

// 심기 버튼
plantButton.addEventListener("click", async()=>{
  if(!userId) return;
  await Garden.plantSeed(Math.floor(Math.random()*3)+1);
});

// 물 주기 버튼
waterButton.addEventListener("click", async()=>{
  if(!userId) return;
  await Garden.waterPlants();
});


// ============ 민서 - 계란깨기 ===============

// 요소 참조
const eggbreakBtn = document.getElementById("eggbreakBtn");
const eggbreakScreen = document.getElementById("eggbreakScreen");
const introModal = document.getElementById("intro-modal");


document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const selectionScreen = document.getElementById('selection-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const gameScreen = document.getElementById('game-screen');
    const counterElement = document.querySelector('#counter span');
    const eggImage = document.getElementById('egg-image');
    const toolImage = document.getElementById('tool-image');
    const messageElement = document.getElementById('message');
    const eggDisplay = document.getElementById('egg-display');
    const prevEggBtn = document.getElementById('prev-egg');
    const nextEggBtn = document.getElementById('next-egg');
    const toolDisplay = document.getElementById('tool-display');
    const prevToolBtn = document.getElementById('prev-tool');
    const nextToolBtn = document.getElementById('next-tool');

    // 스트레스 뿌셔 버튼
    eggbreakBtn.addEventListener("click", () => {
        mainScreen.style.display = "none";
        gardenScreen.style.display = "none";
        eggbreakScreen.style.display = "block";
        gameContainer.style.display = "block";
    });

    let clickCount = 0;
    let selectedEggIndex = 0;
    let selectedToolIndex = 0;

    // 계란과 도구 이미지 경로 배열
    const eggs = [
    { 
        src: "./images/red_egg.png", 
        alt: "계란 1",
        crackedImages: [
            "./images/red_egg_crack1.png", // 첫 번째 깨지는 단계
            "./images/red_egg_crack2.png", // 두 번째 깨지는 단계
            
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


// 모든 상태를 초기화하는 함수
function resetEggGame() {
    // 1. 상태 변수 초기화
    clickCount = 0;
    selectedEggIndex = 0;
    selectedToolIndex = 0;

    // 2. DOM 요소 초기화
    const selectionScreen = document.getElementById('selection-screen');
    const gameScreen = document.getElementById('game-screen');
    const eggDisplay = document.getElementById('egg-display');
    const toolDisplay = document.getElementById('tool-display');
    const startGameBtn = document.getElementById('start-game-btn');
    const counterElement = document.querySelector('#counter span');
    const messageElement = document.getElementById('message');

    // 화면 초기화
    selectionScreen.style.display = 'block';
    gameScreen.style.display = 'none';
    
   // 버튼 초기화
    startGameBtn.style.display = 'inline-block'; // 버튼 다시 보이게
    startGameBtn.disabled = false;              // 버튼 활성화

    // 이미지 및 버튼 상태 초기화
    eggDisplay.src = eggs[0].src;
    toolDisplay.src = tools[0].src;
    startGameBtn.disabled = false;
    
    // 카운터 및 메시지 초기화
    counterElement.textContent = '0';
    messageElement.textContent = '';
   
    // 선택 인덱스 초기화
    selectedEggIndex = 0;
    selectedToolIndex = 0;
}


// 스트레스 뿌셔 버튼
eggbreakBtn.addEventListener("click", () => {
    mainScreen.style.display = "none";
    gardenScreen.style.display = "none";
    eggbreakScreen.style.display = "block";
    
    // 버튼 클릭 시 게임 상태 초기화 함수 호출
    resetEggGame(); 
});

    
    // 2. 계란 넘기기
    prevEggBtn.addEventListener('click', () => {
        selectedEggIndex = (selectedEggIndex - 1 + eggs.length) % eggs.length;
        eggDisplay.src = eggs[selectedEggIndex].src;
    });

    nextEggBtn.addEventListener('click', () => {
        selectedEggIndex = (selectedEggIndex + 1) % eggs.length;
        eggDisplay.src = eggs[selectedEggIndex].src;
    });

    // 3. 도구 넘기기
    prevToolBtn.addEventListener('click', () => {
        selectedToolIndex = (selectedToolIndex - 1 + tools.length) % tools.length;
        toolDisplay.src = tools[selectedToolIndex].src;
    });

    nextToolBtn.addEventListener('click', () => {
        selectedToolIndex = (selectedToolIndex + 1) % tools.length;
        toolDisplay.src = tools[selectedToolIndex].src;
    });

    // 선택된 이미지 확인 (버튼 활성화)
    function checkSelection() {
        if (selectedEggIndex !== null && selectedToolIndex !== null) {
            startGameBtn.disabled = false;
        }
    }

    // 초기 이미지 로드 및 선택 클래스 추가
    eggDisplay.classList.add('selected');
    toolDisplay.classList.add('selected');
    checkSelection();

    // 4. 게임 시작 버튼
    startGameBtn.addEventListener('click', () => {
        selectionScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        eggImage.src = eggs[selectedEggIndex].src;
        toolImage.src = tools[selectedToolIndex].src;
        // 게임 시작하면 버튼 안 보이게 숨기기
        startGameBtn.style.display = 'none';
    });

    // 5. 계란 클릭 시 이벤트
    eggImage.addEventListener('click', () => {
        if (clickCount >= countStages.explode) return;

        clickCount++;
        counterElement.textContent = clickCount;

        // 도구 애니메이션 실행
        toolImage.style.opacity = 1;
        toolImage.classList.add('tool-animation');
        setTimeout(() => {
            toolImage.classList.remove('tool-animation');
            toolImage.style.opacity = 0;
        }, 200);

        // 계란 깨지는 이미지 변경 로직 수정
    const currentEgg = eggs[selectedEggIndex]; // 현재 선택된 계란 정보 가져오기

    if (clickCount === countStages.crack1) {
        eggImage.src = currentEgg.crackedImages[0]; // 첫 번째 깨진 이미지
    } else if (clickCount === countStages.crack2) {
        eggImage.src = currentEgg.crackedImages[1]; // 두 번째 깨진 이미지
    } 
    // 최종 폭발
    if (clickCount >= countStages.explode) {
        // 계란별 폭발 이미지가 있다면 그걸 사용, 없으면 공통 폭발 이미지 사용
        eggImage.src = finalExplosionImage;
        messageElement.textContent = "스트레스 완전 박살!";
        eggImage.style.cursor = 'default';
    }
    });
});
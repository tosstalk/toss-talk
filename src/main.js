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
  //console.log("saveGarden 호출");
  if(!userId) return;
  const ref = doc(db, "gardens", userId);
  try {
    await setDoc(ref, {
      garden: { plants, harvestedCount },
      lastGardenUse: serverTimestamp()
    }, { merge:true });
    //console.log("Firestore 저장 성공");
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
  "🤬": "화가 많이 났네. 진정하고 말해봐.",
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
  "☺️": [
    "😃 기분 풀려서 다행이야 !", 
    "😁 남은 하루는 기분 좋게 보내!", 
    "​🎧​ AKMU - I Love You",
    "​🎧​ yung kai - blue",
    "​🎧​ Potatoi - 100p",
    "​🎧​ 어반자카파 - 목요일 밤 (feat. 빈지노)",
    "​🎧​ 백예린 - Bunny",
    "​🎧​ Powfu -death bed (feat. Beabadoobee)",
    "​🎧​ Bruno Mars - That's What I Like(PARTYNEXTDOOR Remix)",
    "​🎧​ Vaundy - 踊り子 (Odoriko)"
  ],

  "😌": [
    "☺️ 조금 나아졌다니 다행이다.", 
    "😊 많이 웃고 좋은 생각만 해.", 
    "​🎧​ GongGongGoo009 - 산책",
    "​🎧​ 빈지노 - Nike Shoes (Feat. 다이나믹 듀오)",
    "🎧​ あいみょん(aimyon) - 愛を伝えたいだとか (Ai wo Tsutaetaidatoka)",
    "🎧 경제환 - 니가 돌아올 희망은 없다는 걸 알아",  
    "🎧 죠지 - Boat",
    "🎧 IU - 비밀의 화원",
    "🎧 PATEKO (파테코)  - 떠나",
    "🎧 BIG Naughty (빅나티) - Vancouver"
  ],

  "🙃": [
    "😌 시간이 지나면 천천히 괜찮아질 거야.", 
    "🫠 맛있는 거 먹으러 갔다 와.", 
    "​🎧​ pH-1 - Homebody",
    "🎧​ Fujii Kaze - Shinunoga E-Wa",
    "🎧 IU - 사랑이 잘 (With 오혁)",
    "🎧 PATEKO (파테코) - 널 떠올리는 중이야",
    "🎧 백예린 - 우주를 건너",
    "🎧 TREASURE (트레저) - 병",
    "🎧 GEEKS (긱스) - Officially Missing You",
    "🎧 ABIR - Tango"
  ],

  "❌": [
    "🥺 지금도 힘들구나. 한 숨 푹 자는 건 어때?", 
    "🥹 넌 혼자가 아니야. 우리 또 대화할까?", 
    "​🎧​ Damons year - D16 D17",
    "​🎧​ 백예린  - 0310",
    "​🎧​ Adam Levine -Lost Stars",
    "🎧 ed - Kaution",
    "🎧 수란 - 오늘 취하면",
    "🎧 모트 - 도망가지마",
    "🎧 Xdinary Heroes (엑스디너리 히어로즈) - Night before the end",
    "🎧 Diverseddie - Serenade"
  ]
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


//계란 깨기
// =================================================================
// 1. 전역 변수/상수 (HTML에 직접 연결되는 최상위 요소)
// =================================================================
const eggbreakBtn = document.getElementById("eggbreakBtn");
const eggbreakScreen = document.getElementById("eggbreakScreen");
// mainScreen, gardenScreen은 다른 파일에서 정의되었다고 가정

// =================================================================
// 2. 게임 데이터 및 설정 (상수)
// =================================================================
const EGG_DATA = [
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

const TOOL_DATA = [
    { src: "./images/hammer.png", alt: "망치" },
    { src: "./images/baseball.png", alt: "야구 방망이" },
    { src: "./images/fan.png", alt: "프라이팬" },
    { src: "./images/hand.png", alt: "주먹" }
];
// [변경 1] COUNT_STAGES를 초기 설정 값으로 변경 (상수 -> 변수
const COUNT_RANGES = {
    crack1: { min: 5, max: 15 }, // 1단계 금 (5~15회)
    crack2: { min: 15, max: 25 }, // 2단계 금 (15~25회)
    explode: { min: 30, max: 50 } // 최종 폭발 (30~50회)
};
// [추가] 랜덤하게 계산된 클릭 수치를 저장할 변수
let currentCountStages = {
    crack1: 0,
    crack2: 0,
    explode: 0
};

const FINAL_EXPLOSION_IMAGE = "./images/fire.png";

// =================================================================
// 3. DOMContentLoaded 이벤트 리스너 (DOM 로드 후 실행)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // 3-1. 게임 관련 DOM 요소 그룹화
    const DOM = {
        gameContainer: document.getElementById('game-container'),
        selectionScreen: document.getElementById('selection-screen'),
        startGameBtn: document.getElementById('start-game-btn'),
        gameScreen: document.getElementById('game-screen'),
        counterElement: document.querySelector('#counter span'),
        eggImage: document.getElementById('egg-image'),
        toolImage: document.getElementById('tool-image'),
        eggDisplay: document.getElementById('egg-display'),
        prevEggBtn: document.getElementById('prev-egg'),
        nextEggBtn: document.getElementById('next-egg'),
        toolDisplay: document.getElementById('tool-display'),
        prevToolBtn: document.getElementById('prev-tool'),
        nextToolBtn: document.getElementById('next-tool'),
        eggStatus: document.getElementById('egg-status'),
        // mainScreen, gardenScreen 변수가 여기서도 필요할 수 있으니 추가 (상황에 따라)
        mainScreen: document.getElementById('mainScreen'), 
        gardenScreen: document.getElementById('gardenScreen')
    };

    // 3-2. 게임 상태 변수
    let clickCount = 0;
    let selectedEggIndex = 0;
    let selectedToolIndex = 0;


    // =================================================================
    // 4. 핵심 함수
    // =================================================================

    // 4-1. 선택 완료 확인 및 시작 버튼 활성화
    // [추가] 최소값과 최대값(포함) 사이의 랜덤 정수를 반환하는 함수
    function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    // [추가] 랜덤 클릭 횟수를 계산하여 currentCountStages에 저장하는 함수
     function setRandomCountStages() {
        // 1단계 금: 5~15회
        currentCountStages.crack1 = getRandomIntInclusive(COUNT_RANGES.crack1.min, COUNT_RANGES.crack1.max);

        // 2단계 금: 1단계 금 횟수 + 15~25회 범위
        // 최소값은 (crack1 + 1), 최대값은 (crack1 + crack2.max - crack2.min + 1) 범위를 기준으로 설정
        // 또는 crack1 이후 5~10회 사이로 설정
        const crack2Min = currentCountStages.crack1 + COUNT_RANGES.crack2.min; // 예: 10 + 15 = 25
        const crack2Max = currentCountStages.crack1 + COUNT_RANGES.crack2.max; // 예: 10 + 25 = 35
        currentCountStages.crack2 = getRandomIntInclusive(crack2Min, crack2Max);
        
        // 최종 폭발: 2단계 금 횟수 + 5~10회 사이로 설정 (총 30~50회)
        const explodeMin = currentCountStages.crack2 + (COUNT_RANGES.explode.min - COUNT_RANGES.crack2.min);
        const explodeMax = currentCountStages.crack2 + (COUNT_RANGES.explode.max - COUNT_RANGES.crack2.max);
        // 간편하게: 30~50 범위에서 설정 (crack2보다 무조건 커야 함)
        const finalMin = Math.max(currentCountStages.crack2 + 5, COUNT_RANGES.explode.min);
        const finalMax = COUNT_RANGES.explode.max;
        currentCountStages.explode = getRandomIntInclusive(finalMin, finalMax);

        console.log("새로운 목표 횟수:", currentCountStages); // 개발자 도구 확인용
    }
    function checkSelection() {
        // 이미 selectedEggIndex와 selectedToolIndex가 0으로 초기화되었기 때문에
        // 항상 null이 아니지만, 로직의 안전성을 위해 유지.
        if (selectedEggIndex !== null && selectedToolIndex !== null) {
            DOM.startGameBtn.disabled = false;
        }
    }

    // 4-2. 계란/도구 선택 업데이트 로직 (함수 통합)
    function updateSelection(isEgg, isNext) {
        const data = isEgg ? EGG_DATA : TOOL_DATA;
        const displayElement = isEgg ? DOM.eggDisplay : DOM.toolDisplay;
        let currentIndex = isEgg ? selectedEggIndex : selectedToolIndex;

        if (isNext) {
            currentIndex = (currentIndex + 1) % data.length;
        } else {
            currentIndex = (currentIndex - 1 + data.length) % data.length;
        }

        if (isEgg) selectedEggIndex = currentIndex;
        else selectedToolIndex = currentIndex;

        displayElement.src = data[currentIndex].src;
        checkSelection();
    }

    // 4-3. 게임 리셋 및 화면 전환 (함수 통합)
    function resetEggGame() {
        // 화면 전환
        DOM.mainScreen.style.display = "none";
        DOM.gardenScreen.style.display = "none";
        eggbreakScreen.style.display = "block"; // eggbreakScreen은 전역 변수
        //게임 리셋 시 랜덤 카운트 재설정
        setRandomCountStages();
        // 상태 초기화
        clickCount = 0;
        selectedEggIndex = 0;
        selectedToolIndex = 0;

        // DOM 업데이트
        DOM.selectionScreen.style.display = 'block';
        DOM.gameScreen.style.display = 'none';
        DOM.gameContainer.style.display = "block"; // 컨테이너 표시
        DOM.eggStatus.textContent = "🥚 계란과 도구를 골라줘 🔨";
        DOM.startGameBtn.disabled = false;
        DOM.startGameBtn.style.display = 'inline-block';
        
        // 초기 이미지 설정
        DOM.eggDisplay.src = EGG_DATA[0].src;
        DOM.toolDisplay.src = TOOL_DATA[0].src;
        DOM.counterElement.textContent = '0';
        
        // 초기 선택 상태 설정 (클래스)
        DOM.eggDisplay.classList.add('selected');
        DOM.toolDisplay.classList.add('selected');
        checkSelection();
    }

    // 4-4. 계란 클릭 시 게임 상태 업데이트
    function handleEggClick() {
        if (clickCount >= currentCountStages.explode) return;
        
        clickCount++;
        DOM.counterElement.textContent = clickCount;

        // 도구 애니메이션
        DOM.toolImage.style.opacity = 1;
        DOM.toolImage.classList.add('tool-animation');
        setTimeout(() => {
            DOM.toolImage.classList.remove('tool-animation');
            DOM.toolImage.style.opacity = 0;
        }, 200);

        // 계란 이미지 업데이트
        const currentEgg = EGG_DATA[selectedEggIndex];
        // [수정 3] currentCountStages의 랜덤 값과 비교
          if (clickCount === currentCountStages.crack1) {
            DOM.eggImage.src = currentEgg.crackedImages[0];
            DOM.eggStatus.textContent = "🐣 금 가기 시작했어 ! 🪓";
        } else if (clickCount === currentCountStages.crack2) {
            DOM.eggImage.src = currentEgg.crackedImages[1];
            DOM.eggStatus.textContent = "🐣 거의 다 왔어 ! ⛏️";
        }
        
        // 최종 폭발
        // [수정 4] currentCountStages의 랜덤 값과 비교
        if (clickCount >= currentCountStages.explode) {
            DOM.eggImage.src = FINAL_EXPLOSION_IMAGE;
            DOM.eggStatus.textContent = "🐣 스트레스 완전 박살 ! 💥";
            DOM.eggImage.style.cursor = 'default';
        }
    }


    // =================================================================
    // 5. 이벤트 리스너 연결
    // =================================================================

    // 화면 이동 및 리셋
    eggbreakBtn.addEventListener("click", resetEggGame);

    // 계란 선택 버튼
    DOM.prevEggBtn.addEventListener('click', () => updateSelection(true, false));
    DOM.nextEggBtn.addEventListener('click', () => updateSelection(true, true));

    // 도구 선택 버튼
    DOM.prevToolBtn.addEventListener('click', () => updateSelection(false, false));
    DOM.nextToolBtn.addEventListener('click', () => updateSelection(false, true));

    // 게임 시작 버튼
    DOM.startGameBtn.addEventListener('click', () => {
        DOM.selectionScreen.style.display = 'none';
        DOM.gameScreen.style.display = 'block';
        DOM.eggImage.src = EGG_DATA[selectedEggIndex].src;
        DOM.toolImage.src = TOOL_DATA[selectedToolIndex].src;
        DOM.eggStatus.textContent = "🐣 계란을 마구마구 때려봐 ! 🔨";
        DOM.startGameBtn.style.display = 'none';
    });

    // 계란 클릭 (핵심 플레이)
    DOM.eggImage.addEventListener('click', handleEggClick);
    
    // 초기 설정 실행
    checkSelection(); 
    // [수정 5] DOMContentLoaded 시점에 랜덤 카운트 초기 설정
    setRandomCountStages();
});
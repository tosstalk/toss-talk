// ----------------- Firebase 설정 -----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"; // Firebase 앱 초기화
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"; // Firebase 인증 모듈

// ⚠️ 환경 변수로 Firebase 구성
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, // Firebase API Key
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, // Firebase Auth Domain
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, // Firebase Project ID
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, // Firebase Storage Bucket
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // Firebase Messaging ID
  appId: import.meta.env.VITE_FIREBASE_APP_ID // Firebase App ID
};

const app = initializeApp(firebaseConfig); // Firebase 앱 초기화
const auth = getAuth(app); // Firebase 인증 객체 생성
const provider = new GoogleAuthProvider(); // Google 로그인 제공자 설정

// ----------------- 화면 요소 -----------------
const loginScreen = document.getElementById("loginScreen"); // 로그인 화면 요소
const mainScreen = document.getElementById("mainScreen"); // 메인 화면 요소
const googleLoginBtn = document.getElementById("googleLoginBtn"); // Google 로그인 버튼
const chatBox = document.getElementById("chat"); // 채팅창
const resolveBtn = document.getElementById("resolve-btn"); // 고민 해소 버튼
const input = document.getElementById("input"); // 사용자 입력창
const trash = document.getElementById("trash"); // 쓰레기통 아이콘
const sendBtn = document.getElementById("sendBtn"); // 전송 버튼
const userPhoto = document.getElementById("userPhoto"); // 사용자 프로필 사진
const userName = document.getElementById("userName"); // 사용자 이름
const logoutBtn = document.getElementById("logoutBtn"); // 로그아웃 버튼

// ----------------- 로그인 처리 -----------------
googleLoginBtn.addEventListener("click", async () => { // Google 로그인 버튼 클릭 이벤트
  try {
    const result = await signInWithPopup(auth, provider); // 팝업으로 Google 로그인
    if(result && result.user) handleLogin(result.user); // 로그인 성공 시 handleLogin 호출
  } catch (err) {
    console.error(err); // 오류 로그 출력
    alert("로그인 실패!"); // 알림
  }
});

// 인증 상태 변경 감지
onAuthStateChanged(auth, (user) => {
  user ? handleLogin(user) : handleLogout(); // 로그인 상태에 따라 화면 전환
});

logoutBtn.addEventListener("click", async () => { // 로그아웃 버튼 클릭 이벤트
  await signOut(auth); // Firebase 로그아웃
  handleLogout(); // 화면 전환
});

// ----------------- 로그인/로그아웃 -----------------
function handleLogin(user) { // 로그인 처리 함수
  loginScreen.style.display = "none"; // 로그인 화면 숨김
  mainScreen.style.display = "block"; // 메인 화면 표시
  userName.textContent = user.displayName; // 사용자 이름 표시
  userName.style.display = "inline"; // 사용자 이름 보이기
  if(user.photoURL){
    userPhoto.src = user.photoURL; // 사용자 사진 표시
    userPhoto.style.display = "inline"; // 사진 보이기
  }
  logoutBtn.style.display = "inline"; // 로그아웃 버튼 보이기
  showMoodModal(); // 초기 기분 선택 모달 표시
}

function handleLogout() { // 로그아웃 처리 함수
  loginScreen.style.display = "flex"; // 로그인 화면 표시
  mainScreen.style.display = "none"; // 메인 화면 숨김
  userName.style.display = "none"; // 사용자 이름 숨김
  userPhoto.style.display = "none"; // 사용자 사진 숨김
  logoutBtn.style.display = "none"; // 로그아웃 버튼 숨김
}

// ----------------- 상담 모달 -----------------
let initialMood = ""; // 초기 기분 저장
let resolvedMood = ""; // 해소된 기분 저장
const moodModal = document.getElementById("moodModal"); // 초기 기분 모달
const resolvedModal = document.getElementById("resolvedMoodModal"); // 해소 기분 모달

function showMoodModal() { // 초기 기분 모달 표시
  moodModal.style.display = "flex";
}

// 초기 기분 버튼 클릭 이벤트
moodModal.querySelectorAll(".mood-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    initialMood = btn.textContent; // 선택된 기분 저장
    moodModal.style.display = "none"; // 모달 숨김
    appendMessage(`현재 기분: ${initialMood}`, "user"); // 채팅창에 기분 표시
    appendMessage("무슨 일이 있었나요?", "bot"); // 봇 메시지
  });
});

// ----------------- 상담 후 해소 감정 -----------------
resolveBtn.addEventListener("click", () => { // 고민 해소 버튼 클릭 이벤트
  if(chatBox.children.length === 0) return; // 메시지 없으면 무시
  Array.from(chatBox.children).forEach(m => m.style.display = "none"); // 채팅 메시지 숨김
  resolvedModal.style.display = "flex"; // 해소 모달 표시
});

// 해소된 기분별 메시지 모음
const resolvedMoodMessages = {
  "☺️": ["좋아요! 행복해졌어요 😊", "오늘 기분 최고! 🌞", "웃음이 가득하네요 😄"],
  "😌": ["마음이 편안해졌어요 🕊️", "스트레스가 사라졌어요 🌿", "여유로운 하루네요 🌸"],
  "🙃": ["조금 더 가벼워졌네요 😉", "오늘 하루 괜찮아요 🍀", "미소가 생겼어요 😎"],
  "❌": ["속이 시원하네요 🌀", "모든 걸 털어냈어요 💨", "새로운 마음으로 시작해요 ✨"]
};

// 해소된 기분 버튼 클릭 이벤트
resolvedModal.querySelectorAll(".resolved-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    resolvedMood = btn.dataset.emoji; // 선택된 해소 기분 저장
    resolvedModal.style.display = "none"; // 모달 숨김

    // 포스트잇 생성
    const paper = document.createElement("div");
    paper.className = "paper"; // 클래스 지정
    paper.textContent = `${initialMood} ➡️ ${resolvedMood}`; // 텍스트 설정

    const rect = chatBox.getBoundingClientRect(); // 채팅박스 위치
    paper.style.left = rect.left + rect.width/2 - 100 + "px"; // 화면 중앙 위치
    paper.style.top  = rect.top + rect.height/2 - 70 + "px"; // 화면 중앙 위치
    document.body.appendChild(paper); // 문서에 추가
    makeDraggable(paper); // 드래그 가능하게 설정
    paper.dataset.resolvedMood = resolvedMood; // 데이터 속성에 해소 기분 저장
  });
});

// ----------------- 메시지 -----------------
async function sendMessage() { // 메시지 전송 함수
  const msg = input.value.trim(); // 입력값 가져오기
  if(!msg) return; // 빈 메시지면 종료
  appendMessage(msg, "user"); // 사용자 메시지 표시
  input.value = ""; // 입력창 초기화
  try {
    const res = await fetch("/chat", { // 서버에 메시지 전송
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({message: msg})
    });
    const data = await res.json(); // 서버 응답 파싱
    appendMessage(data.choices[0].message.content, "bot"); // 봇 메시지 표시
  } catch {
    appendMessage("⚠️ AI 응답 실패", "bot"); // 오류 메시지
  }
}

// 채팅창에 메시지 추가 함수
function appendMessage(text, type){
  const div = document.createElement("div"); // div 생성
  div.className = `message ${type}`; // 클래스 지정
  div.textContent = text; // 메시지 내용
  chatBox.appendChild(div); // 채팅창에 추가
  chatBox.scrollTop = chatBox.scrollHeight; // 스크롤 자동 이동
}

// 이벤트 리스너 등록
sendBtn.addEventListener("click", sendMessage); // 전송 버튼 클릭
input.addEventListener("keydown", e => { // Enter 키 전송
  if(e.isComposing) return; // 한글 입력 중이면 무시
  if(e.key==="Enter" && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});

// ----------------- 포스트잇 & 쓰레기통 -----------------
function makeDraggable(elem){ // 포스트잇 드래그 기능
  elem.draggable = true;
  elem.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", null); // 데이터 전송 설정
    e.dataTransfer.setDragImage(elem, 0,0); // 드래그 이미지 설정
    elem.classList.add("dragging"); // 드래그 클래스 추가
  });
  elem.addEventListener("dragend", ()=> elem.classList.remove("dragging")); // 드래그 종료 시 제거
}

// 쓰레기통 드래그 오버 이벤트
trash.addEventListener("dragover", e => e.preventDefault());
trash.addEventListener("drop", e => { // 드롭 이벤트
  e.preventDefault();
  const dragging = document.querySelector(".dragging"); // 드래그 중인 포스트잇
  if(!dragging) return; // 없으면 종료
  const mood = dragging.dataset.resolvedMood; // 해소 기분 가져오기
  dragging.classList.add("crumple"); // 구겨지는 애니메이션
  setTimeout(()=> dragging.remove(), 600); // 일정 시간 후 삭제
  Array.from(chatBox.children).forEach(m => m.remove()); // 채팅 초기화
  const messages = resolvedMoodMessages[mood]; // 해당 기분 메시지 배열
  const randomMsg = messages[Math.floor(Math.random()*messages.length)]; // 랜덤 선택
  alert(randomMsg); // 알림 표시
});

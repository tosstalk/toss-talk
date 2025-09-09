import express from "express"; // Express 프레임워크를 가져와서 서버 구축
import fetch from "node-fetch"; // Node.js 환경에서 fetch 사용을 위해 가져옴
import dotenv from "dotenv"; // .env 파일의 환경 변수를 불러오기 위해 사용

dotenv.config(); // .env 파일 로드 (환경 변수 적용)
const app = express(); // Express 앱 생성
app.use(express.json()); // JSON 요청 본문 파싱 미들웨어 적용
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

// CORS 허용 (Vite 개발 서버 등 다른 출처에서 요청 가능하도록)
import cors from "cors"; // CORS 미들웨어 가져오기
app.use(cors()); // 모든 출처 허용

// true: OpenAI API 사용, false: Ollama 로컬 AI 사용
const USE_OPENAI = false; // 사용할 AI 종류 선택

// POST 요청 라우트 설정: "/chat" 경로
app.post("/chat", async (req, res) => {
  const userMsg = req.body.message || ""; // 요청 본문에서 메시지 가져오기, 없으면 빈 문자열

  // 메시지가 비어 있을 경우 응답
  if (!userMsg) {
    return res.json({
      choices: [
        { message: { role: "assistant", content: "⚠️ 메시지가 비어있습니다." } } // 경고 메시지 반환
      ]
    });
  }

  // USE_OPENAI가 false이면 Ollama 로컬 AI 사용
  if (!USE_OPENAI) {
    // 🔹 Ollama 로컬 AI 호출
    try {
      const response = await fetch("http://localhost:11434/v1/chat/completions", { // 로컬 Ollama 서버 API 호출
        method: "POST", // POST 방식
        headers: { "Content-Type": "application/json" }, // 요청 헤더
        body: JSON.stringify({ // 요청 본문
          model: "gemma:7b", // 사용할 Ollama 모델
          messages: [{ role: "user", content: userMsg }], // 사용자 메시지 전달
          max_tokens: 150 // 최대 토큰 수 제한
        })
      });

      const data = await response.json(); // 응답 JSON 파싱

      // 파싱한 데이터를 클라이언트에 반환
      return res.json({
        choices: [
          { message: { role: "assistant", content: data.choices[0].message.content } } // Ollama 응답 전달
        ]
      });

    } catch (err) {
      console.error(err); // 오류 로그 출력
      return res.status(500).json({
        choices: [
          { message: { role: "assistant", content: "⚠️ Ollama 호출 실패" } } // 오류 메시지 반환
        ]
      });
    }
  }

  // 🔹 OpenAI API 호출 (USE_OPENAI가 true인 경우)
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { // OpenAI API 호출
      method: "POST", // POST 방식
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, // API 키 인증
        "Content-Type": "application/json" // 요청 본문 타입
      },
      body: JSON.stringify({ // 요청 본문
        model: "gpt-3.5-turbo", // 사용할 OpenAI 모델
        messages: [{ role: "user", content: userMsg }], // 사용자 메시지 전달
        max_tokens: 50 // 최대 토큰 수 제한
      })
    });

    const data = await response.json(); // 응답 JSON 파싱
    res.json(data); // 클라이언트에 OpenAI 응답 전달

  } catch (err) {
    console.error(err); // 오류 로그 출력
    res.status(500).json({
      choices: [
        { message: { role: "assistant", content: "⚠️ OpenAI 호출 실패" } } // 오류 메시지 반환
      ]
    });
  }
});

// 서버 실행
app.listen(3000, () => console.log("✅ 서버 실행 중: http://localhost:3000")); // 3000번 포트에서 서버 실행

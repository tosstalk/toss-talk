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
  const userMsg = req.body.message || "";

  // 메시지가 비어 있을 경우
  if (!userMsg) {
    return res.json({
      choices: [
        { message: { role: "assistant", content: "⚠️ 메시지가 비어있습니다." } }
      ]
    });
  }

  try {
    // 🔹 OpenRouter API 호출
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMsg }],
        max_tokens: 150
      })
    });

    const data = await response.json();

    return res.json({
      choices: [
        { message: { role: "assistant", content: data.choices[0].message.content } }
      ]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      choices: [
        { message: { role: "assistant", content: "⚠️ OpenRouter 호출 실패" } }
      ]
    });
  }
});


// 서버 실행
app.listen(3000, () => console.log("✅ 서버 실행 중: http://localhost:3000")); // 3000번 포트에서 서버 실행

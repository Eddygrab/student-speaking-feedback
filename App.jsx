import React, { useMemo, useRef, useState } from "react";

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const DEFAULT_TARGETS = [
  "I like apples.",
  "She goes to school.",
  "There is a cat on the chair.",
  "It has been a while.",
  "I just got back from school."
];

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQJ8dzEyVJq_sPOpoG7uwP331y_C3Q_vl12fRCwLmAEAjEAClG7hd3XR1LH3ARH1EmiA/exec";

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const cleaned = normalize(text);
  return cleaned ? cleaned.split(" ") : [];
}

function compareWords(target, spoken) {
  const targetWords = tokenize(target);
  const spokenWords = tokenize(spoken);

  const missing = [];
  const extra = [];
  const matched = [];
  const used = new Array(spokenWords.length).fill(false);

  for (const word of targetWords) {
    const idx = spokenWords.findIndex((w, i) => !used[i] && w === word);
    if (idx >= 0) {
      used[idx] = true;
      matched.push(word);
    } else {
      missing.push(word);
    }
  }

  spokenWords.forEach((word, i) => {
    if (!used[i]) extra.push(word);
  });

  const exact = normalize(target) === normalize(spoken);
  const scoreBase = targetWords.length || 1;
  const score = Math.max(
    0,
    Math.round(((matched.length - extra.length * 0.3) / scoreBase) * 100)
  );

  return {
    exact,
    matched,
    missing,
    extra,
    score: Math.min(100, score)
  };
}

function buildFeedback(target, spoken) {
  const result = compareWords(target, spoken);

  if (!spoken.trim()) {
    return {
      level: "idle",
      title: "아직 학생 답변이 없습니다.",
      message: "직접 입력하거나 마이크 버튼을 눌러 말하게 해 보세요.",
      ...result
    };
  }

  if (result.exact) {
    return {
      level: "excellent",
      title: "아주 좋아요!",
      message: "목표 문장을 정확하게 말했어요.",
      ...result
    };
  }

  if (result.score >= 80) {
    return {
      level: "good",
      title: "거의 맞았어요.",
      message: "몇 단어만 더 점검하면 됩니다.",
      ...result
    };
  }

  if (result.score >= 50) {
    return {
      level: "retry",
      title: "절반 이상 잘했어요.",
      message: "빠진 단어나 다른 단어를 확인해 보세요.",
      ...result
    };
  }

  return {
    level: "retry",
    title: "다시 한 번 해 보세요.",
    message: "목표 문장을 천천히 보고 다시 말하면 더 좋아요.",
    ...result
  };
}

function speakText(text) {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function App() {
  const [targetsText, setTargetsText] = useState(DEFAULT_TARGETS.join("\n"));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const recognitionRef = useRef(null);

  const targets = useMemo(() => {
    return targetsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }, [targetsText]);

  const currentTarget = targets[selectedIndex] || "";
  const feedback = useMemo(
    () => buildFeedback(currentTarget, spokenText),
    [currentTarget, spokenText]
  );

  const startListening = () => {
    if (!SpeechRecognitionCtor) {
      alert("이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge에서 사용해 보세요.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setSpokenText((finalTranscript || interimTranscript).trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const resetCurrent = () => {
    setSpokenText("");
    setSaveStatus("");
    stopListening();
  };

  const saveRecord = async () => {
    if (!GOOGLE_SCRIPT_URL) {
      alert("App.jsx 안의 GOOGLE_SCRIPT_URL에 Apps Script 웹앱 주소를 넣어 주세요.");
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      className,
      studentName,
      targetText: currentTarget,
      spokenText,
      score: feedback.score,
      level: feedback.level,
      matchedWords: feedback.matched.join(", "),
      missingWords: feedback.missing.join(", "),
      extraWords: feedback.extra.join(", ")
    };

    setIsSaving(true);
    setSaveStatus("저장 중...");

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "저장 실패");

      setSaveStatus("구글 시트에 저장되었습니다.");
    } catch (error) {
      setSaveStatus("저장 실패: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const levelClass = {
    idle: "panel panel-idle",
    excellent: "panel panel-excellent",
    good: "panel panel-good",
    retry: "panel panel-retry"
  }[feedback.level];

  return (
    <div className="page">
      <div className="container">
        <section className="card">
          <h1>학생 영어 말하기 피드백 프로그램</h1>
          <p className="sub">
            단어와 문장을 한 줄씩 넣고, 학생이 말한 내용을 비교해 간단한 피드백을 볼 수 있습니다.
          </p>

          <div className="grid two">
            <div>
              <label>학생 이름</label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="예: 김OO"
              />
            </div>

            <div>
              <label>학급 / 모둠</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="예: 3-2 / A모둠"
              />
            </div>
          </div>

          <div className="field">
            <label>연습 문장 선택</label>
            <select
              value={selectedIndex}
              onChange={(e) => {
                setSelectedIndex(Number(e.target.value));
                setSpokenText("");
                setSaveStatus("");
              }}
            >
              {targets.map((target, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {target}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>문항 목록 수정</label>
            <textarea
              className="big"
              value={targetsText}
              onChange={(e) => setTargetsText(e.target.value)}
              placeholder="한 줄에 단어 또는 문장 하나씩 입력"
            />
            <div className="hint">예: apple / I like apples. / There is a cat on the chair.</div>
          </div>

          <div className="target-box">
            <div>
              <div className="small-title">현재 목표</div>
              <div className="target-text">{currentTarget || "문항을 입력해 주세요."}</div>
            </div>
            <button className="secondary" onClick={() => speakText(currentTarget)}>
              목표 문장 듣기
            </button>
          </div>

          <div className="button-row">
            {!isListening ? (
              <button onClick={startListening}>말하기 시작</button>
            ) : (
              <button className="danger" onClick={stopListening}>듣기 중지</button>
            )}

            <button className="secondary" onClick={resetCurrent}>다시 하기</button>
            <button className="save" onClick={saveRecord} disabled={isSaving}>
              {isSaving ? "저장 중..." : "기록 저장"}
            </button>
          </div>

          <div className="save-status">{saveStatus}</div>

          <div className="field">
            <label>학생 말한 내용(자동 인식 또는 직접 수정)</label>
            <textarea
              value={spokenText}
              onChange={(e) => setSpokenText(e.target.value)}
              placeholder="음성 인식 결과가 여기에 들어옵니다. 필요하면 직접 수정해도 됩니다."
            />
          </div>
        </section>

        <aside className="side">
          <section className={levelClass}>
            <h2>피드백 결과</h2>
            <p className="sub">{studentName ? `${studentName} 학생` : "학생 이름 미입력"}</p>

            <div className="result-title">{feedback.title}</div>
            <div className="result-message">{feedback.message}</div>

            <div className="score-box">
              <div className="small-title">점수</div>
              <div className="score">{feedback.score}점</div>
            </div>

            <div className="feedback-group">
              <div>
                <div className="group-title">잘 말한 단어</div>
                <div className="chips">
                  {feedback.matched.length ? feedback.matched.map((word, idx) => (
                    <span className="chip chip-match" key={idx}>{word}</span>
                  )) : <span className="empty">아직 없음</span>}
                </div>
              </div>

              <div>
                <div className="group-title">빠진 단어</div>
                <div className="chips">
                  {feedback.missing.length ? feedback.missing.map((word, idx) => (
                    <span className="chip chip-missing" key={idx}>{word}</span>
                  )) : <span className="empty">없음</span>}
                </div>
              </div>

              <div>
                <div className="group-title">다르게 말한 단어</div>
                <div className="chips">
                  {feedback.extra.length ? feedback.extra.map((word, idx) => (
                    <span className="chip chip-extra" key={idx}>{word}</span>
                  )) : <span className="empty">없음</span>}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>사용 방법</h2>
            <ol className="guide">
              <li>한 줄에 단어 또는 문장 하나씩 입력합니다.</li>
              <li>학생이 말할 목표 문장을 고릅니다.</li>
              <li>마이크 버튼을 눌러 학생이 영어로 말하게 합니다.</li>
              <li>자동 인식이 부정확하면 텍스트를 직접 고칠 수 있습니다.</li>
              <li>기록 저장 버튼을 누르면 Google Sheets에 남길 수 있습니다.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

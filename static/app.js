const API_BASE = ""; // bo'sh qoldiring — chunki FastAPI o'zi shu sahifani serve qiladi (same-origin)

const state = {
  token: localStorage.getItem("token") || null,
  username: localStorage.getItem("username") || null,
  attemptId: null,
  questions: [],
  currentIndex: 0,
  answers: {},      // question_id -> { choiceId, isCorrect, correctChoiceId }
  isBusy: false,     // javob yuborilayotganda / o'tish animatsiyasida bubble bosilmasin
};

// ---------- Ko'rinishlarni almashtirish ----------
function showView(name) {
  document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
  document.getElementById("view-" + name).classList.remove("hidden");
}

// ---------- API yordamchisi ----------
async function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (state.token) headers["Authorization"] = "Bearer " + state.token;

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401) {
    logout();
    throw new Error("Sessiya tugagan, qaytadan kiring");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Xatolik yuz berdi");
  }
  return res.json();
}

// ---------- Login ----------
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");

  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Kirilmoqda...";

  try {
    const data = await api("/users/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    state.token = data.access_token;
    state.username = username;
    localStorage.setItem("token", state.token);
    localStorage.setItem("username", username);
    enterHome();
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Kirish";
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);
document.getElementById("home-btn").addEventListener("click", enterHome);

// ---------- Login <-> Register almashish ----------
document.getElementById("go-register-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("register-error").textContent = "";
  document.getElementById("register-success").textContent = "";
  showView("register");
});

document.getElementById("go-login-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("login-error").textContent = "";
  showView("login");
});

// ---------- Register ----------
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2").value;
  const errorEl = document.getElementById("register-error");
  const successEl = document.getElementById("register-success");
  const btn = document.getElementById("register-btn");

  errorEl.textContent = "";
  successEl.textContent = "";

  if (password !== password2) {
    errorEl.textContent = "Parollar mos kelmadi";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Yaratilmoqda...";

  try {
    await api("/users/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    successEl.textContent = "Hisob yaratildi. Endi kiring.";
    document.getElementById("register-form").reset();

    setTimeout(() => {
      showView("login");
      document.getElementById("username").value = username;
    }, 900);
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Ro'yxatdan o'tish";
  }
});

function logout() {
  state.token = null;
  state.username = null;
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  showView("login");
}

function enterHome() {
  document.getElementById("home-username").textContent = state.username;
  document.getElementById("home-error").textContent = "";
  showView("home");
}

// ---------- Testni boshlash ----------
document.getElementById("start-test-btn").addEventListener("click", startTest);
document.getElementById("restart-btn").addEventListener("click", startTest);

async function startTest() {
  const errorEl = document.getElementById("home-error");
  const btn = document.getElementById("start-test-btn");
  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Savollar tayyorlanmoqda...";

  try {
    const startData = await api("/attempts/start", { method: "POST" });
    state.attemptId = startData.attempt_id;

    const questions = await api(`/attempts/${state.attemptId}/questions`);
    state.questions = questions;
    state.currentIndex = 0;
    state.answers = {};
    state.isBusy = false;

    renderProgressStrip();
    renderQuestion();
    showView("test");
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Testni boshlash";
  }
}

// ---------- Progress strip (scantron) ----------
function renderProgressStrip() {
  const strip = document.getElementById("progress-strip");
  strip.innerHTML = "";
  state.questions.forEach((q, i) => {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.id = "bubble-" + i;
    bubble.textContent = i + 1;
    bubble.addEventListener("click", () => jumpToQuestion(i));
    strip.appendChild(bubble);
  });
  updateBubbleStates();
}

// har bir bubble'ning rangini state.answers asosida yangilaydi
function updateBubbleStates() {
  state.questions.forEach((q, i) => {
    const bubble = document.getElementById("bubble-" + i);
    if (!bubble) return;
    bubble.classList.remove("current", "correct", "incorrect");

    const answer = state.answers[q.id];
    if (answer) {
      bubble.classList.add(answer.isCorrect ? "correct" : "incorrect");
    }
    if (i === state.currentIndex) {
      bubble.classList.add("current");
    }
  });
}

// bubble bosilganda o'sha savolga o'tish (javob berilganmi yoki yo'qmi — farqi yo'q)
function jumpToQuestion(index) {
  if (state.isBusy) return;
  if (index === state.currentIndex) return;
  state.currentIndex = index;
  renderQuestion();
}

// ---------- Savolni chizish ----------
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function renderQuestion() {
  const q = state.questions[state.currentIndex];
  document.getElementById("question-index").textContent =
    `Savol ${state.currentIndex + 1} / ${state.questions.length}`;
  document.getElementById("question-text").textContent = q.text;

  const list = document.getElementById("choices-list");
  list.innerHTML = "";

  const existingAnswer = state.answers[q.id];

  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<span class="choice-letter">${LETTERS[i] || i + 1}</span><span>${escapeHtml(choice.text)}</span>`;

    if (existingAnswer) {
      // bu savolga oldin javob berilgan — natijani statik ko'rsatamiz, bosilmaydi
      btn.disabled = true;
      if (choice.id === existingAnswer.correctChoiceId) {
        btn.classList.add("is-correct");
      } else if (choice.id === existingAnswer.choiceId) {
        btn.classList.add("is-incorrect");
      } else {
        btn.classList.add("is-muted");
      }
    } else {
      btn.addEventListener("click", () => submitAnswer(q, choice, btn));
    }

    list.appendChild(btn);
  });

  renderFinishButton();
  updateBubbleStates();
}

// barcha savollarga javob berilgan bo'lsa, "Yakunlash" tugmasini ko'rsatadi
function renderFinishButton() {
  let finishBtn = document.getElementById("finish-test-btn");
  const allAnswered = state.questions.length > 0 &&
    state.questions.every((q) => state.answers[q.id]);

  if (allAnswered) {
    if (!finishBtn) {
      finishBtn = document.createElement("button");
      finishBtn.id = "finish-test-btn";
      finishBtn.className = "btn btn-brass btn-block";
      finishBtn.textContent = "Testni yakunlash";
      finishBtn.style.marginTop = "20px";
      finishBtn.addEventListener("click", finishTest);
      document.querySelector(".question-card").appendChild(finishBtn);
    }
  } else if (finishBtn) {
    finishBtn.remove();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Javob yuborish — darrov to'g'ri/noto'g'ri ko'rsatish ----------
async function submitAnswer(question, choice, clickedBtn) {
  if (state.isBusy) return;
  state.isBusy = true;

  const allBtns = document.querySelectorAll(".choice-btn");
  allBtns.forEach((b) => (b.disabled = true));

  try {
    const result = await api(`/attempts/${state.attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({ question_id: question.id, choice_id: choice.id }),
    });

    // javobni state'ga saqlaymiz — keyin shu savolga qaytilsa shundan o'qiladi
    state.answers[question.id] = {
      choiceId: choice.id,
      isCorrect: result.is_correct,
      correctChoiceId: result.correct_choice_id,
    };

    // shtamplash: bosilgan tugma va to'g'ri javobni belgilaymiz
    allBtns.forEach((b) => b.classList.add("is-muted"));
    clickedBtn.classList.remove("is-muted");
    clickedBtn.classList.add(result.is_correct ? "is-correct" : "is-incorrect");

    if (!result.is_correct) {
      const correctIndex = question.choices.findIndex((c) => c.id === result.correct_choice_id);
      if (correctIndex >= 0) {
        allBtns[correctIndex].classList.remove("is-muted");
        allBtns[correctIndex].classList.add("is-correct");
      }
    }

    updateBubbleStates();
    renderFinishButton();

    setTimeout(() => {
      state.isBusy = false;
      goToNextQuestion();
    }, 1100);
  } catch (err) {
    alert(err.message);
    allBtns.forEach((b) => (b.disabled = false));
    state.isBusy = false;
  }
}

// javob berilgandan keyin — navbatdagi JAVOBSIZ savolga o'tadi (tartib bo'yicha, keyin boshidan aylanib)
function goToNextQuestion() {
  const total = state.questions.length;

  for (let step = 1; step <= total; step++) {
    const candidate = (state.currentIndex + step) % total;
    const q = state.questions[candidate];
    if (!state.answers[q.id]) {
      state.currentIndex = candidate;
      renderQuestion();
      return;
    }
  }

  // barcha savollarga javob berilgan
  finishTest();
}

// ---------- Testni yakunlash ----------
async function finishTest() {
  try {
    const result = await api(`/attempts/${state.attemptId}/result`);
    showResult(result);
  } catch (err) {
    // agar /result endpoint ishlamasa, mahalliy hisobdan foydalanamiz
    const values = Object.values(state.answers);
    const correct = values.filter((a) => a.isCorrect).length;
    const total = values.length;
    showResult({
      score: correct,
      total: total,
      percentage: total ? Math.round((correct / total) * 1000) / 10 : 0,
    });
  }
}

function showResult(result) {
  document.getElementById("result-score").textContent = result.score;
  document.getElementById("result-total").textContent = "/ " + result.total;
  document.getElementById("result-percentage").textContent = result.percentage + "%";

  const stamp = document.getElementById("result-stamp");
  const passed = result.percentage >= 60;
  stamp.textContent = passed ? "O'TDI" : "QAYTA URINING";
  stamp.classList.toggle("fail", !passed);

  showView("result");
}

// ---------- Boshlanishda holatni tiklash ----------
if (state.token) {
  enterHome();
} else {
  showView("login");
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// =======================
// Конфигурация Firebase
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyAv4Oet78KIcx_S4l7dlaxKUZ2pfZ5z2iI",
  authDomain: "burgundy-waterfall.firebaseapp.com",
  projectId: "burgundy-waterfall",
  messagingSenderId: "710848092514",
  appId: "1:710848092514:web:130d7467b1ee8337cff43b",
  measurementId: "G-SJM886XS31"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================
// Список админ-аккаунтов
// =======================
const allowedEmails = [
  "101010tatata1010@gmail.com",
  "adminca@gmail.com"
];

// ============================
// ЭЛЕМЕНТЫ ДЛЯ АВТОРИЗАЦИИ
// ============================
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginModal = document.getElementById("loginModal");
const closeModal = document.getElementById("closeModal");
const modalLoginButton = document.getElementById("modalLoginButton");

// ==============================
// РАЗДЕЛ ДЛЯ ПРАВИЛ
// ==============================
const addRuleButton = document.getElementById("addRuleButton");

// ================================
// РАЗДЕЛ ДЛЯ ЗАЯВОК
// ================================
const applicationForm = document.getElementById("applicationForm");
const pendingApplicationsContainer = document.getElementById('pendingApplications');
const approvedApplicationsContainer = document.getElementById('approvedApplications');

// =======================
// ФУНКЦИЯ: показать snackbar
// =======================
function showSnackbar(message) {
  const snackbar = document.getElementById("snackbar");
  if (!snackbar) return;
  snackbar.textContent = message;
  snackbar.className = "show";
  setTimeout(() => {
    snackbar.className = "";
  }, 3000);
}

// =======================
// АВТОРИЗАЦИЯ (логин/логаут)
// =======================

// Открытие модального окна «Войти»
loginButton.addEventListener("click", () => {
  loginModal.style.display = "block";
});

// Закрытие модального окна
closeModal.addEventListener("click", () => {
  loginModal.style.display = "none";
});

// Закрытие модального окна при клике вне его
window.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    loginModal.style.display = "none";
  }
});

// Обработчик логина (через модальное окно)
modalLoginButton.addEventListener("click", () => {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  if (email && password) {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        if (!allowedEmails.includes(email)) {
          alert("Данный аккаунт не имеет прав администратора.");
          signOut(auth);
          return;
        }
        alert("Вы успешно вошли как администратор!");
        loginModal.style.display = "none";
        document.getElementById("adminEmail").value = "";
        document.getElementById("adminPassword").value = "";
      })
      .catch((error) => {
        alert("Ошибка при входе: " + error.message);
      });
  }
});

// Выход
logoutButton.addEventListener("click", () => {
  signOut(auth).then(() => {
    alert("Вы вышли из системы.");
  }).catch((error) => {
    alert("Ошибка при выходе: " + error.message);
  });
});

// =======================
// ОТСЛЕЖИВАНИЕ АУТЕНТИФИКАЦИИ
// =======================
onAuthStateChanged(auth, (user) => {
  const addRuleContainer = document.getElementById('addRuleContainer');

  if (user) {
    // Если есть пользователь
    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";
    if (addRuleContainer) addRuleContainer.style.display = 'block';
    
  } else {
    // Если пользователя нет
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
    if (addRuleContainer) addRuleContainer.style.display = 'none';
  }

  // Загружаем правила и заявки
  loadRules();
  loadApplications();
});

// =======================
// РАБОТА С ПРАВИЛАМИ
// =======================
async function addRule() {
  const newRuleInput = document.getElementById('new-rule');
  if (!newRuleInput) return;

  const newRuleText = newRuleInput.value.trim();
  if (newRuleText && auth.currentUser && allowedEmails.includes(auth.currentUser.email)) {
    try {
      await addDoc(collection(db, "rules"), { text: newRuleText });
      newRuleInput.value = "";
      loadRules();
      showSnackbar("Правило добавлено");
    } catch (e) {
      alert("Ошибка при добавлении правила: " + e.message);
    }
  } else {
    alert("Пожалуйста, войдите с разрешенным адресом для добавления правила.");
  }
}

if (addRuleButton) {
  addRuleButton.addEventListener('click', addRule);
}

async function loadRules() {
  const rulesContainer = document.getElementById('rulesList');
  if (!rulesContainer) return;

  const querySnapshot = await getDocs(collection(db, "rules"));
  rulesContainer.innerHTML = "";
  querySnapshot.forEach((docSnap) => {
    const rule = docSnap.data().text;
    const ruleId = docSnap.id;

    const ruleElement = document.createElement('li');
    ruleElement.classList.add('rule-item');
    const ruleText = document.createElement('p');
    ruleText.textContent = rule;

    if (auth.currentUser && allowedEmails.includes(auth.currentUser.email)) {
      const deleteButton = document.createElement('button');
      deleteButton.textContent = "Удалить";
      deleteButton.classList.add('delete-button');
      deleteButton.onclick = () => deleteRule(ruleId);
      ruleElement.appendChild(ruleText);
      ruleElement.appendChild(deleteButton);
    } else {
      ruleElement.appendChild(ruleText);
    }
    rulesContainer.appendChild(ruleElement);
  });
}

async function deleteRule(id) {
  try {
    await deleteDoc(doc(db, "rules", id));
    loadRules();
    showSnackbar("Правило удалено");
  } catch (e) {
    alert("Ошибка при удалении правила: " + e.message);
  }
}

// ============================
// РАБОТА С ЗАЯВКАМИ
// ============================

// Задержка между отправкой заявок (5 секунд)
let lastSubmissionTime = 0;
const submitDelay = 5000; 

function verifyCaptcha() {
  const recaptchaResponse = grecaptcha.getResponse();
  if (!recaptchaResponse) {
    alert("Пожалуйста, подтвердите, что вы не робот.");
    return false;
  }
  return true;
}

if (applicationForm) {
  applicationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!verifyCaptcha()) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - lastSubmissionTime < submitDelay) {
      alert("Пожалуйста, подождите немного перед отправкой следующей заявки.");
      return;
    }
    lastSubmissionTime = currentTime;

    const roleInput = document.getElementById('role');
    const storyInput = document.getElementById('story');
    if (!roleInput || !storyInput) return;

    try {
      await addDoc(collection(db, "applications"), {
        role: roleInput.value.trim(),
        story: storyInput.value.trim(),
        status: "pending"
      });
      alert("Ваша заявка отправлена и ожидает проверки.");
      roleInput.value = "";
      storyInput.value = "";
      loadApplications();
    } catch (e) {
      alert("Ошибка при отправке заявки: " + e.message);
    }
  });
}

async function loadApplications() {
  if (!pendingApplicationsContainer || !approvedApplicationsContainer) return;

  pendingApplicationsContainer.innerHTML = "";
  approvedApplicationsContainer.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "applications"));
  querySnapshot.forEach((docSnap) => {
    const application = docSnap.data();
    const docId = docSnap.id;
    const role = application.role;
    const story = application.story;
    const status = application.status;

    const applicationElement = document.createElement('div');
    applicationElement.classList.add('application-item');
    applicationElement.innerHTML = `<span>Роль: ${role} | История: ${story}</span>`;

    if (status === "pending" && auth.currentUser) {
      if (allowedEmails.includes(auth.currentUser.email)) {
        const approveButton = document.createElement('button');
        approveButton.textContent = "Одобрить";
        approveButton.onclick = () => approveApplication(docId);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = "Удалить";
        deleteButton.onclick = () => deleteApplication(docId);

        applicationElement.appendChild(approveButton);
        applicationElement.appendChild(deleteButton);
      }
      pendingApplicationsContainer.appendChild(applicationElement);
    } else if (status === "approved") {
      if (auth.currentUser && allowedEmails.includes(auth.currentUser.email)) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "Удалить";
        deleteButton.onclick = () => deleteApplication(docId);
        applicationElement.appendChild(deleteButton);
      }
      approvedApplicationsContainer.appendChild(applicationElement);
    }
  });
}

async function approveApplication(id) {
  try {
    await updateDoc(doc(db, "applications", id), { status: "approved" });
    loadApplications();
  } catch (e) {
    alert("Ошибка при одобрении заявки: " + e.message);
  }
}

async function deleteApplication(id) {
  try {
    await deleteDoc(doc(db, "applications", id));
    loadApplications();
  } catch (e) {
    alert("Ошибка при удалении заявки: " + e.message);
  }
}

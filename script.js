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
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

// =======================
// Конфигурация Firebase
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyAv4Oet78KIcx_S4l7dlaxKUZ2pfZ5z2iI",
  authDomain: "burgundy-waterfall.firebaseapp.com",
  projectId: "burgundy-waterfall",
  storageBucket: "burgundy-waterfall.firebasestorage.app", // Проверьте, что здесь корректное значение
  messagingSenderId: "710848092514",
  appId: "1:710848092514:web:130d7467b1ee8337cff43b",
  measurementId: "G-SJM886XS31"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
// ЭЛЕМЕНТЫ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ
// ==============================
const mediaUploadSection = document.getElementById("mediaUpload");
const uploadForm = document.getElementById("uploadForm");
const mediaFileInput = document.getElementById("mediaFile");
const uploadStatus = document.getElementById("uploadStatus");

// =============================
// ЭЛЕМЕНТЫ ДЛЯ РАБОТЫ С ПРАВИЛАМИ
// =============================
const addRuleButton = document.getElementById("addRuleButton");

// ================================
// ЭЛЕМЕНТЫ ДЛЯ РАБОТЫ С ЗАЯВКАМИ
// ================================
const applicationForm = document.getElementById("applicationForm");
const pendingApplicationsContainer = document.getElementById('pendingApplications');
const approvedApplicationsContainer = document.getElementById('approvedApplications');

// =======================
// АВТОРИЗАЦИЯ (логин/логаут)
// =======================

// Открытие модального окна по клику на "Войти"
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

// Авторизация через модальное окно
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

// ===================================
// ОТСЛЕЖИВАНИЕ АУТЕНТИФИКАЦИИ
// ===================================
onAuthStateChanged(auth, (user) => {
  const addRuleContainer = document.getElementById('addRuleContainer');

  if (user) {
    // Авторизован
    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";

    if (addRuleContainer) {
      addRuleContainer.style.display = 'block';
    }

    // Если пользователь - админ, показываем раздел загрузки медиа
    if (allowedEmails.includes(user.email)) {
      if (mediaUploadSection) {
        mediaUploadSection.style.display = "block";
      }
    } else {
      if (mediaUploadSection) {
        mediaUploadSection.style.display = "none";
      }
    }
  } else {
    // Не авторизован
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";

    if (addRuleContainer) {
      addRuleContainer.style.display = 'none';
    }

    // Скрываем раздел загрузки медиа
    if (mediaUploadSection) {
      mediaUploadSection.style.display = "none";
    }
  }

  // В любом случае подгружаем правила и заявки
  loadRules();
  loadApplications();
});

// ==================================
// ФУНКЦИЯ ЗАГРУЗКИ МЕДИАФАЙЛОВ
// ==================================
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mediaFile = mediaFileInput.files[0];
    if (!mediaFile) return;

    // Ссылка на место хранения в Firebase Storage
    const fileRef = ref(storage, "media/" + mediaFile.name);

    try {
      // Загружаем файл
      const uploadResult = await uploadBytes(fileRef, mediaFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Отображаем ссылку на загруженный файл
      uploadStatus.textContent = `Файл загружен: ${downloadURL}`;
      showSnackbar("Файл успешно загружен!");
    } catch (error) {
      alert("Ошибка при загрузке файла: " + error.message);
    }
  });
}

// =======================
// ДОБАВЛЕНИЕ ПРАВИЛ
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

// Клик по кнопке "Добавить правило"
if (addRuleButton) {
  addRuleButton.addEventListener('click', addRule);
}

// =======================
// ЗАГРУЗКА ПРАВИЛ
// =======================
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

    // Если админ — добавить кнопку Удалить
    if (auth.currentUser && allowedEmails.includes(auth.currentUser.email)) {
      const deleteButton = document.createElement('button');
      deleteButton.textContent = "Удалить";
      deleteButton.classList.add('delete-button');
      deleteButton.onclick = () => deleteRule(ruleId);

      ruleElement.appendChild(ruleText);
      ruleElement.appendChild(deleteButton);
    } else {
      // Простой пользователь — только текст
      ruleElement.appendChild(ruleText);
    }

    rulesContainer.appendChild(ruleElement);
  });
}

// =======================
// УДАЛЕНИЕ ПРАВИЛА
// =======================
async function deleteRule(id) {
  try {
    await deleteDoc(doc(db, "rules", id));
    loadRules();
    showSnackbar("Правило удалено");
  } catch (e) {
    alert("Ошибка при удалении правила: " + e.message);
  }
}

// ======================================================
// РАБОТА С ЗАЯВКАМИ: ЗАГРУЗКА, ДОБАВЛЕНИЕ, ОДОБРЕНИЕ, УДАЛЕНИЕ
// ======================================================

// Задержка между отправкой заявок (5 секунд)
let lastSubmissionTime = 0;
const submitDelay = 5000; 

// Функция для проверки reCAPTCHA
function verifyCaptcha() {
  const recaptchaResponse = grecaptcha.getResponse();
  if (!recaptchaResponse) {
    alert("Пожалуйста, подтвердите, что вы не робот.");
    return false;
  }
  return true;
}

// Обработчик формы заявки
if (applicationForm) {
  applicationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Проверка капчи
    if (!verifyCaptcha()) {
      return;
    }

    // Проверка задержки
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

// Загрузка всех заявок
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
    // Вставляем текст с использованием шаблонных строк
    applicationElement.innerHTML = `<span>Роль: ${role} | История: ${story}</span>`;

    if (status === "pending" && auth.currentUser) {
      // Если заявка в ожидании и пользователь - админ (из allowedEmails)
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
      // Одобренные заявки
      // Можно позволить админам удалять одобренные заявки
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

// Одобрение заявки
async function approveApplication(id) {
  try {
    await updateDoc(doc(db, "applications", id), { status: "approved" });
    loadApplications();
  } catch (e) {
    alert("Ошибка при одобрении заявки: " + e.message);
  }
}

// Удаление заявки
async function deleteApplication(id) {
  try {
    await deleteDoc(doc(db, "applications", id));
    loadApplications();
  } catch (e) {
    alert("Ошибка при удалении заявки: " + e.message);
  }
}

// =========================
// ФУНКЦИЯ showSnackbar (если нужна)
// =========================
function showSnackbar(message) {
  const snackbar = document.getElementById("snackbar");
  if (!snackbar) return;
  snackbar.textContent = message;
  snackbar.className = "show";
  setTimeout(() => {
    snackbar.className = "";
  }, 3000);
}

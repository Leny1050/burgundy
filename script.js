import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAv4Oet78KIcx_S4l7dlaxKUZ2pfZ5z2iI",
  authDomain: "burgundy-waterfall.firebaseapp.com",
  projectId: "burgundy-waterfall",
  storageBucket: "burgundy-waterfall.firebasestorage.app",
  messagingSenderId: "710848092514",
  appId: "1:710848092514:web:130d7467b1ee8337cff43b",
  measurementId: "G-SJM886XS31"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Список разрешённых email-адресов для администраторов
const allowedEmails = [
  "101010tatata1010@gmail.com",
  "adminca@gmail.com"
];

// Элементы для авторизации
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginModal = document.getElementById("loginModal");
const closeModal = document.getElementById("closeModal");
const modalLoginButton = document.getElementById("modalLoginButton");

// Элементы для загрузки медиафайлов
const mediaUploadSection = document.getElementById("mediaUpload");
const uploadForm = document.getElementById("uploadForm");
const mediaFileInput = document.getElementById("mediaFile");
const uploadStatus = document.getElementById("uploadStatus");

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
  if (event.target == loginModal) {
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

// Отслеживание состояния аутентификации
onAuthStateChanged(auth, (user) => {
  if (user && allowedEmails.includes(user.email)) {
    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";
    mediaUploadSection.style.display = "block"; // Показываем раздел загрузки медиа
  } else {
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
    mediaUploadSection.style.display = "none"; // Скрываем раздел загрузки медиа
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

// Функция для загрузки медиафайлов
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mediaFile = mediaFileInput.files[0];
  if (!mediaFile) return;

  // Получаем ссылку на файл в Firebase Storage
  const fileRef = ref(storage, 'media/' + mediaFile.name);

  try {
    // Загружаем файл в Firebase Storage
    const uploadResult = await uploadBytes(fileRef, mediaFile);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Отображаем ссылку на загруженный файл
    uploadStatus.textContent = `Файл загружен: ${downloadURL}`;
    showSnackbar("Файл успешно загружен!");
  } catch (error) {
    alert("Ошибка при загрузке файла: " + error.message);
  }
});

// Функция для показа уведомлений
function showSnackbar(message) {
  const snackbar = document.getElementById("snackbar");
  snackbar.textContent = message;
  snackbar.className = "show";
  setTimeout(() => {
    snackbar.className = "";
  }, 3000);
}

// Функция для добавления правила
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

document.getElementById('addRuleButton').addEventListener('click', addRule);

// Функция для загрузки правил из Firestore
async function loadRules() {
  const querySnapshot = await getDocs(collection(db, "rules"));
  const rulesContainer = document.getElementById('rulesList');
  if (!rulesContainer) return;
  rulesContainer.innerHTML = "";
  querySnapshot.forEach((docSnap) => {
    const rule = docSnap.data().text;
    const ruleElement = document.createElement('li');
    ruleElement.classList.add('rule-item');
    const ruleText = document.createElement('p');
    ruleText.textContent = rule;
    if (auth.currentUser && allowedEmails.includes(auth.currentUser.email)) {
      const deleteButton = document.createElement('button');
      deleteButton.textContent = "Удалить";
      deleteButton.classList.add('delete-button');
      deleteButton.onclick = () => deleteRule(docSnap.id);
      ruleElement.appendChild(ruleText);
      ruleElement.appendChild(deleteButton);
    } else {
      ruleElement.appendChild(ruleText);
    }
    rulesContainer.appendChild(ruleElement);
  });
}

// Функция для удаления правила
async function deleteRule(id) {
  try {
    await deleteDoc(doc(db, "rules", id));
    loadRules();
    showSnackbar("Правило удалено");
  } catch (e) {
    alert("Ошибка при удалении правила: " + e.message);
  }
}

// Функция для добавления заявки
async function addApplication(role, story) {
  try {
    await addDoc(collection(db, "applications"), {
      role: role,
      story: story,
      status: "pending"
    });
    showSnackbar("Заявка отправлена и ожидает проверки.");
  } catch (e) {
    alert("Ошибка при отправке заявки: " + e.message);
  }
}

// Загрузка заявок из Firestore
async function loadApplications() {
  const pendingApplicationsContainer = document.getElementById('pendingApplications');
  const approvedApplicationsContainer = document.getElementById('approvedApplications');
  if (!pendingApplicationsContainer || !approvedApplicationsContainer) return;
  pendingApplicationsContainer.innerHTML = "";
  approvedApplicationsContainer.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "applications"));
  querySnapshot.forEach((docSnap) => {
    const application = docSnap.data();
    const role = application.role;
    const story = application.story;
    const status = application.status;
    const applicationElement = document.createElement('div');
    applicationElement.classList.add('application-item');
    applicationElement.innerHTML = `<span>Роль: ${role} | История: ${story}</span>`;
    if (status === "pending" && auth.currentUser) {
      const approveButton = document.createElement('button');
      approveButton.textContent = "Одобрить";
      approveButton.onclick = () => approveApplication(docSnap.id);
      const deleteButton = document.createElement('button');
      deleteButton.textContent = "Удалить";
      deleteButton.onclick = () => deleteApplication(docSnap.id);
      applicationElement.appendChild(approveButton);
      applicationElement.appendChild(deleteButton);
      pendingApplicationsContainer.appendChild(applicationElement);
    } else if (status === "approved") {
      approvedApplicationsContainer.appendChild(applicationElement);
    }
  });
}

// Функция для одобрения заявки
async function approveApplication(id) {
  try {
    await updateDoc(doc(db, "applications", id), { status: "approved" });
    loadApplications();
  } catch (e) {
    alert("Ошибка при одобрении заявки: " + e.message);
  }
}

// Функция для удаления заявки
async function deleteApplication(id) {
  try {
    await deleteDoc(doc(db, "applications", id));
    loadApplications();
  } catch (e) {
    alert("Ошибка при удалении заявки: " + e.message);
  }
}

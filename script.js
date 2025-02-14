import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAv4Oet78KIcx_S4l7dlaxKUZ2pfZ5z2iI",
  authDomain: "burgundy-waterfall.firebaseapp.com",
  projectId: "burgundy-waterfall",
  storageBucket: "burgundy-waterfall.firebasestorage.app", // Убедитесь, что storageBucket корректен
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

// Отслеживание состояния аутентификации
onAuthStateChanged(auth, (user) => {
  if (user && allowedEmails.includes(user.email)) {
    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";
    if (mediaUploadSection) mediaUploadSection.style.display = "block";  // Показываем форму загрузки
  } else {
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
    if (mediaUploadSection) mediaUploadSection.style.display = "none";  // Скрываем форму загрузки
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

  // Генерируем уникальное имя для файла
  const uniqueName = Date.now() + "_" + mediaFile.name;

  // Создаём ссылку на файл в Firebase Storage
  const fileRef = ref(storage, "media/" + uniqueName);

  try {
    // Загружаем файл в Firebase Storage
    const uploadResult = await uploadBytes(fileRef, mediaFile);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Определяем тип файла (изображение или видео)
    const fileType = mediaFile.type.startsWith("video") ? "video" : "image";

    // Сохраняем информацию о файле в Firestore
    await addDoc(collection(db, "media"), {
      url: downloadURL,
      type: fileType,
      storagePath: "media/" + uniqueName,
      originalName: mediaFile.name,
      createdAt: Date.now()
    });

    uploadStatus.textContent = `Файл загружен: ${downloadURL}`;
    showSnackbar("Файл успешно загружен!");
    loadMedia();  // Обновим галерею

  } catch (error) {
    alert("Ошибка при загрузке файла: " + error.message);
  }
});

// Функция для отображения уведомлений
function showSnackbar(message) {
  const snackbar = document.getElementById("snackbar");
  if (!snackbar) return;
  snackbar.textContent = message;
  snackbar.className = "show";
  setTimeout(() => {
    snackbar.className = "";
  }, 3000);
}

// Функция для загрузки медиа (фото и видео)
async function loadMedia() {
  const mediaGallery = document.getElementById("mediaGallery");
  if (!mediaGallery) return;

  // Очищаем текущую галерею
  mediaGallery.innerHTML = "";

  // Загружаем медиа из Firestore
  try {
    const snapshot = await getDocs(collection(db, "media"));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;

      const mediaItem = document.createElement("div");
      mediaItem.classList.add("media-item");

      // Если это видео, создаём элемент <video>
      if (data.type === "video") {
        const video = document.createElement("video");
        video.src = data.url;
        video.controls = true;
        video.width = 320;
        video.height = 240;
        mediaItem.appendChild(video);
      } else {
        // Если изображение, создаём элемент <img>
        const img = document.createElement("img");
        img.src = data.url;
        img.alt = data.originalName || "Загруженное изображение";
        img.width = 320;
        mediaItem.appendChild(img);
      }

      // Добавляем название файла
      const fileName = document.createElement("p");
      fileName.textContent = data.originalName;
      mediaItem.appendChild(fileName);

      // Если админ, показываем кнопку удаления
      const user = auth.currentUser;
      if (user && allowedEmails.includes(user.email)) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Удалить";
        deleteBtn.addEventListener("click", () => {
          deleteMedia(docId, data.storagePath);
        });
        mediaItem.appendChild(deleteBtn);
      }

      // Добавляем элемент в галерею
      mediaGallery.appendChild(mediaItem);
    });
  } catch (error) {
    console.error("Ошибка при загрузке медиа: ", error);
  }
}

// Функция для удаления медиа
async function deleteMedia(docId, storagePath) {
  try {
    // Удаляем файл из Firebase Storage
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);

    // Удаляем документ из Firestore
    await deleteDoc(doc(db, "media", docId));

    showSnackbar("Медиафайл удалён");
    loadMedia();  // Обновляем галерею
  } catch (error) {
    alert("Ошибка при удалении медиа: " + error.message);
  }
}

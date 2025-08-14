let accessToken = localStorage.getItem("accessToken") || "";
let refreshToken = localStorage.getItem("refreshToken") || "";

if (!accessToken && !refreshToken) { // Если пользователь не в аккаунте, открываем страницу для входа
    const currentPath = window.location.pathname;
    if (currentPath !== "/login") {
        window.location.href = '/login';
    }
}

async function register() {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    const res = await fetch("/api/v1/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        alert("Registration successful! You can now log in.");
    } else {
        alert("Registration failed: " + (data.detail || JSON.stringify(data)));
    }
}


async function login(username, password) {
    const res = await fetch("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        return [res.status, (data.detail || JSON.stringify(data))];
    } else {
        return [res.status, (data.detail || JSON.stringify(data))];
    }
}

// Функция для автоматического обновления access токена
async function refreshAccessToken() {
    if (!refreshToken) {
        alert("No refresh token available. Please log in first.");
        return false;
    }

    const res = await fetch("/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await res.json();
    if (res.ok) {
        accessToken = data.access_token;
        localStorage.setItem("accessToken", accessToken);
        return true;
    } else {
        alert("Refresh failed: " + (data.detail || JSON.stringify(data)));
        return false;
    }
}

// Обёртка для fetch, которая автоматически обновляет токен при 401
async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers["Authorization"] = "Bearer " + accessToken;

    let res = await fetch(url, options);
    if (res.status === 401) {
        // Попытка обновить токен
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Повторяем запрос с новым токеном
            options.headers["Authorization"] = "Bearer " + accessToken;
            res = await fetch(url, options);
        }
    }
    return res;
}

async function getProtected() {
    if (!accessToken) {
        alert("You need to log in first.");
        return;
    }

    const res = await fetchWithAuth("/protected");
    const data = await res.json();
    if (res.ok) {
        document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    } else {
        alert("Failed to fetch protected data: " + (data.detail || JSON.stringify(data)));
    }
}


// В конец body добавляем контейнер для всплывающих окон
document.body.insertAdjacentHTML("beforeend", `
    <style>
        .alertUISystem-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #000000a1;
            display: none;
        }

        .alertUISystem-content {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background-color: #3d3d3d;
            padding: 20px;
            border-radius: 18px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            max-width: 70%;
            min-height: 200px;
            max-height: 90%;
            color: white;
        }

        .alertUISystem-title {
            font-size: 20px;
        }

        .alertUISystem-text {
            font-size: 15px;
            margin-top: 20px;
        }

        .alertUISystem-button {
            position: absolute;
            bottom: 10px;
            background-color: #212121;
            border-radius: 10px;
            color: white;
            border: none;
            padding: 10px;
            right: 30px;
            transition: 0.3s;
            font-size: 15px;
        }

        .alertUISystem-button:hover {
            background-color: rgb(14, 14, 14);
        }

        @media (max-width: 850px) {
            .alertUISystem-content {
                width: 90%;
            }
        }
    </style>
    <div style="z-index: 10000;" class="alertUISystem-container" onclick="closeAlertUISystem()">
    <div class="alertUISystem-content">
      <div class="alertUISystem-title"></div>
      <div class="alertUISystem-text"></div>

      <div style="
        position: absolute;
        width: 100%;
        bottom: 0;
        background-color: transparent;
      ">
        <button class="alertUISystem-button"></button>
      </div>
    </div>
  </div>
`);


async function alertUI(message, description="", buttonText="Подтвердить", callback=null) {
    const container = document.querySelector('.alertUISystem-container');
    const title = document.querySelector('.alertUISystem-title');
    const text = document.querySelector('.alertUISystem-text');
    const button = document.querySelector('.alertUISystem-button');

    container.style.display = 'block';
    title.innerHTML = message;
    text.innerHTML = description;
    button.innerHTML = buttonText;

    if (callback !== null) {
        button.setAttribute("onclick", callback.name + "()");
    }
}

function closeAlertUISystem() {
    const container = document.querySelector('.alertUISystem-container');
    const title = document.querySelector('.alertUISystem-title');
    const text = document.querySelector('.alertUISystem-text');
    const button = document.querySelector('.alertUISystem-button');

    container.style.display = 'none';
    title.textContent = ""
    text.textContent = "";
    button.textContent = "";
    button.removeAttribute("onclick");
}
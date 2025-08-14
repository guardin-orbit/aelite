var globalUserChatId = ""; // ID текущего чата
var globalFirstMessageInChat = true; // Является ли сообщение в чате первым

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');


// Включить блокировку
function lockScroll() {
  document.body.style.overflow = 'hidden';
  // Для старых браузеров
  document.documentElement.style.overflow = 'hidden';
}

// Выключить блокировку
function unlockScroll() {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}




function openSettingsBtnFunc() {
    settingsPanel.style.display = 'block';
    settingsBtn.classList.add('hidden');
    document.body.style.overflow = 'hidden';
}

closeSettingsBtn.addEventListener('click', () => {
settingsPanel.style.display = 'none';
settingsBtn.classList.remove('hidden');
document.body.style.overflow = 'auto';
});

settingsPanel.addEventListener('click', (e) => {
if (e.target === settingsPanel) {
    settingsPanel.style.display = 'none';
    settingsBtn.classList.remove('hidden');
    document.body.style.overflow = 'auto';
}
});

function loadSettings() {
const savedSettings = localStorage.getItem('aeliteSettings');
if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    // Применяем настройки ко всем полям
    document.querySelectorAll('#settingsPanel input').forEach(input => {
    if (settings.hasOwnProperty(input.id)) {
        if (input.type === 'checkbox') {
        input.checked = settings[input.id];
        } else {
        input.value = settings[input.id];
        }
    }
    });
}
}


function saveSettings() {
const settings = {};
// Получаем все input элементы внутри settingsPanel
document.querySelectorAll('#settingsPanel input').forEach(input => {
    if (input.type === 'checkbox') {
    settings[input.id] = input.checked;
    } else {
    settings[input.id] = input.value;
    }
});
localStorage.setItem('aeliteSettings', JSON.stringify(settings));
}



// Вешаем обработчики изменений на все input элементы
document.querySelectorAll('#settingsPanel input').forEach(input => {
input.addEventListener('change', saveSettings);
});

// Загружаем настройки при загрузке страницы
window.addEventListener('DOMContentLoaded', loadSettings);

// Загружаем настройки сразу при выполнении скрипта
loadSettings();

// Затем добавляем обработчики событий
document.querySelectorAll('#settingsPanel input').forEach(input => {
input.addEventListener('change', saveSettings);
});



document.getElementById('docel').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        // Shift+Enter - перенос строки (стандартное поведение)
        if (event.shiftKey) {
            return; // Пропускаем обработку, разрешаем перенос
        }
        // Обычный Enter - отправка сообщения
        else {
            event.preventDefault(); // Блокируем перенос строки
            sendMessage();
        }
    }
});

function sendMessage() {
    const textarea = document.getElementById('docel');
    const message = textarea.value.trim();
    
    if (message) {
        console.log('Отправляем сообщение:', message);
        sendRecognized(message, action="text")
        
        // Очистка поля
        textarea.value = '';
        const event = new Event('input');

        // Инициируем событие
        textarea.dispatchEvent(event);
    }
}

// Функция для добавления сообщения пользователя
function addUserMessage(text) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageDiv.innerHTML = `
        <div>${text}</div>
        <div class="message-time">${time}</div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Для преобразования Markdown ответов AI в HTML для сайта и отображения пользователю
// Регистрируем только самые популярные языки для автоопределения
hljs.registerAliases(['python', 'js', 'javascript', 'typescript', 'html', 'css', 'json', 'bash', 'shell'], 
                   {languageName: 'javascript'});

const markdownConverter = new showdown.Converter({
    ghCodeBlocks: true,
    tables: true,
    strikethrough: true,
    tasklists: true,
    simplifiedAutoLink: true,
    openLinksInNewWindow: true
});

function restoreNewlinesAndFormat(text) {
    // Восстанавливаем переносы перед заголовками (от 1 до 6 # с пробелом после)
    let formatted = text.replace(/(^|\n)(?=[#]{1,6}\s)/g, '$1\n');
    
    // Восстанавливаем переносы строк перед блоками кода
    formatted = formatted.replace(/(```[a-z]*\n)/g, '\n$1');
    
    // Восстанавливаем переносы строк после блоков кода
    formatted = formatted.replace(/(```\n)/g, '$1\n');
    
    // Заменяем одиночные переносы на двойные для лучшей читаемости
    formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
    
    // Убираем лишние пустые строки (более 2 подряд)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Убираем переносы в начале и конце
    formatted = formatted.trim();
    
    return formatted;
}

// Функция для добавления сообщения бота
function addBotMessage(textOriginal) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Сначала преобразуем Markdown в HTML
    const formattedText = restoreNewlinesAndFormat(textOriginal);
    const htmlContent = markdownConverter.makeHtml(formattedText);
    
    // Вставляем HTML в сообщение
    messageDiv.innerHTML = `
        <div class="message-content">${htmlContent}</div>
        <div class="message-time">${time}</div>
    `;
    
    // Добавляем сообщение в DOM
    chatContainer.appendChild(messageDiv);
    
    // Только после вставки в DOM обрабатываем блоки кода
    messageDiv.querySelectorAll('pre code').forEach((block) => {
        // Применяем подсветку
        hljs.highlightElement(block);
        
        // Создаем кнопку копирования
        const pre = block.parentElement;
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Копировать';
        copyBtn.title = 'Копировать в буфер обмена';
        
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(block.textContent)
                .then(() => {
                    copyBtn.textContent = 'Скопировано!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Копировать';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Ошибка копирования: ', err);
                    copyBtn.textContent = 'Ошибка';
                });
        });
        
        pre.style.position = 'relative';
        pre.appendChild(copyBtn);
    });
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Новый код для отслеживания изменения высоты панели ввода
const inputPanel = document.getElementById('inputPanel');
const chatContainer = document.getElementById('chatContainer');
const docelTextarea = document.getElementById('docel');

function updateChatHeight() {
    const panelHeight = inputPanel.offsetHeight;
    document.documentElement.style.setProperty('--input-panel-height', `${panelHeight-200}px`);
}

// Инициализация и отслеживание изменений
updateChatHeight();

// Отслеживаем изменения в textarea
docelTextarea.addEventListener('input', function() {

});

// Отслеживаем изменения размера окна
window.addEventListener('resize', updateChatHeight);

// Отслеживаем изменения DOM (на случай динамического изменения содержимого)
const observer = new MutationObserver(updateChatHeight);
observer.observe(inputPanel, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
});

async function sendEncryptedMessage(message = null, endpoint = "/answer/serverprocessing", method = "POST", json = null) {
    let response;
    const serverAddress = document.getElementById("apiServerEndpoint").value;
    const headers = { "Content-Type": "application/json" };

    console.log("Отправляем зашифрованное сообщение на сервер...");

    try {
        if (method === "GET" || method === "HEAD") {
            response = await fetchWithAuth(serverAddress + endpoint, {
                method,
                headers
            });
        } else {
            const body = message ? JSON.stringify({ message }) :
                         json    ? JSON.stringify(json) :
                                   null;

            response = await fetchWithAuth(serverAddress + endpoint, {
                method,
                headers,
                ...(body ? { body } : {})
            });
        }
    } catch (error) {
        console.error("Произошла ошибка запроса:", error);
        document.getElementById("status").textContent = "Ошибка запроса: " + error;
        return { error: true, exception: error }; // ✅ return
    }

    // ⛔ response не OK — возвращаем статус
    if (!response.ok) {
        const errorText = await response.text(); // на всякий случай, вдруг сервер что-то вернул
        document.getElementById("status").textContent = errorText;
        return { error: true, status: response.status, message: errorText }; // ✅ return
    }

    try {
        const contentLength = response.headers.get('Content-Length');
        const contentType = response.headers.get('Content-Type');

        // Если тело есть и это JSON — парсим
        if (response.status !== 204 && contentLength !== '0' && contentType?.includes("application/json")) {
            const responseData = await response.json();

            if (responseData.message) {
                return responseData.message; // ✅ return
            }

            if (responseData.error) {
                document.getElementById("status").textContent = responseData.error;
                return { error: true, message: responseData.error }; // ✅ return
            }
            return responseData; // ✅ если нет .message, но что-то пришло
        } else {
            return 204; // ✅ явно возвращаем код
        }
    } catch (error) {
        console.error("Ошибка парсинга JSON:", error);
        document.getElementById("status").textContent = "Ошибка парсинга ответа: " + error;
        return { error: true, parseError: true, exception: error }; // ✅ return
    }
}


const config = {
    requireAssistantName: false,
    assistantNames: ['ассистент', 'орбита', 'компьютер'],
    maxTextLength: 3500,
    inactivityTimeout: 6.0,
    recognizedRefreshRate: 0.05,
    inactivityClearTimeout: 10
};

const recbtn = document.getElementById('recbtn');
const docel = document.getElementById('docel');
const status = document.getElementById('status');

// Main Settings
const checkboxSendAiAnswersToNotifications = document.getElementById("checkboxSendAiAnswersToNotifications");
const synthesisWebSpeechApi = document.getElementById('synthWebSpeechApi'); // Использовать ли WebSpeech API

// Settings
const requireAssistantCheckbox = document.getElementById('requireAssistantName');
const assistantNamesInput = document.getElementById('assistantNames');
const maxTextLengthInput = document.getElementById('maxTextLength');
const inactivityTimeoutInput = document.getElementById('inactivityTimeout');
const inactivitySilenceInput = document.getElementById('inactivitySilence');

// AI Settings
const langDockApiKey = document.getElementById('aiLangDockKey');
const langDockApiKeyInitButton = document.getElementById('buttonCheckLangDockKey');
const aiModel = document.getElementById('aiModel');
const aiTemperature = document.getElementById('aiTemperature');
const aiSystemPrompt = document.getElementById('aiSystemPrompt');
const aiMaxChatTokens = document.getElementById('aiMaxChatTokens');
const aiMaxRequestTokens = document.getElementById('aiMaxRequestTokens');
const buttonUpdateAiSettings = document.getElementById('buttonUpdateAiSettings');

// Synthesis Settings
const synthesisUseMode = document.getElementById('synthUseTTSMode');
const synthesisLanguage = document.getElementById('synthLanguage');

// Text Editor
const textEditor = document.getElementById('textEditor');
const textEditorTextarea = document.getElementById('textEditorTextarea')

// Anything Settings
const showPreloadScreensaverCheckbox = document.getElementById('preloadScreensaverState');

let recognition;
let isRecording = false;
let microphoneAccessGranted = false;
let restartTimeout;
let inactivityTimer;
let silenceTimer;
let activationRequired = config.requireAssistantName;
let lastActivationTime = Date.now() / 1000;
let lastFinalTranscript = '';
let lastTranscript = '';
var userGeolocationCountryCity = '';


async function registerLangDockKey() {
    langDockApiKeyInitButton.textContent = "Регистрируем API-ключ...";

    try {
        const result = await sendEncryptedMessage(langDockApiKey.value, "/init");
        console.log("Результат из async:", result);
        if (result) {
            langDockApiKeyInitButton.textContent = "API-ключ зарегистрирован!";
        } else {
            langDockApiKeyInitButton.textContent = "Ошибка при регистрации!";
        }
    } catch (err) {
        console.error("Ошибка при отправке запроса:", err);
        langDockApiKeyInitButton.textContent = "Ошибка при регистрации!";
    }

    setTimeout(() => {
        langDockApiKeyInitButton.textContent = "Зарегестрировать";
    }, 5000);
}


function speak_web_speech_api(text) {
    /**
     * Произносит текст, используя синтез речи.
     * @param {string} text - текст для произношения
     */
    if (!('speechSynthesis' in window)) {
        alert("YOUR WEBVIEW DOES NOT SUPPORT WEBSPEECH API SYNTHESIS. YOU CAN SWITCH TO ANDROID SYNTHESIS IN THE SETTINGS. (C) SLET CORP.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = synthesisLanguage.value;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);
}



function speak(text) {
    texxt = text.replace(/\n/g, ' ');
    if (synthesisWebSpeechApi.checked) { // Если установлен чекбокс использовать WebSpeechAPI
        speak_web_speech_api(text);
        return;
    } else {
        console.log("Выполняем синтез речи через Android Synthesis.");
        try {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = synthesisLanguage.value;
                window.speechSynthesis.speak(utterance);
            } else if (typeof AndroidTTS !== 'undefined' && AndroidTTS.isSupported()) {
                AndroidTTS.speak(text);
            } else {
                alert("YOUR ANDROID DOES NOT SUPPORT ANDROID SYNTHESIS. YOU CAN SWITCH TO WEBSPEECH API SYNTHESIS IN THE SETTINGS. (C) SLET CORP.");
            }
        } catch (e) {
            console.error("Ошибка при синтезе речи через Android Synthesis:", e);
            status.textContent = 'Ошибка при синтезе речи через Android Synthesis.';
            if (typeof AndroidTTS !== 'undefined' && AndroidTTS.isSupported()) {
                AndroidTTS.speak(text); // Last try with native TTS
            }
        }
    }

}


function stopSpeak() {
    // Останавливаем Web Speech API синтез
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    // Останавливаем Android TTS, если доступен
    if (typeof AndroidTTS !== 'undefined' && typeof AndroidTTS.stop === 'function') {
        try {
            speak("  ")
        } catch (e) {
            console.error("Ошибка при остановке Android TTS:", e);
        }
    }
    
    // Можно добавить логирование
    console.log("Озвучка остановлена");
}



// Функция для создания нового чата
async function createNewChat() {
    status.textContent = 'Создаем новый чат...';
    stopSpeak();
    try {
        const result = await sendEncryptedMessage(null, "/chat/create", method="POST", json=null);
        console.log("Результат из async:", result);
        if (result) {
            if (result.startsWith("CHAT_ID=")) {
                const chat_id = result.slice("CHAT_ID=".length);
                console.log("New Chat ID: " + chat_id); // "HelloWorld"
                globalUserChatId = chat_id; // Обновляем глобальную переменную чата
                globalFirstMessageInChat = true;
            } else {
                status.textContent = "Ошибка при создании нового чата! Не удалось получить ID чата из:" + result;
                return 0;
            }
            status.textContent = "Новый чат создан!";
            document.getElementById('chatContainer').innerHTML = ''; // Очистить содержимое чата
            
        } else {
            buttonUpdateAiSettings.textContent = "Ошибка при создании нового чата!";
        }
    } catch (err) {
        console.error("Ошибка при отправке запроса:", err);
        buttonUpdateAiSettings.textContent = "Ошибка при обновлении!";
    }
    
}

async function addNewChatToChatsList(chat_id) {
    const chatList = document.querySelector(".UserChatList");

    // Вставляем HTML-строку в начало списка чатов
    chatList.insertAdjacentHTML(
    "afterbegin",
    `
    <button style="position: relative;" chatid="${chat_id}" class="InLeftPanelBtn">${chat_id}
        <span chatid="${chat_id}" class="chatInChatsListContextMenuBtn"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon" aria-hidden="true"><path d="M15.498 8.50159C16.3254 8.50159 16.9959 9.17228 16.9961 9.99963C16.9961 10.8271 16.3256 11.4987 15.498 11.4987C14.6705 11.4987 14 10.8271 14 9.99963C14.0002 9.17228 14.6706 8.50159 15.498 8.50159Z"></path><path d="M4.49805 8.50159C5.32544 8.50159 5.99689 9.17228 5.99707 9.99963C5.99707 10.8271 5.32555 11.4987 4.49805 11.4987C3.67069 11.4985 3 10.827 3 9.99963C3.00018 9.17239 3.6708 8.50176 4.49805 8.50159Z"></path><path d="M10.0003 8.50159C10.8276 8.50176 11.4982 9.17239 11.4984 9.99963C11.4984 10.827 10.8277 11.4985 10.0003 11.4987C9.17283 11.4987 8.50131 10.8271 8.50131 9.99963C8.50149 9.17228 9.17294 8.50159 10.0003 8.50159Z"></path></svg></span>
    </button>
    `
    );
}

// Функция для добавления нового чата в список чатов
async function createNewChatFull() {
    if (!globalUserChatId) {
        return 0;
    }
    await addNewChatToChatsList(globalUserChatId);

    // Сохраняем все чаты в LocalStorage
    const chats = document.querySelector(".UserChatList").innerHTML;

    localStorage.setItem('savedUserChats', chats);
}


function trackElementCenter(element, callback, threshold = 10) {
  let lastX = null;
  let lastY = null;
  let animationFrameId = null;
  let isActive = true;  // Флаг активности отслеживания

  function getCurrentCenter() {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top + rect.height / 2 + window.scrollY
    };
  }

  function checkPosition() {
    if (!isActive) return;  // Прекращаем если неактивно
    
    const { x, y } = getCurrentCenter();
    
    if (lastX === null || lastY === null) {
      lastX = x;
      lastY = y;
    } else {
      const dx = Math.abs(x - lastX);
      const dy = Math.abs(y - lastY);
      
      if (dx > threshold || dy > threshold) {
        callback({ x, y, dx, dy });
        lastX = x;
        lastY = y;
      }
    }
    
    if (isActive) {  // Проверяем перед новым вызовом
      animationFrameId = requestAnimationFrame(checkPosition);
    }
  }

  checkPosition();

  return function stopTracking() {
    isActive = false;  // Сначала устанавливаем флаг
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}


var globalDeleteChatId = null;


async function deleteChatFunc() {
    alertUI("Вы уверены, что хотите удалить чат?", "<span style='color: #ff2400;'>У вас больше не будет возможности восстановления истории чата.</span>", "Удалить", deleteChatFullFunc);
}

// Получаем контейнер с кнопками
const userChatListContainer = document.querySelector('.UserChatList');

async function deleteChatFullFunc() {
    console.log("Удаляем чат: " + globalDeleteChatId);

    try {
        const result = await sendEncryptedMessage(message=null, "/chat/delete/" + globalDeleteChatId, method="DELETE", json=null);
        console.log("Результат из async:", result);
        if (result) {
            status.textContent = "Чат успешно удалён!";

            userChatListContainer.querySelector(`button[chatid="${globalDeleteChatId}"]`).remove();
            localStorage.setItem('savedUserChats', userChatListContainer.innerHTML);

            createNewChat();
        } else {
            status.textContent = "Ошибка при удалении чата!";
        }
    } catch (err) {
        console.error("Ошибка при отправке запроса на удаление чата:", err);
        status.textContent = "Ошибка при удалении чата!";
    }
}





userChatListContainer.addEventListener('click', async function(event) {
    // Проверяем, был ли клик по самому button или его внутренностям
    const button = event.target.closest('button.InLeftPanelBtn');
    const span = event.target.closest('span.chatInChatsListContextMenuBtn');
    
    if (span) {
        // Клик именно по span (иконке меню)
        event.stopPropagation(); // Останавливаем всплытие
        const chatId = span.getAttribute('chatid');
        console.log('Клик по иконке меню, chatid: ' + chatId);
        
        globalDeleteChatId = chatId;

        // Получаем размеры и позицию элемента
        const rect = span.getBoundingClientRect();

        // Вычисляем центр элемента по X и Y
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const contextMenu = document.querySelector('.chatsListContextMenu');

        // Перемещаем элемент в центр
        contextMenu.style.left = `${centerX}px`;
        contextMenu.style.top = `${centerY}px`;
        
        contextMenu.style.display = 'block';
            contextMenu.animate([
                { top: String(centerY + 20) + 'px', opacity: 0},
                { top: String(centerY) + 'px', opacity: 1},
            ], {
                duration: 200,
                iterations: 1,
                easing: 'ease-in-out' // плавность движения
        });

        function closeContextMenu() {
            document.removeEventListener('click', handleClickForCloseMenu); // Удаляем обработчик
            contextMenu.style.display = 'none';
        }

        function handleClickForCloseMenu(event) {
            closeContextMenu();
        }

        // Добавляем обработчик, чтобы при клике в люобе место контекстное меню закрывалось
        document.addEventListener('click', handleClickForCloseMenu);

        const stopTracking = trackElementCenter(
        span,
        ({ x, y }) => {
            console.log('Центр изменился:', x, y);
            stopTracking();
            closeContextMenu();
        }, 10 // Порог в пикселях
        );

        return;
    }
    
    if (button) {
        // Клик по button (но не по span внутри)
        const chatId = button.getAttribute('chatid');
        console.log('Клик по кнопке чата, chatid:', chatId);
        await handleButtonClick(chatId);
    }
});


async function handleButtonClick(chatId) { // Получаем историю чата по его ID
    // Ваша логика обработки клика
    try {
        const result = await sendEncryptedMessage(message=null, "/chat/history/" + chatId , method="GET", json=null);
        console.log("История чата с сервера:", result);
        if (result) {
            document.getElementById('chatContainer').innerHTML = ''; // Очистить содержимое чата
            let parse = new Function(`return ${result}`);
            let messages = parse();

            // Обработка каждого сообщения
            messages.forEach(message => {
            // Извлекаем текст сообщения из content
            const contentParts = message.content.split('[user_message]\n');
            const messageText = contentParts.length > 1 ? contentParts[1] : message.content;
            
            // В зависимости от роли вызываем соответствующую функцию
            if (message.role === 'assistant' || message.role === 'assistant') {
                if (messageText.startsWith("message")) {
                    addBotMessage(messageText.slice("message ".length));
                }
            } else if (message.role === 'user') {
                if (!messageText.startsWith("[automatic_system]")) {
                    addUserMessage(messageText);
                }
            }
            });

            globalUserChatId = chatId;
            status.textContent = "Чат открыт";
        } else {
            langDockApiKeyInitButton.textContent = "Ошибка при открытии чата! Невалидный/несуществующий ответ сервера!";
        }
    } catch (err) {
        console.error("Ошибка при отправке запроса:", err);
        status.textContent = "Ошибка при открытии чата! Не удалось отправить запрос!";
    }
}


// При открытии страницы загружаем чаты из localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedValue = localStorage.getItem('savedUserChats');
    if (savedValue) {
        console.log("savedValue: " + savedValue);
        document.querySelector(".UserChatList").innerHTML = savedValue;
    }
});


function openSystemPromptEditor() {
    // Запуск окна для редактирования системного промпта
    textEditor.style.display = "block";
    // Заменяем \n на настоящие переносы строк
    textEditorTextarea.value = aiSystemPrompt.value.replace(/\\n/g, '\n');
    textEditorTextarea.focus();
}


function cancelSystemPromptEditor() {
    // Обработчик для кнопки отмена в редакторе
    textEditor.style.display = "none";
    textEditorTextarea.value = "";
}


function saveSystemPromptEditor() {
    // Сохраняем значение из textarea в input, заменяя переносы строк на \n
    aiSystemPrompt.value = textEditorTextarea.value.replace(/\n/g, '\\n');
    textEditor.style.display = "none";
    saveSettings(); // Сохраняем изменения в localStorage
}

function getLocation() {
    if (!navigator.geolocation) {
        console.log("Геолокация не поддерживается браузером");
        status.textContent = "Геолокация не поддерживается браузером";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`Координаты: ${latitude}, ${longitude}`);

        // Обратный геокодинг через Nominatim
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

        try {
        const response = await fetch(url);
        const data = await response.json();

        const address = data.address || {};
        const country = address.country || "Неизвестно";
        const city = address.city || address.town || address.village || "Неизвестно";

        let res = `Страна: ${country} Город: ${city}`
        console.log(res);
        userGeolocationCountryCity = res;
        sendNotification("Геолокация обновлена! " + userGeolocationCountryCity);

        } catch (error) {
        console.log("Ошибка при определении адреса", error);
        }
    }, (error) => {
        console.log("Ошибка геолокации", error.message);
    });
    }


async function updateAiSettings() {
    /*
    Обновление настроек AI
    */
    buttonUpdateAiSettings.textContent = "Применяем настройки...";

    let spliter = "A65BB6###"
    let allData = aiModel.value + spliter + aiSystemPrompt.value + spliter + aiTemperature.value + spliter + aiMaxChatTokens.value + spliter + aiMaxRequestTokens.value;
    console.log("Отправляемые данные: " + allData)
    try {
        const result = await sendEncryptedMessage(allData, "/update");
        console.log("Результат из async:", result);
        if (result) {
            buttonUpdateAiSettings.textContent = "Данные успешно обновлены!";
        } else {
            buttonUpdateAiSettings.textContent = "Ошибка при обновлении!";
        }
    } catch (err) {
        console.error("Ошибка при отправке запроса:", err);
        buttonUpdateAiSettings.textContent = "Ошибка при обновлении!";
    }

    setTimeout(() => {
        buttonUpdateAiSettings.textContent = "Применить изменения";
    }, 5000);
}


function init() {
    /*
    requireAssistantCheckbox.checked = config.requireAssistantName;
    assistantNamesInput.value = config.assistantNames.join(', ');
    maxTextLengthInput.value = config.maxTextLength;
    inactivityTimeoutInput.value = config.inactivityTimeout;
    */

    requireAssistantCheckbox.addEventListener('change', updateConfig);
    assistantNamesInput.addEventListener('change', updateConfig);
    maxTextLengthInput.addEventListener('change', updateConfig);
    inactivityTimeoutInput.addEventListener('change', updateConfig);

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    status.textContent = 'Ваш браузер не поддерживает распознавание речи.';
    recbtn.disabled = true;
    return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ru-RU';
    recognition.maxAlternatives = 1;

    setupRecognitionHandlers();
    //startRecording(); Отключаем автозапуск записи

    getLocation(); // Получаем геолокацию
}

function findAiName(text, keywords) {
    const lowerText = text.toLowerCase();
    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        const index = lowerText.indexOf(lowerKeyword);
        if (index !== -1) {
            // Возвращаем текст, начиная с ключевого слова
            return text.slice(index).trim();
        }
    }
    return null;
}


function splitNamesToArray(inputString) {
    // Удаляем пробелы в начале и конце строки
    const trimmedString = inputString.trim();
    
    // Если строка пустая, возвращаем пустой массив
    if (!trimmedString) {
        return [];
    }
    
    // Разделяем строку по запятым, затем удаляем лишние пробелы вокруг каждого элемента
    const items = trimmedString.split(',').map(item => item.trim());
    
    // Фильтруем пустые элементы (на случай, если были запятые без текста между ними)
    return items.filter(item => item.length > 0);
}


// Прокручивать вправо до конца
function scrollToRight() {
    status.scrollLeft = status.scrollWidth;
}

if (window.innerWidth <= 1100) {
    // Наблюдатель за изменениями содержимого
    const observerStatus = new MutationObserver(scrollToRight);

    observerStatus.observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
    });
}

// Отправка уведомлений на Android (для получения ответа через уведомления, а не приложение)
function sendNotification(text) {
    if (window.AndroidNotify && AndroidNotify.notify) {
        AndroidNotify.notify("AElite", text);
    } else {
        status.textContent = "Уведомления не поддерживаются.";
        console.log("Уведомления не поддерживаются.");
    }
}

async function sendRecognized(message, action="audio"/* action это источник текста. Либо audio либо text. Если text значит сообщение пришло из чата */) {
    if (globalFirstMessageInChat) {
        if (!globalUserChatId) {
            await createNewChat();
        }
    }

    if (action == "audio") {
        if (requireAssistantCheckbox.checked) {
            keywords = splitNamesToArray(assistantNamesInput.value); // Переводим строку в массив
            if (!keywords) {
                console.log('Ключевые слова не заданы!');
                return;
            }
            var text = findAiName(message, keywords);
        } else {
            var text = message;
        }
    } else {
        var text = message;
    }
    
    if (text == null || !String(text).trim()) {
        console.log('Сообщение не содержит ключевых слов или пустое.');
        return;
    }
    
    console.log('Получен текст:', text);
    
    docel.value = ''; // Очищаем текстовое поле
    var was_record_stopped = false;
    if (isRecording) {
        recbtn.click(); // Останавливаем запись если она идет
        was_record_stopped = true;
    }
    
    addUserMessage(text);

    console.log("Шифруем и отправляем сообщение на сервер");
    
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const time = `${hours}:${minutes}:${seconds}`;

    console.log(userGeolocationCountryCity)

    let final_text = "[meta_data]\n" + time + "\n" + userGeolocationCountryCity + "\nmethod: " + action + "\nНе забывай использовать message, иначе пользователь не увидт твоего сообщения\n[user_message]\n" + text;

    console.log("Финальный запрос с метеданными:", final_text);

    // Функция для обработки автовоспроизведения
    function playAudio() {
        const audio = new Audio('/static/main/notif.mp3');
        
        // Начинаем с muted, так как некоторые браузеры требуют этого
        audio.muted = true;
        
        // Пытаемся воспроизвести
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Воспроизведение началось успешно
                audio.muted = false; // Теперь можно включить звук
            })
            .catch(error => {
                // Если автоматическое воспроизведение не сработало
                console.warn("Autoplay prevented, showing play button");
            });
        }
    }
    playAudio(); // Воспроизводим звук об отправке

    status.textContent = 'Отправка...';
    sendEncryptedMessage(message=null, endpoint="/answer/serverprocessing", method="POST", json={message: final_text, chatId: globalUserChatId}).then(result_black => {
        result = result_black;
        console.log(result)
        addBotMessage(result);

        status.textContent = 'Ответ получен!';

        const doc = new DOMParser().parseFromString(result, 'text/html');
        const text_without_html = doc.body.textContent; // Удаляем HTML

        if (synthesisUseMode.checked) {
            setTimeout(() => {
                function removeEmojis(text) {
                    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '');
                }

                speak(removeEmojis(text_without_html)) // Озвучиваем ответ ИИ
                if (was_record_stopped) {
                    if (!isRecording) {
                        recbtn.click()
                    }
                }
            }, 100);
        }
        if (checkboxSendAiAnswersToNotifications.checked) {
            sendNotification(text_without_html); // Отправляем ответ ИИ в уведомления
        }

        if (globalFirstMessageInChat) {
            createNewChatFull()
            globalFirstMessageInChat = false;
        }
    }).catch(err => {
        console.error("Ошибка при отправке запроса:", err);
        speak("Ошибка!")
    });
}

function updateConfig() {
    config.requireAssistantName = requireAssistantCheckbox.checked;
    config.assistantNames = assistantNamesInput.value.split(',').map(x => x.trim()).filter(Boolean);
    config.maxTextLength = parseInt(maxTextLengthInput.value) || 3500;
    config.inactivityTimeout = parseFloat(inactivityTimeoutInput.value) || 6.0;
    activationRequired = config.requireAssistantName;
    resetInactivityTimer();
}

function setupRecognitionHandlers() {
    recognition.onstart = () => {
    status.textContent = 'Запись начата... Говорите.';
    isRecording = true;
    recbtn.classList.add('recording');
    microphoneAccessGranted = true;
    };

    recognition.onend = () => {
    if (isRecording && microphoneAccessGranted) {
        restartTimeout = setTimeout(() => {
        try {
            recognition.start();
        } catch (e) {
            console.error('Ошибка при перезапуске:', e);
            stopRecording();
        }
        }, 300);
    }
    };

    recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();

        if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        } else {
        interimTranscript += transcript + ' ';
        }
    }

    status.textContent = interimTranscript.trim();

    if (finalTranscript) {
        finalTranscript = finalTranscript.trim();

        if (finalTranscript === lastFinalTranscript) return;
        lastFinalTranscript = finalTranscript;

        docel.value += finalTranscript + '\n';
        if (docel.value.length > config.maxTextLength) {
        docel.value = '';
        status.textContent = 'Текст очищен из-за переполнения';
        }

        // Очищаем предыдущий таймер
        clearTimeout(silenceTimer);
        
        // Запоминаем последний распознанный текст
        lastTranscript = finalTranscript;
        
        // Устанавливаем новый таймер
        silenceTimer = setTimeout(() => {
            if (config.requireAssistantName) {
                const recognized = findAfterAnyKeyword(lastTranscript, config.assistantNames);
                if (recognized) {
                    if (activationRequired) {
                        activationRequired = false;
                        lastActivationTime = Date.now() / 1000;
                        resetInactivityTimer();
                        sendRecognized(recognized);
                    } else {
                        lastActivationTime = Date.now() / 1000;
                        resetInactivityTimer();
                        sendRecognized(lastTranscript);
                    }
                }
            } else {
                sendRecognized(lastTranscript);
            }
        }, inactivitySilenceInput.value); // Ждем неактивности перед отправкой (например 1 секунда тишины, значит пользователь договорил)
    }
    };

    recognition.onerror = (event) => {
    console.error('Ошибка распознавания:', event.error);

    if (event.error === 'not-allowed') {
        microphoneAccessGranted = false;
        status.textContent = 'Доступ к микрофону запрещен.';
        stopRecording();
    } else if (event.error === 'no-speech') {
        status.textContent = 'Готов к записи... Говорите.';
    } else {
        status.textContent = 'Ошибка: ' + event.error;
    }
    };
}

function startRecording() {
    try {
    recognition.start();
    } catch (e) {
    console.error('Ошибка запуска:', e);
    status.textContent = 'Ошибка запуска распознавания.';
    microphoneAccessGranted = false;
    }
}

function stopRecording() {
    isRecording = false;
    clearTimeout(restartTimeout);
    clearTimeout(silenceTimer);
    try {
    recognition.stop();
    } catch (e) {
    console.error('Ошибка остановки:', e);
    }
    status.textContent = 'Запись остановлена';
    recbtn.classList.remove('recording');
}

function resetInactivityTimer() {
    if (!config.requireAssistantName) return;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
    activationRequired = true;
    console.log('Таймаут. Снова требуется имя ассистента.');
    }, config.inactivityTimeout * 1000);
}

function findAfterAnyKeyword(text, keywords) {
    const lowerText = text.toLowerCase();
    for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);
    if (index !== -1) {
        return text.slice(index).trim();
    }
    }
    return null;
}

recbtn.addEventListener('click', () => {
    if (isRecording) {
    stopRecording();
    } else {
    startRecording();
    }
});

window.addEventListener('beforeunload', () => {
    stopRecording();
});

window.addEventListener('DOMContentLoaded', init);


class KeyboardShortcuts {
constructor() {
    this.shortcuts = {};
    this.modifiers = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
    };
    
    this.init();
}

init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
}

handleKeyDown(e) {
    // Обновляем состояние модификаторов
    this.updateModifiers(e);
    
    // Проверяем комбинации
    this.checkShortcuts(e);
}

handleKeyUp(e) {
    // Обновляем состояние модификаторов
    this.updateModifiers(e, true);
}

updateModifiers(e, isKeyUp = false) {
    this.modifiers = {
    ctrl: isKeyUp ? false : e.ctrlKey,
    shift: isKeyUp ? false : e.shiftKey,
    alt: isKeyUp ? false : e.altKey,
    meta: isKeyUp ? false : e.metaKey
    };
}

checkShortcuts(e) {
    const key = e.code.toLowerCase();  // Используем code вместо key

    for (const [combo, handler] of Object.entries(this.shortcuts)) {
        const [modifiers, keyName] = this.parseCombo(combo);

        if (key === keyName.toLowerCase() && this.checkModifiers(modifiers)) {
            e.preventDefault();
            handler();
            break;
        }
    }
}

parseCombo(combo) {
    const parts = combo.split('+');
    const key = parts.pop();
    return [parts, key];
}

checkModifiers(requiredModifiers) {
    return requiredModifiers.every(mod => this.modifiers[mod]);
}

// Публичный метод для добавления комбинаций
addShortcut(combo, callback) {
    this.shortcuts[combo.toLowerCase()] = callback;
}
}

// Использование:
const shortcuts = new KeyboardShortcuts();

// Добавляем комбинации
shortcuts.addShortcut('ctrl+quote', () => { // ctrl+' для фокуса на поле ввода
    docel.focus();
});

shortcuts.addShortcut('ctrl+keyn', () => { // ctrl+n для нового чата
    createNewChat();
    if (checkboxSendAiAnswersToNotifications.checked) {
        sendNotification("Создан новый чат!");
    }
});

shortcuts.addShortcut('f1', () => { // f1 для начала голосового ввода
    if (!isRecording) {
        recbtn.click(); // Запуск записи
    }
});

shortcuts.addShortcut('escape', () => { // esc для остановки записи или для остановки голосового ввода
    if (isRecording) {
        recbtn.click(); // Остановка записи
    }
    stopSpeak(); // Остановка озвучки
});

shortcuts.addShortcut('ctrl+f2', () => { // f2 для включения/выключения функции озвучки ответа AI
    if (synthesisUseMode.checked) {
        synthesisUseMode.checked = false;
        if (checkboxSendAiAnswersToNotifications.checked) {
            sendNotification("Выключен режим озвучки!");
        }
    } else {
        synthesisUseMode.checked = true;
        if (checkboxSendAiAnswersToNotifications.checked) {
            sendNotification("Включен режим озвучки!");
        }
    }
});

shortcuts.addShortcut('ctrl+f3', () => { // f3 для включения/выключения функции отправки ответа AI в уведомления
    if (checkboxSendAiAnswersToNotifications.checked) {
        checkboxSendAiAnswersToNotifications.checked = false;
        if (synthesisUseMode.checked) {
            speak("Выключен режим уведомлений!");
        }
        sendNotification("Выключен режим уведомлений!");
    } else {
        checkboxSendAiAnswersToNotifications.checked = true;
        if (synthesisUseMode.checked) {
            speak("Включен режим уведомлений!");
        }
    }
});

var globalPositionEconomyMode = false;

shortcuts.addShortcut('ctrl+delete', () => { // ctrl+delete для включения/выключения энергоэкономии и защиты от случайных касаний
    if (globalPositionEconomyMode) {
        AndroidBlocker.disableBlocker();
    } else {
        AndroidBlocker.enableBlocker();
    }
    globalPositionEconomyMode = !globalPositionEconomyMode;
});

shortcuts.addShortcut('ctrl+keyl', () => { // ctrl+l для получения промежуточного результата ввода пользователя
    sendNotification(docel.value);
});

shortcuts.addShortcut('ctrl+keyg', () => { // ctrl+g для получения местоположения пользователя (страна, город)
    getLocation();
});


    // Перехватываем стандартные методы console
    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    };
    
    const consoleMessages = [];
    
    // Функция для перехвата сообщений консоли
    function interceptConsole(method, className) {
        return function() {
            // Сохраняем оригинальное сообщение
            originalConsole[method].apply(console, arguments);
            
            // Форматируем аргументы в строку
            const args = Array.from(arguments).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return arg;
            }).join(' ');
            
            // Сохраняем сообщение
            consoleMessages.push({
                type: method,
                message: args,
                timestamp: new Date().toISOString()
            });
            
            // Обновляем консоль, если она открыта
            if (document.getElementById('consoleModal').style.display === 'block') {
                updateConsoleView();
            }
        };
    }
    
    // Переопределяем методы console
    console.log = interceptConsole('log', 'log');
    console.info = interceptConsole('info', 'info');
    console.warn = interceptConsole('warn', 'warn');
    console.error = interceptConsole('error', 'error');
    
    // Функции для открытия/закрытия консоли
    function openConsole() {
        document.getElementById('consoleModal').style.display = 'block';
        updateConsoleView();
    }
    
    function closeConsole() {
        document.getElementById('consoleModal').style.display = 'none';
    }
    
    // Обновление содержимого консоли
    function updateConsoleView() {
        const consoleContent = document.getElementById('consoleContent');
        consoleContent.innerHTML = '';
        
        consoleMessages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `console-message ${msg.type}`;
            
            const timestamp = document.createElement('span');
            timestamp.textContent = `[${new Date(msg.timestamp).toLocaleTimeString()}] `;
            timestamp.style.color = '#888';
            
            const message = document.createElement('span');
            message.textContent = msg.message;
            
            div.appendChild(timestamp);
            div.appendChild(message);
            consoleContent.appendChild(div);
        });
        
        // Автопрокрутка вниз
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }

    document.getElementById('sendBtn').addEventListener('click', sendMessage);


// Проверяем ширину экрана
if (window.innerWidth <= 1100) {
  let touchStartX = 0;
  let touchEndX = 0;
  
  // Минимальная длина свайпа для срабатывания (в пикселях)
  const SWIPE_THRESHOLD = 50;

  // Функции для разных свайпов (замените на свои)
  function onSwipeLeft() {
    console.log('Свайп влево!');
    closeLeftPanel();
  }
  
  function onSwipeRight() {
    console.log('Свайп вправо!');
    openLeftPanel();
  }

  // Обработчики событий
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  // Определение направления свайпа
  function handleSwipe() {
    const difference = touchStartX - touchEndX;
    
    if (Math.abs(difference) < SWIPE_THRESHOLD) return;
    
    if (difference > 0) {
      onSwipeLeft();
    } else {
      onSwipeRight();
    }
  }

  // Для десктопов (если нужно)
  document.addEventListener('mousedown', (e) => {
    touchStartX = e.screenX;
  });

  document.addEventListener('mouseup', (e) => {
    touchEndX = e.screenX;
    handleSwipe();
  });
}


document.querySelector('.leftPanel').style.display = "none";
    
function openLeftPanel() { // Function for open left panel
    const leftPanel = document.querySelector('.leftPanel');
    console.log(leftPanel.style.display);
    if (leftPanel.style.display == 'none') { // Проверяем что окно сейчас закрыто, если это так то открываем его
        leftPanel.style.display = 'block';
        leftPanel.animate([
            { left: '-261px' },
            { left: '0px' },
        ], {
            duration: 250,
            iterations: 1,
            easing: 'ease-in-out' // плавность движения
        });
    
        if (window.innerWidth <= 1100) { // Для планшетов/телефонов
            const darkScreen = document.querySelector('.darkScreenForLeftPanelMobile');
            
            lockScroll();
            darkScreen.style.display = 'block';
            darkScreen.animate([
                { opacity: 0 },
                { opacity: 1 },
            ], {
                duration: 250,
                iterations: 1,
                easing: 'ease-in-out' // плавность движения
            });
        }
    }
}

function closeLeftPanel() {
    const leftPanel = document.querySelector('.leftPanel');

    leftPanel.animate([
        { left: '0px' },
        { left: '-261px' },
    ], {
        duration: 250,
        iterations: 1,
        easing: 'ease-in-out' // плавность движения
    });
    setTimeout(() => {
        leftPanel.style.display = 'none';
    }, 238);

    if (window.innerWidth <= 1100) { // Для планшетов/телефонов
        const darkScreen = document.querySelector('.darkScreenForLeftPanelMobile');
        
        unlockScroll()
        darkScreen.animate([
            { opacity: 1 },
            { opacity: 0 },
        ], {
            duration: 250,
            iterations: 1,
            easing: 'ease-in-out' // плавность движения
        });
        setTimeout(() => {
            darkScreen.style.display = 'none';
        }, 238);
    }
}

document.getElementById('docel').addEventListener('input', function() {
    // Сбрасываем высоту до авто, чтобы правильно рассчитать scrollHeight
    this.style.height = 'auto';
    
    // Устанавливаем новую высоту (но не больше 200px)
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    
    // Включаем прокрутку если достигли максимума
    this.style.overflowY = this.scrollHeight > 200 ? 'auto' : 'hidden';
});

// Инициализация при загрузке
window.addEventListener('load', function() {
    const docel = document.getElementById('docel');
    docel.style.height = 'auto';
    docel.style.height = Math.min(docel.scrollHeight, 200) + 'px';
});
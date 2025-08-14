function togglePassword() {
    const passwordField = document.getElementById('password');
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);

    const passwordToggleElement = document.getElementById('togglePasswordElement');
    if (type === 'password') {
        passwordToggleElement.innerHTML = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"><g id="Layer_85" data-name="Layer 85"><path d="m61.59 30.79c-.53-.71-13.33-17.29-29.59-17.29a24.84 24.84 0 0 0 -4.6.44 2 2 0 1 0 .74 3.93 20.89 20.89 0 0 1 3.86-.37c11.9 0 22.23 10.82 25.41 14.5a55.56 55.56 0 0 1 -6.71 6.55 2 2 0 1 0 2.54 3.09 56.15 56.15 0 0 0 8.35-8.43 2 2 0 0 0 0-2.42z" fill="#000000" style="fill: rgb(255, 255, 255);"></path><path d="m48.4 42.29-8.8-8.8-9.09-9.09-7.82-7.82-10.44-10.44a2 2 0 0 0 -2.82 2.86l8.49 8.49a55.12 55.12 0 0 0 -15.51 13.3 2 2 0 0 0 0 2.42c.53.71 13.33 17.29 29.59 17.29a29.57 29.57 0 0 0 14.67-4.29l8.33 8.36a2 2 0 0 0 2.83-2.83zm-19.58-13.93 6.83 6.83a4.84 4.84 0 1 1 -6.83-6.83zm3.18 18.14c-11.9 0-22.23-10.82-25.41-14.5a50.36 50.36 0 0 1 14.28-11.59l5.13 5.12a8.83 8.83 0 1 0 12.47 12.47l5.27 5.27a25 25 0 0 1 -11.74 3.23z" fill="#000000" style="fill: rgb(255, 255, 255);"></path></g></svg>`;
    } else {
        passwordToggleElement.innerHTML = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"><g id="Layer_83" data-name="Layer 83"><path d="m61.59 30.79c-.53-.71-13.32-17.29-29.59-17.29s-29.06 16.58-29.59 17.29a2 2 0 0 0 0 2.42c.53.71 13.32 17.29 29.59 17.29s29.06-16.58 29.59-17.29a2 2 0 0 0 0-2.42zm-29.59 15.71c-11.9 0-22.24-10.82-25.41-14.5 3.17-3.69 13.48-14.5 25.41-14.5s22.24 10.82 25.41 14.5c-3.17 3.69-13.48 14.5-25.41 14.5z"/><path d="m32 23.15a8.85 8.85 0 1 0 8.85 8.85 8.86 8.86 0 0 0 -8.85-8.85zm0 13.7a4.85 4.85 0 1 1 4.85-4.85 4.86 4.86 0 0 1 -4.85 4.85z"/></g></svg>`
    }
}


document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // <-- Останавливает перезагрузку страницы

    let email = document.getElementById('email').value;
    let password = document.getElementById('password').value;

    let result = await login(email, password); // Выполняем попытку входа. login() возвращает массив [statusCode, detail]

    if (result[0] >= 200 && result[0] < 300) {
        window.location.href = '/';
    } else if (result[0] == 401) {

        alertUI("Неверное имя пользователя или пароль.", "", buttonText="ОК");
    }
});

function registerAccountBtnFunc() {
    alertUI("Регистрация недоступна для вашего IP адреса.", "Согласно последним данным регистрация не может быть доступна вашему IP адресу в данный момент. Повторите попытку позже или используйте вашу существующую учётную запись.", "ОК");
}
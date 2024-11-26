// Модальное окно
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('authModal');
    const authorized = modal.getAttribute('data-authorized') === 'true';

    if (authorized) {
        modal.style.display = 'none'; // Скрыть модальное окно
    } else {
        showLoginForm();

        // Переключение форм авторизации и регистрации
        const switchButton = document.getElementById('switch_enter');
        switchButton.addEventListener('change', toggleForm);

        // Переключение ролей
        const roleRadios = document.querySelectorAll('input[name="role"]');
        roleRadios.forEach(radio => {
            radio.addEventListener('change', toggleRoleFields);
        });

        // Валидация для всех полей ввода
        const inputs = document.querySelectorAll('#authForm input, #roleForm input');
        inputs.forEach(input => {
            input.addEventListener('input', validateInput);
        });
    }
});

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hide');
    document.getElementById('registerForm').classList.add('hide');
    document.getElementById('modalTitle').innerText = "Авторизация / Регистрация";
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hide');
    document.getElementById('registerForm').classList.remove('hide');
    document.getElementById('modalTitle').innerText = "Регистрация / Авторизация";
}

function toggleForm() {
    const switchButton = document.getElementById('switch_enter');

    if (switchButton.checked) {
        // Переключаем на регистрацию
        showRegisterForm();
        toggleRoleFields();
    } else {
        // Переключаем обратно на авторизацию
        showLoginForm();
    }
}

function toggleRoleFields() {
    const role = document.querySelector('input[name="role"]:checked').value;
    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');

    if (role === 'student') {
        studentFields.classList.remove('hide');
        teacherFields.classList.add('hide');

        // Для полей ученика: разрешаем их заполнение
        const studentInputs = studentFields.querySelectorAll('input');
        studentInputs.forEach(input => {
            input.disabled = false;
            if (!input.hasAttribute('required') && input.id != 'photoInputStudent') {
                input.setAttribute('required', 'required'); // Включаем валидацию
            }
        });

        // Для полей учителя: отключаем их
        const teacherInputs = teacherFields.querySelectorAll('input');
        teacherInputs.forEach(input => {
            input.disabled = true;
            input.removeAttribute('required'); // Убираем обязательность
        });
    } else {
        studentFields.classList.add('hide');
        teacherFields.classList.remove('hide');

        // Для полей ученика: отключаем их
        const studentInputs = studentFields.querySelectorAll('input');
        studentInputs.forEach(input => {
            input.disabled = true;
            input.removeAttribute('required'); // Убираем обязательность
        });

        // Для полей учителя: разрешаем их заполнение
        const teacherInputs = teacherFields.querySelectorAll('input');
        teacherInputs.forEach(input => {
            input.disabled = false;
            if (!input.hasAttribute('required') && input.id != 'photoInputTeacher' && input.name != 'subjects') {
                input.setAttribute('required', 'required'); // Включаем валидацию
            }
        });
    }
}

// Валидация для всех полей ввода
function validateInput(event) {
    const input = event.target;
    let value = input.value.trim();

    // Валидация для фамилии, имени, отчества
    if (input.name === 'surname' || input.name === 'name' || input.name === 'patronymic') {
        const regex = /^[A-ZА-Я][a-zа-я-]*$/;
        if (!regex.test(value)) {
            input.setCustomValidity('Первая буква должна быть заглавной, без пробелов или цифр.');
        } else {
            input.setCustomValidity(''); // Убираем ошибку, если все верно
        }
    }

    // Валидация для поля "Класс"
    if (input.name === 'class') {
        const regexClass = /^[1-9][0-9]*[A-Za-zА-Яа-я]?$/;
        if (!regexClass.test(value)) {
            input.setCustomValidity('Введите корректный класс (например, 9 или 10A).');
        } else {
            input.setCustomValidity(''); // Убираем ошибку, если все верно
        }
    }

    // Валидация для логина и пароля
    if (input.name === 'username' || input.name === 'password') {
        if (value.length < 6) {
            input.setCustomValidity('Поле должно содержать не менее 6 символов.');
        } else {
            input.setCustomValidity(''); // Убираем ошибку, если все верно
        }
    }

    // Отображаем сообщение об ошибке, если есть
    input.reportValidity();
}


// Для учеников
document.getElementById('photoInputStudent').addEventListener('change', function (event) {
    const photoPreview = document.getElementById('photoPreviewStudent');
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            photoPreview.src = e.target.result;
            photoPreview.classList.remove('hide'); // Показать изображение
        };
        reader.readAsDataURL(file);
    }
});

// Для учителей
document.getElementById('photoInputTeacher').addEventListener('change', function (event) {
    const photoPreview = document.getElementById('photoPreviewTeacher');
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            photoPreview.src = e.target.result;
            photoPreview.classList.remove('hide'); // Показать изображение
        };
        reader.readAsDataURL(file);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userPhoto = document.getElementById('userPhotoMain');
    const modal = document.getElementById('uploadPhotoModal');

    // Показываем модальное окно, если фото является заглушкой
    if (userPhoto.src.includes('/static/profile.png')) {
        modal.style.display = 'block';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('photoUploadForm');
    const flashMessages = document.getElementById('flashMessages');
    const modal = document.getElementById('uploadPhotoModal');
    const userPhotoMain = document.getElementById('userPhotoMain'); // Фото на странице профиля

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Предотвращаем стандартное поведение формы

        const formData = new FormData(form);

        try {
            const response = await fetch('/upload_photo', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // Очистка flash-сообщений перед добавлением нового
            if (flashMessages) {
                flashMessages.remove();
            }

            // Создаем новый контейнер для flash-сообщений
            const newFlashContainer = document.createElement('div');
            newFlashContainer.id = 'flashMessages';
            modal.querySelector('.header_upload').insertAdjacentElement('afterend', newFlashContainer); // Добавляем в начало модального окна

            if (result.success) {
                // Успешное обновление
                newFlashContainer.innerHTML = `<div class="flash success">${result.message}</div>`;
                modal.style.display = 'none'; // Закрыть модальное окно

                setTimeout(() => {
                    window.location.reload(); // Перезагрузить страницу
                }, 500); // Небольшая задержка перед перезагрузкой (опционально)
            } else {
                // Ошибка загрузки
                newFlashContainer.innerHTML = `<div class="flash error">${result.message}</div>`;
            }

            // Удаляем контейнер через 5 секунд
            setTimeout(() => {
                newFlashContainer.remove();
            }, 5000);

        } catch (error) {
            if (flashMessages) {
                flashMessages.remove();
            }

            const errorContainer = document.createElement('div');
            errorContainer.id = 'flashMessages';
            modal.querySelector('.header_upload').insertAdjacentElement('afterend', errorContainer); // Добавляем в начало модального окна

            errorContainer.innerHTML = `<div class="flash error">Ошибка загрузки. Попробуйте снова.</div>`;
            setTimeout(() => {
                errorContainer.remove();
            }, 5000);
        }
    });
});


// profile.js

// Код для управления выпадающим меню профиля
$(document).ready(function() {
    // Обработчик клика на иконку профиля
    $('#profileIcon').click(function(event) {
        event.stopPropagation(); // Остановить событие, чтобы не закрыть меню сразу
        $('#profileDropdown').toggleClass('show'); // Переключаем класс 'show' для отображения/скрытия меню
    });

    // Закрыть меню при клике вне его
    $(document).click(function(event) {
        // Проверяем, что клик был вне иконки и выпадающего меню
        if (!$(event.target).closest('#profileIcon').length && !$(event.target).closest('#profileDropdown').length) {
            $('#profileDropdown').removeClass('show'); // Убираем класс 'show', чтобы скрыть меню
        }
    });
});

$(document).ready(function() {
    function loadUserPhoto() {
        $.ajax({
            url: '/get_user_photo',
            type: 'GET',
            success: function(data) {
                if (data.user_photo) {
                    // Проверяем, существует ли каждый элемент перед обновлением src
                    if ($('#userPhoto').length) {
                        $('#userPhoto').attr('src', 'data:image/jpeg;base64,' + data.user_photo);
                    }
                    if ($('#userPhotoMain').length) {
                        $('#userPhotoMain').attr('src', 'data:image/jpeg;base64,' + data.user_photo);
                    }
                } else {
                    // Задаем изображение по умолчанию, если фото нет
                    if ($('#userPhoto').length) {
                        $('#userPhoto').attr('src', '/static/profile.png');
                    }
                    if ($('#userPhotoMain').length) {
                        $('#userPhotoMain').attr('src', "/static/profile.png");
                    }
                }
            },
            error: function() {
                console.error('Error loading user photo.');
            }
        });
    }

    loadUserPhoto();
});
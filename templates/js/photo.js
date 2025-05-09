////////////////////////////////////////////////////////////////////////////////////////////////////
// Загрузка фото
document.addEventListener('DOMContentLoaded', function () {
    const photoInput = document.getElementById('photoInput');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const photoUploadArea = document.getElementById('photoUploadArea');
    const deleteAllButton = document.getElementById('deleteAllButton');
    const photoWrappers = document.querySelectorAll('.photo-wrapper');

    // Переменная для хранения всех выбранных файлов
    let filesArray = [];

    // MultiDrag сортировка с использованием Sortable.js
    const sortable = new Sortable(photoPreviewContainer, {
        animation: 150,
        multiDrag: true,
        fallbackTolerance: 3, // Для выбора элементов на мобильных устройствах
        selectedClass: 'selected',
        dragClass: 'dragging',
        onSort: function () {
            // Получаем новый порядок DOM-элементов
            const sortedWrappers = Array.from(photoPreviewContainer.children);
    
            // Обновляем filesArray в соответствии с новым порядком DOM-узлов
            filesArray = sortedWrappers.map(wrapper => {
                const index = parseInt(wrapper.dataset.index, 10); // Берем индекс из data-index
                return filesArray[index];
            });
    
            // Переназначаем data-index для всех элементов
            sortedWrappers.forEach((wrapper, newIndex) => {
                wrapper.dataset.index = newIndex;
            });
    
            // Обновляем файл в photoInput
            updatePhotoInput();
        }
    });

    photoUploadArea.addEventListener('click', () => {
        photoInput.click();
    });    

    // Изменяем обработчик двойного клика
    photoPreviewContainer.addEventListener('dblclick', function (event) {
        const target = event.target;

        // Проверяем, что двойной клик произошёл на контейнере фото (wrapper)
        if (target.closest('.photo-wrapper')) {
            const wrapper = target.closest('.photo-wrapper');

            // Если у wrapper уже есть класс enlarged, убираем его
            if (wrapper.classList.contains('enlarged')) {
                wrapper.classList.remove('enlarged');
            } else {
                // Убираем класс enlarged у всех остальных фото
                photoWrappers.forEach(w => w.classList.remove('enlarged'));

                // Добавляем класс только для текущего фото-wrapper
                wrapper.classList.add('enlarged');
            }
        }
    });

    photoInput.addEventListener('change', function () {
        // Добавляем новые файлы в массив
        const newFiles = Array.from(this.files);
        filesArray = [...filesArray, ...newFiles]; // Объединяем старые и новые файлы
    
        // Обновляем photoInput
        updatePhotoInput(); // ///////////////////////////П/О/М/Е/Н/Я/Л////////////////////////////////////////////////////////////////////////////

        // Рендерим все актуальные файлы
        renderPreviews();
    });
    
    // Рендеринг всех актуальных превью
    function renderPreviews() {
        photoPreviewContainer.innerHTML = ''; // Очищаем контейнер превью
    
        // Для каждого файла в массиве рендерим превью
        filesArray.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement('div');
                wrapper.classList.add('photo-wrapper');
                wrapper.dataset.index = index; // Присваиваем data-index
    
                const img = document.createElement('img');
                img.src = e.target.result;
    
                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-photo');
                removeButton.innerText = '×';
    
                // Удаление фотографии по индексу
                removeButton.addEventListener('click', () => {
                    removePhoto(index); // Удаляем файл по индексу
                });
    
                wrapper.appendChild(img);
                wrapper.appendChild(removeButton);
                photoPreviewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    
        toggleDeleteAllButton(); // Обновляем видимость кнопки "Удалить все"
    }
    
    // Показываем или скрываем кнопку "Удалить все фото"
    function toggleDeleteAllButton() {
        if (filesArray.length > 0) {
            deleteAllButton.classList.remove('hide');
        } else {
            deleteAllButton.classList.add('hide');
        }
    }

    // Удаление фотографии по индексу
    function removePhoto(indexToRemove) {
        // Удаляем файл из массива по индексу
        filesArray.splice(indexToRemove, 1);

        // Обновляем файл в photoInput
        updatePhotoInput();

        // Перерисовываем превью
        renderPreviews();
    }

    // Обновление photoInput.files
    function updatePhotoInput() {
        const dataTransfer = new DataTransfer();
        filesArray.forEach((file) => dataTransfer.items.add(file));
        photoInput.files = dataTransfer.files; // Обновляем input с новыми файлами
    }

    // Удаление всех фото
    deleteAllButton.addEventListener('click', () => {
        filesArray = []; // Очищаем массив файлов
        photoInput.value = ''; // Сбрасываем input
        renderPreviews(); // Перерисовываем пустое превью
    });
});



document.addEventListener("DOMContentLoaded", function () {
    const selectedDatesList = document.getElementById("selectedDatesList");
    const selectedDates = new Map(); // Сохраняем выбранные даты с порядковым номером

    // Инициализация Flatpickr
    flatpickr("#calendarInput", {
        mode: "multiple", // Позволяет выбирать несколько дат
        inline: true, // Открыт сразу
        dateFormat: "d-m-y", // Формат отображаемой даты
        locale: "ru", // Устанавливаем язык на русский
        onChange: function (selectedDatesArray) {
            selectedDates.clear();
            selectedDatesArray.forEach((date, index) => {
                const formattedDate = formatDateToLocal(date);
                selectedDates.set(formattedDate, index + 1);
            });
            renderSelectedDates();
        }
    });

    // Отображение выбранных дат
    function renderSelectedDates() {
        selectedDatesList.innerHTML = "";
        selectedDates.forEach((order, date) => {
            const span = document.createElement("span");
            span.textContent = `${order}: ${date}`;
            selectedDatesList.appendChild(span);
        });
    }

    // Функция для форматирования даты в локальном формате
    function formatDateToLocal(date) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }
});




const photoInput = document.getElementById('photoInput');
const selectedDatesList = document.getElementById('selectedDatesList');

// Табличное заполнение с помощью фото
$(document).ready(function () {
    $('#photoUploadForm').on('submit', function (e) {
        e.preventDefault();

        // Очистка превью для показа распознавания
        resetProgress()

        const selectedDates = Array.from(document.getElementById('selectedDatesList').children)
        .map(item => item.textContent); // Список выбранных дат

        const uploadedPhotos = document.getElementById('photoInput').files; // Загруженные фотографии

        // Получаем предмет и класс
        const subject = document.getElementById('subjectSelectPhoto').value; // Предмет
        const selectedClass = document.getElementById('classSelectPhoto').value; // Класс

        // Если не выбраны предмет или класс
        if (!subject || !selectedClass) {
            alert('Пожалуйста, выберите предмет и класс.');
            return;
        }

        // Проверка: соответствие количества дат и фотографий
        if (selectedDates.length !== uploadedPhotos.length) {
            alert('Количество выбранных дат и фотографий не совпадает. Убедитесь, что загружено фото для каждой даты.');
            return;
        }

        // Подготовка данных для отправки
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('class_name', selectedClass);
        formData.append('dates', JSON.stringify(selectedDates)); // Массив дат в формате JSON

        // Добавляем файлы
        Array.from(uploadedPhotos).forEach(photo => formData.append('photos', photo));
        
        $.ajax({
            url: '/analyze_photos',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                // Очистка заголовков и строк таблицы перед добавлением новых данных
                $('#studentTable thead').empty();
                $('#studentTable tbody').empty();

                // Объединение пустых ячеек в заголовках
                var prevHeader = null;
                var colspan = 1;
                
                let emptyIndices = [];
                var ind = 0;
                
                // Найти индексы пустых строк
                response.data[0].forEach(function (cell) {
                    if (cell === "") {
                        emptyIndices.push(ind);
                    }
                    ind += 1;
                });
                
                var theadRow = '<tr>';
                response.columns.forEach(function (column, index) {
                    // Первые две и последняя колонки - фиксированный rowspan
                    if (index === 0 || index === 1 || index === response.columns.length - 1) {
                        if (prevHeader !== null) {
                            theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                            colspan = 1;
                        }
                        theadRow += `<th rowspan="3">${column}</th>`;
                        prevHeader = null; // Сбрасываем заголовок
                    } else {
                        // Для остальных колонок вычисляем colspan
                        if (column === "") {
                            colspan++;
                        } else {
                            if (prevHeader !== null) {
                                theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                                colspan = 1;
                            }
                            prevHeader = column;
                        }
                    }
                });
                theadRow += '</tr>';
                $('#studentTable thead').append(theadRow);                

                var firstRow = '<tr>';
                let lastHeader = null; // Последний найденный месяц
                let monthColspan = 0;  // Количество колонок для текущего месяца

                response.data[0].forEach(function (cell, index) {
                    if (index > 1 && index < response.data[0].length - 1) { // Пропускаем первые две и последнюю колонки
                        if (cell === "") {
                            monthColspan++; // Увеличиваем счетчик пустых ячеек
                        } else {
                            if (lastHeader !== null) {
                                // Добавляем предыдущий заголовок с накопленным colspan
                                firstRow += `<th colspan="${monthColspan + 1}">${lastHeader}</th>`;
                            }
                            // Обновляем последний заголовок и сбрасываем счетчик
                            lastHeader = cell;
                            monthColspan = 0;
                        }
                    }
                });

                // Обработка последнего заголовка (если он существует)
                if (lastHeader !== null) {
                    firstRow += `<th colspan="${monthColspan + 1}">${lastHeader}</th>`;
                }

                firstRow += '</tr>';
                $('#studentTable thead').append(firstRow);


                var secondRow = '<tr>';
                response.data[1].forEach(function (cell) {
                    if (cell !== "") {
                        secondRow += `<th>${cell || ""}</th>`;
                    }
                });
                secondRow += '</tr>';
                $('#studentTable thead').append(secondRow);

                var rowData = []; // Массив для хранения значений ячеек

                // Заполнение данных в таблице, начиная с третьей строки
                response.data.slice(2).forEach(function (row) {
                    var newRow = '<tr>';
                    row.forEach(function (cell) {
                        var cellValue = cell !== null && cell !== undefined ? cell : "";
                        newRow += `<td>${cellValue}</td>`;
                        rowData.push(cellValue);
                    });
                    newRow += '</tr>';
                    $('#studentTable tbody').append(newRow);
                });

                // Определение типа анализа на основе загруженных данных
                var containsAverageGrade = response.columns.includes('Средняя оценка');
                var containsAttendanceDays = response.columns.includes('Дни посещения');
                var containsAllGrade = response.columns.includes('Год')

                var allCellsGreaterThanFive = rowData.every(function (cellValue) {
                    return parseFloat(cellValue) > 5;
                });

                var containsBOrOT = rowData.some(function (cellValue) {
                    if (typeof cellValue === 'string') {
                        return cellValue.includes('Б') || cellValue.includes('ОТ');
                    }
                    return false;
                });

                var analysisType = $('#analysisType');

                if (containsAverageGrade && containsAttendanceDays && containsAllGrade) {
                    // Default to performance if both are present
                    analysisType.val('performance');
                } else if (containsAverageGrade) {
                    analysisType.val('performance');
                } else if (containsAttendanceDays) {
                    analysisType.val('attendance');
                } else if (containsAllGrade && !allCellsGreaterThanFive) {
                    analysisType.val('performance');
                } else if ((containsAllGrade && allCellsGreaterThanFive) || containsBOrOT) {
                    analysisType.val('attendance');
                } else {
                    alert('Ошибка: данные не соответствуют образцу загрузки.');
                }
 
                // Добавляем метрики для анализов
                measuresAdd(response);
                
                $('.containerTable').css('display', 'table');
            
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('AJAX Error:', textStatus, errorThrown);
                alert('Ошибка: Произошла ошибка при распознавании фото.');
            }
        });
    });
});

const socket = io.connect();

// Массив для хранения фото
let photos = [];
let currentPhotoIndex = 0;
let isInfoVisible = false; // Флаг для отображения текстовой информации

// Очистка перед загрузкой
function resetProgress() {
    photos = [];
    currentPhotoIndex = 0;
    document.getElementById('progressText').textContent = 'Обработано фото 0 из 0';
    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('processedPhotos').innerHTML = '';
    document.getElementById('photoCounter').textContent = 'Фото 0 из 0';
    updateCarousel();
}

// Обновление карусели
function updateCarousel() {
    const currentPhoto = document.getElementById('currentPhoto');
    currentPhoto.src = photos[currentPhotoIndex] || '/static/placeholder.jpeg';

    const photoCounter = document.getElementById('photoCounter');
    photoCounter.textContent = `Фото ${currentPhotoIndex + 1} из ${photos.length}`;
}

// Переключение фото
document.getElementById('prevPhoto').addEventListener('click', () => {
    if (photos.length > 0) {
        currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
        updateCarousel();
    }
});

document.getElementById('nextPhoto').addEventListener('click', () => {
    if (photos.length > 0) {
        currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
        updateCarousel();
    }
});

// Кнопка сворачивания информации
document.getElementById('toggleInfo').addEventListener('click', () => {
    const processedPhotos = document.getElementById('processedPhotos');
    isInfoVisible = !isInfoVisible;

    if (isInfoVisible) {
        processedPhotos.style.display = 'block';
        document.getElementById('toggleInfo').textContent = 'Скрыть информацию';
    } else {
        processedPhotos.style.display = 'none';
        document.getElementById('toggleInfo').textContent = 'Показать информацию';
    }
});

// Обработка событий от сокета
socket.on('photo_processed', function (data) {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');

    // Обновление прогресса
    const progressPercentage = (data.photo_index / data.total_photos) * 100;
    progressBarFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `Обработано фото ${data.photo_index} из ${data.total_photos}`;
    
    // Добавление информации о студентах
    if (data.recognized_students) {
        const processedPhotos = document.getElementById('processedPhotos');
        const studentList = data.recognized_students
            .map(name => `<li>ФИО ученика: ${name}</li>`)
            .join('');
        processedPhotos.innerHTML += `<p>Фото ${data.photo_index}: <ul>${studentList}</ul></p>`;
    }
});

socket.on('photo_preview', function (data) {
    // Добавление фото в карусель
    const photoSrc = `data:image/jpeg;base64,${data.image}`;
    photos.push(photoSrc);
    updateCarousel();
});

// Обработка ошибок
socket.on('processing_error', function (data) {
    alert(`Ошибка обработки: ${data.error}`);
});

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.querySelector('#uploadArea label');

// Клик по области загрузки вызывает клик по input[type="file"] только если файл не выбран
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// При изменении input[type="file"] обновляется текст в области загрузки
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        uploadArea.querySelector('p').textContent = `Выбран файл: ${file.name}`;
    } else {
        uploadArea.querySelector('p').textContent = 'Перетащите файлы сюда';
    }
});

// Обработка событий drag-and-drop для области загрузки
uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.style.backgroundColor = '#d0ffd0';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = '#e0ffe0';
});

uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    fileInput.files = event.dataTransfer.files;
    const file = fileInput.files[0];
    if (file) {
        uploadArea.querySelector('p').textContent = `Выбран файл: ${file.name}`;
    } else {
        uploadArea.querySelector('p').textContent = 'Перетащите файлы сюда';
    }
    uploadArea.style.backgroundColor = '#e0ffe0';
});

// Делаем метку "Выберите файл" ненажимаемой
fileInputLabel.style.pointerEvents = 'none';

// Функция для загрузки данных из БД
function loadData() {
    // Получение значений из селекторов
    const selectors = [
        "#classSelect", "#classLetterSelect", "#subjectSelect",
        "#teacherSelect", "#performanceSelect", "#periodSelect", "#periodSelectYear"
    ];
    const data = selectors.reduce((result, selector) => {
        const key = $(selector).attr("id").replace("Select", "Value");
        if (key == "performanceValue"){
            result[key] = $(`${selector} option:selected`).val();
        }
        else{
            result[key] = $(`${selector} option:selected`).text();
        }
        return result;
    }, {});

    // Отправка AJAX-запроса на сервер Flask
    $.ajax({
        url: "/load_data",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function (response) {
            updateTable(response);
            updateAnalysisType(response);
            //updateAnalysisMeasure(response);
            //updatePeriodOptions(response);

            // Очистка текущих опций в метрике
            var analysisMeasure = $('#analysisMeasure');
            analysisMeasure.empty(); // Очистка всех опций

            // Функция для добавления опции в селект
            function addOption(value, text) {
                analysisMeasure.append(`<option value="${value}">${text}</option>`);
            }

            // Условия для добавления опций на основе загруженных данных
            var containsAttendanceDays = response.columns.includes('Дни посещаемости'); // Пример условия для посещаемости
            var containsPeriodTotal = response.columns.includes('Итог за период');
            var contains1 = response.data[0].includes('1 четверть');
            var contains2 = response.data[0].includes('2 четверть');
            var contains3 = response.data[0].includes('3 четверть');
            var contains4 = response.data[0].includes('4 четверть');
            var containsAverageGrade = response.columns.includes('Средний балл');
            var containsAllGrade = response.columns.includes('Год');
            var containsMedium1 = response.columns.includes('1 полугодие');
            var containsMedium2 = response.columns.includes('2 полугодие');
            var containsYearTotal = response.columns.includes('Итог.');
            var containsPeriodGrade = response.columns.includes('Оценка за период');

            // Проверка условий и добавление соответствующих опций
            if (containsAttendanceDays) {
                addOption('attendanceDays', 'Посещаемость');
            }

            if (containsPeriodTotal) {
                addOption('periodTotal', 'Итог за период');
            }

            if (contains1) {
                addOption('quarter1', '1 четверть');
            }
            if (contains2) {
                addOption('quarter2', '2 четверть');
            }
            if (contains3) {
                addOption('quarter3', '3 четверть');
            }
            if (contains4) {
                addOption('quarter4', '4 четверть');
            }

            if (containsAverageGrade) {
                addOption('averageGrade', 'Средний балл');
            }

            if (containsAllGrade) {
                addOption('year', 'Год');
            }

            if (containsMedium1) {
                addOption('medium1', '1 полугодие');
            }
            if (containsMedium2) {
                addOption('medium2', '2 полугодие');
            }

            if (containsYearTotal) {
                addOption('yearTotal', 'Итог.');
            }

            if (containsPeriodGrade) {
                addOption('gradePeriod', 'Оценка за период');
            }

            // Применить первую доступную опцию
            analysisMeasure.find('option:first').prop('selected', true);
            


            // Для XYZ-анализа
            // Функция для очистки всех опций в селекторе
            function clearOptions(selector) {
                var select = $(selector);
                select.empty();  // Очистка всех текущих опций
            }

            // Условия для начального и конечного периода
            var quarterConditions = [contains1, contains2, contains3, contains4];
            var quarterOptions = ['Q1', 'Q2', 'Q3', 'Q4'];
            var mediumConditions = [containsMedium1, containsMedium2];
            var mediumOptions = ['H1', 'H2'];
            var finalOption = 'I';

            // Функция для добавления опций в селектор
            function addPeriodOptions(selector, quarterConditions, quarterOptions, mediumConditions, mediumOptions, containsPeriodTotal, finalOption) {
                var select = $(selector);
                
                // Очистка существующих опций
                clearOptions(selector);
                
                // Добавляем опции для четвертей
                quarterConditions.forEach((condition, index) => {
                    if (condition) {
                        select.append(`<option value="${quarterOptions[index]}">${index + 1} четверть</option>`);
                    }
                });

                // Добавляем опции для полугодий
                mediumConditions.forEach((condition, index) => {
                    if (condition) {
                        select.append(`<option value="${mediumOptions[index]}">${index + 1} полугодие</option>`);
                    }
                });

                // Добавляем итоговый период (если есть)
                if (containsPeriodTotal) {
                    select.append(`<option value="${finalOption}">Итог за период</option>`);
                }

                // Применить первую доступную опцию
                select.find('option:first').prop('selected', true);
            }

            // Управление опциями для начального периода
            addPeriodOptions('#startQuarter', quarterConditions, quarterOptions, mediumConditions, mediumOptions,containsPeriodTotal, finalOption);

            // Управление опциями для конечного периода
            addPeriodOptions('#endQuarter', quarterConditions, quarterOptions, mediumConditions, mediumOptions,containsPeriodTotal, finalOption);

            $('.containerTable').css('display', 'table');
        },
        error: function (xhr, status, error) {
            console.error("Ошибка при загрузке данных:", error);
        }
    });
}

// Функция для обновления таблицы
function updateTable(response) {
    // Очистка заголовков и строк таблицы перед добавлением новых данных
    $('#studentTable thead').empty();
    $('#studentTable tbody').empty();

    // Объединение пустых ячеек в заголовках
    var prevHeader = null;
    var colspan = 1;

    let emptyIndices = [];
    var ind = 0;

    // Найти индексы строк, которые равны ""
    response.data[0].forEach(function (cell) {
        if (cell === "") {
            emptyIndices.push(ind);
        }
        ind += 1;
    });

    var theadRow = '<tr>';
    response.columns.forEach(function (column, index) {
        if (column === "") {
            colspan++;
        } else {
            if (prevHeader !== null) {
                if (emptyIndices.includes(index - 1)) {
                    theadRow += `<th rowspan="2">${prevHeader}</th>`;
                }
                else {
                    theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                }
                colspan = 1;
            }
            prevHeader = column;
        }
    });
    if (prevHeader !== null) {
        if (emptyIndices.includes(response.columns.length - 1)) {
            theadRow += `<th rowspan="2">${prevHeader}</th>`;
        }
        else {
            theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
        }
    }
    theadRow += '</tr>';
    $('#studentTable thead').append(theadRow);

    // Заполнение первой строки данных в таблице
    var firstRow = '<tr>';
    response.data[0].forEach(function (cell) {
        if (cell !== "") {
            firstRow += `<th>${cell || ""}</th>`;
        }
    });
    firstRow += '</tr>';
    $('#studentTable thead').append(firstRow);

    // Заполнение данных в таблице, начиная с второй строки
    response.data.slice(1).forEach(function (row) {
        var newRow = '<tr>';
        row.forEach(function (cell) {
            newRow += `<td>${cell || ""}</td>`;
        });
        newRow += '</tr>';
        $('#studentTable tbody').append(newRow);
    });
}

// Функция для обновления типа анализа
function updateAnalysisType(response) {
    const { columns } = response;
    const analysisType = $('#analysisType');
    const performanceSelectText = $("#performanceSelect option:selected").val();

    const conditions = {
        performance: columns.includes('Средняя оценка'),
        attendance: columns.includes('Дни посещения') || columns.includes('Итог за период'),
        grades: columns.includes('Год') || columns.includes('Итог.') && performanceSelectText === 'grades'
    };

    if (conditions.performance || (conditions.attendance && conditions.grades)) {
        analysisType.val('performance');
    } else if (conditions.attendance) {
        analysisType.val('attendance');
    } else if (conditions.grades) {
        analysisType.val('performance');
    } else {
        alert('Ошибка: данные не соответствуют образцу загрузки.');
    }
}

// Функция для обновления меры анализа
function updateAnalysisMeasure(response) {
    const analysisMeasure = $('#analysisMeasure');
    const data = response.data[0];
    const conditions = {
        attendanceDays: response.columns.includes('Дни посещения'),
        periodTotal: response.columns.includes('Итог за период'),
        averageGrade: response.columns.includes('Средняя оценка'),
        year: response.columns.includes('Год'),
        medium1: response.columns.includes('1 полугодие'),
        medium2: response.columns.includes('2 полугодие'),
        yearTotal: response.columns.includes('Итог.'),
        gradePeriod: response.columns.includes('Оценка за период')
    };

    analysisMeasure.find('option').each((_, option) => {
        const value = $(option).val();
        $(option).prop('disabled', !conditions[value]);
    });

    analysisMeasure.find('option:disabled').hide();
    analysisMeasure.find('option:not(:disabled)').first().prop('selected', true);
}

// Функция для управления опциями периодов
function updatePeriodOptions(response) {
    const periods = {
        Q1: response.data[0].includes('1 четверть'),
        Q2: response.data[0].includes('2 четверть'),
        Q3: response.data[0].includes('3 четверть'),
        Q4: response.data[0].includes('4 четверть'),
        H1: response.columns.includes('1 полугодие'),
        H2: response.columns.includes('2 полугодие'),
        I: response.columns.includes('Итог за период')
    };

    ['#startQuarter', '#endQuarter'].forEach(selector => {
        manageOptions(selector, periods);
    });
}

// Функция для управления опциями в выпадающем списке
function manageOptions(selector, options) {
    const select = $(selector);
    select.find('option').prop('disabled', true);

    Object.entries(options).forEach(([key, condition]) => {
        if (condition) {
            select.find(`option[value="${key}"]`).prop('disabled', false);
        }
    });

    select.find('option:disabled').hide();
    select.find('option:not(:disabled)').first().prop('selected', true);
}

// Табличное заполнение
$(document).ready(function () {
    $('#uploadForm').on('submit', function (e) {
        e.preventDefault();

        var formData = new FormData();
        formData.append('file', $('#fileInput')[0].files[0]);

        $.ajax({
            url: '/upload',
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

                // Найти индексы строк, которые равны ""
                response.data[0].forEach(function (cell) {
                    if (cell === "") {
                        emptyIndices.push(ind);
                    }
                    ind += 1;
                });

                var theadRow = '<tr>';
                response.columns.forEach(function (column, index) {
                    if (column === "") {
                        colspan++;
                    } else {
                        if (prevHeader !== null) {
                            if (emptyIndices.includes(index - 1)) {
                                theadRow += `<th rowspan="2">${prevHeader}</th>`;
                            }
                            else {
                                theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                            }
                            colspan = 1;
                        }
                        prevHeader = column;
                    }
                });
                if (prevHeader !== null) {
                    if (emptyIndices.includes(response.columns.length - 1)) {
                        theadRow += `<th rowspan="2">${prevHeader}</th>`;
                    }
                    else {
                        theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                    }
                }
                theadRow += '</tr>';
                $('#studentTable thead').append(theadRow);

                // Заполнение первой строки данных в таблице
                var firstRow = '<tr>';
                response.data[0].forEach(function (cell) {
                    if (cell !== "") {
                        firstRow += `<th>${cell || ""}</th>`;
                    }
                });
                firstRow += '</tr>';
                $('#studentTable thead').append(firstRow);

                var rowData = []; // Массив для хранения значений ячеек

                // Заполнение данных в таблице, начиная с второй строки
                response.data.slice(1).forEach(function (row) {
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

                // Очистка текущих опций в метрике
                var analysisMeasure = $('#analysisMeasure');
                analysisMeasure.empty(); // Очистка всех опций

                // Функция для добавления опции в селект
                function addOption(value, text) {
                    analysisMeasure.append(`<option value="${value}">${text}</option>`);
                }

                // Условия для добавления опций на основе загруженных данных
                var containsAttendanceDays = response.columns.includes('Дни посещаемости'); // Пример условия для посещаемости
                var containsPeriodTotal = response.columns.includes('Итог за период');
                var contains1 = response.data[0].includes('1 четверть');
                var contains2 = response.data[0].includes('2 четверть');
                var contains3 = response.data[0].includes('3 четверть');
                var contains4 = response.data[0].includes('4 четверть');
                var containsAverageGrade = response.columns.includes('Средний балл');
                var containsAllGrade = response.columns.includes('Год');
                var containsMedium1 = response.columns.includes('1 полугодие');
                var containsMedium2 = response.columns.includes('2 полугодие');
                var containsYearTotal = response.columns.includes('Итог.');
                var containsPeriodGrade = response.columns.includes('Оценка за период');

                // Проверка условий и добавление соответствующих опций
                if (containsAttendanceDays) {
                    addOption('attendanceDays', 'Посещаемость');
                }

                if (containsPeriodTotal) {
                    addOption('periodTotal', 'Итог за период');
                }

                if (contains1) {
                    addOption('quarter1', '1 четверть');
                }
                if (contains2) {
                    addOption('quarter2', '2 четверть');
                }
                if (contains3) {
                    addOption('quarter3', '3 четверть');
                }
                if (contains4) {
                    addOption('quarter4', '4 четверть');
                }

                if (containsAverageGrade) {
                    addOption('averageGrade', 'Средний балл');
                }

                if (containsAllGrade) {
                    addOption('year', 'Год');
                }

                if (containsMedium1) {
                    addOption('medium1', '1 полугодие');
                }
                if (containsMedium2) {
                    addOption('medium2', '2 полугодие');
                }

                if (containsYearTotal) {
                    addOption('yearTotal', 'Итог');
                }

                if (containsPeriodGrade) {
                    addOption('gradePeriod', 'Оценка за период');
                }

                // Применить первую доступную опцию
                analysisMeasure.find('option:first').prop('selected', true);
                


                // Для XYZ-анализа
                // Функция для очистки всех опций в селекторе
                function clearOptions(selector) {
                    var select = $(selector);
                    select.empty();  // Очистка всех текущих опций
                }

                // Условия для начального и конечного периода
                var quarterConditions = [contains1, contains2, contains3, contains4];
                var quarterOptions = ['Q1', 'Q2', 'Q3', 'Q4'];
                var mediumConditions = [containsMedium1, containsMedium2];
                var mediumOptions = ['H1', 'H2'];
                var finalOption = 'I';

                // Функция для добавления опций в селектор
                function addPeriodOptions(selector, quarterConditions, quarterOptions, mediumConditions, mediumOptions, containsPeriodTotal, finalOption) {
                    var select = $(selector);
                    
                    // Очистка существующих опций
                    clearOptions(selector);
                    
                    // Добавляем опции для четвертей
                    quarterConditions.forEach((condition, index) => {
                        if (condition) {
                            select.append(`<option value="${quarterOptions[index]}">${index + 1} четверть</option>`);
                        }
                    });

                    // Добавляем опции для полугодий
                    mediumConditions.forEach((condition, index) => {
                        if (condition) {
                            select.append(`<option value="${mediumOptions[index]}">${index + 1} полугодие</option>`);
                        }
                    });

                    // Добавляем итоговый период (если есть)
                    if (containsPeriodTotal) {
                        select.append(`<option value="${finalOption}">Итог за период</option>`);
                    }

                    // Применить первую доступную опцию
                    select.find('option:first').prop('selected', true);
                }

                // Управление опциями для начального периода
                addPeriodOptions('#startQuarter', quarterConditions, quarterOptions, mediumConditions, mediumOptions,containsPeriodTotal, finalOption);

                // Управление опциями для конечного периода
                addPeriodOptions('#endQuarter', quarterConditions, quarterOptions, mediumConditions, mediumOptions,containsPeriodTotal, finalOption);

                $('.containerTable').css('display', 'table');
            
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('AJAX Error:', textStatus, errorThrown);
                alert('Ошибка: данные не соответствуют образцу загрузки.');
            }
        });
    });
});

// Меню настроек
document.addEventListener('DOMContentLoaded', function () {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const thresholdA = document.getElementById('thresholdA');
    const thresholdB = document.getElementById('thresholdB');
    const thresholdC = document.getElementById('thresholdC');

    // Показываем или скрываем меню настроек
    settingsBtn.addEventListener('click', () => {
        settingsMenu.classList.toggle('open'); // Переключаем класс 'open'
    });

    if(thresholdA){
        // Обновляем значения ползунков при изменении вручную
        thresholdA.addEventListener('change', function () {
            if (parseFloat(thresholdA.value) < 0) thresholdA.value = 0;
            if (parseFloat(thresholdA.value) > 1) thresholdA.value = 1;
        });
    }

    if (thresholdB){
        thresholdB.addEventListener('change', function () {
            if (parseFloat(thresholdB.value) < 0) thresholdB.value = 0;
            if (parseFloat(thresholdB.value) > 1) thresholdB.value = 1;
        });
    }
    
    if (thresholdC){
        thresholdC.addEventListener('change', function () {
            if (parseFloat(thresholdC.value) < 0) thresholdC.value = 0;
            if (parseFloat(thresholdC.value) > 1) thresholdC.value = 1;
        });
    }
});


function updateThresholdValue(sliderId, valueDisplayId) {
    var slider = document.getElementById(sliderId);
    var valueDisplay = document.getElementById(valueDisplayId);
    valueDisplay.textContent = slider.value + '%';

    // Ensure the sum of the thresholds is 100
    var thresholdX = parseFloat(document.getElementById('thresholdX').value);
    var thresholdY = parseFloat(document.getElementById('thresholdY').value);
    var thresholdZ = parseFloat(document.getElementById('thresholdZ').value);

    if (thresholdX + thresholdY + thresholdZ !== 100) {
        // Optionally display a warning or handle the error as needed
        console.warn('Ошибка: Сумма порогов XYZ-анализа должна быть равна 100.');
    }
}

// Получаем все элементы ползунков
var sliders = document.querySelectorAll('.slider-container input[type="range"]');

// Для каждого ползунка
sliders.forEach(function(slider) {
    // Вызываем функцию, чтобы установить начальный стиль линии при загрузке страницы
    setInitialLineStyle(slider);

    // Добавляем обработчик события input
    slider.addEventListener('input', function() {
        // Получаем значение ползунка
        var value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        
        // Изменяем стиль линии в зависимости от значения ползунка
        slider.style.background = 'linear-gradient(to right, #000000 ' + value + '%, #767676 ' + value + '%)';
    });
});

// Функция для установки начального стиля линии
function setInitialLineStyle(slider) {
    // Получаем значение ползунка
    var value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        
    // Устанавливаем начальный стиль линии
    slider.style.background = 'linear-gradient(to right, #000000 ' + value + '%, #767676 ' + value + '%)';
}





// Динамическая загрузка данных в селектор
// Функция для загрузки учителей и классов по предмету
function loadTeachers() {
    var subjectSelect = document.getElementById('subjectSelect');
    var subjectId = subjectSelect.value;
    var classLetterSelect = document.getElementById('classLetterSelect');
    var classLetter = classLetterSelect.value;
    var periodSelect = document.getElementById('periodSelect');
    var periodId = periodSelect.value;
    var classSelect = document.getElementById('classSelect');
    var classNumber = classSelect.value
    var yearSelect = document.getElementById('periodSelectYear');
    var selectedYear = yearSelect.value;

    var performanceSelect = document.getElementById('performanceSelect');
    var performance = performanceSelect.value

    var teacherSelect = document.getElementById('teacherSelect');
    var selectedTeacher = teacherSelect.value; // Сохраняем текущее значение

    teacherSelect.innerHTML = '<option value="">Выберите преподавателя</option>';

    // Создание массива для хранения параметров
    var params = [];

    if (periodId) {
        params.push('period_id=' + encodeURIComponent(periodId));
    }
    if (classLetter) {
        params.push('class_letter=' + encodeURIComponent(classLetter));
    }
    if (subjectId) {
        params.push('subject_id=' + encodeURIComponent(subjectId));
    }
    if (classNumber) {
        params.push('class_number=' + encodeURIComponent(classNumber));
    }
    if (selectedYear) {
        params.push('selected_year=' + encodeURIComponent(selectedYear));
    }
    params.push('performance=' + encodeURIComponent(performance))

    // Формирование строки параметров URL
    var queryString = params.length ? '?' + params.join('&') : '';

    fetch('/api/teachers' + queryString)
        .then(response => response.json())
        .then(teachers => {
            teachers.forEach(teacher => {
                var option = document.createElement('option');
                option.value = teacher.id_teacher;
                option.textContent = teacher.full_name;
                teacherSelect.appendChild(option);
            });

           // Восстанавливаем выбранное значение
           if (selectedTeacher) {
                teacherSelect.value = selectedTeacher;
            }
        })
        .catch(error => console.error('Error loading teachers:', error)); // Восстанавливаем выбранное значение
}

// Функция для загрузки периодов по предмету, учителю, классу и букве класса
function loadPeriods() {
    var subjectSelect = document.getElementById('subjectSelect');
    var subjectId = subjectSelect.value;
    var teacherSelect = document.getElementById('teacherSelect');
    var teacherId = teacherSelect.value;
    var classSelect = document.getElementById('classSelect');
    var classNumber = classSelect.value;
    var classLetterSelect = document.getElementById('classLetterSelect');
    var classLetter = classLetterSelect.value;
    var yearSelect = document.getElementById('periodSelectYear');
    var selectedYear = yearSelect.value;

    var periodSelect = document.getElementById('periodSelect');
    var selectedPeriod = periodSelect.value; // Сохраняем текущее значение

    periodSelect.innerHTML = '<option value="">Выберите период</option>';

    var performanceSelect = document.getElementById('performanceSelect');
    var performance = performanceSelect.value

    // Создание массива для хранения параметров
    var params = [];

    if (teacherId) {
        params.push('teacher_id=' + encodeURIComponent(teacherId));
    }
    if (classLetter) {
        params.push('class_letter=' + encodeURIComponent(classLetter));
    }
    if (subjectId) {
        params.push('subject_id=' + encodeURIComponent(subjectId));
    }
    if (classNumber) {
        params.push('class_number=' + encodeURIComponent(classNumber));
    }
    if (selectedYear) {
        params.push('selected_year=' + encodeURIComponent(selectedYear));
    }
    params.push('performance=' + encodeURIComponent(performance))

    // Формирование строки параметров URL
    var queryString = params.length ? '?' + params.join('&') : '';

    fetch('/api/periods' + queryString)
        .then(response => response.json())
        .then(periods => {
            periods.forEach(period => {
                var option = document.createElement('option');
                option.value = period.id_period;
                option.textContent = period.period;
                periodSelect.appendChild(option);
            });

            // Восстанавливаем выбранное значение
            if (selectedPeriod) {
                    periodSelect.value = selectedPeriod;
                }
            })
            .catch(error => console.error('Error loading period:', error)); // Восстанавливаем выбранное значение
}

// Функция для загрузки предметов по учителю, классу, периоду и букве класса
function loadSubjects() {
    var teacherSelect = document.getElementById('teacherSelect');
    var teacherId = teacherSelect.value;
    var classSelect = document.getElementById('classSelect');
    var classNumber = classSelect.value;
    var classLetterSelect = document.getElementById('classLetterSelect');
    var classLetter = classLetterSelect.value;
    var periodSelect = document.getElementById('periodSelect');
    var periodId = periodSelect.value;
    var yearSelect = document.getElementById('periodSelectYear');
    var selectedYear = yearSelect.value;

    var subjectSelect = document.getElementById('subjectSelect');
    var selectedSubject = subjectSelect.value; // Сохраняем текущее значение

    subjectSelect.innerHTML = '<option value="">Выберите предмет</option>';

    var performanceSelect = document.getElementById('performanceSelect');
    var performance = performanceSelect.value

    // Создание массива для хранения параметров
    var params = [];

    if (teacherId) {
        params.push('teacher_id=' + encodeURIComponent(teacherId));
    }
    if (classLetter) {
        params.push('class_letter=' + encodeURIComponent(classLetter));
    }
    if (periodId) {
        params.push('period_id=' + encodeURIComponent(periodId));
    }
    if (classNumber) {
        params.push('class_number=' + encodeURIComponent(classNumber));
    }
    if (selectedYear) {
        params.push('selected_year=' + encodeURIComponent(selectedYear));
    }
    params.push('performance=' + encodeURIComponent(performance))

    // Формирование строки параметров URL
    var queryString = params.length ? '?' + params.join('&') : '';

    fetch('/api/subjects' + queryString)
        .then(response => response.json())
        .then(subjects => {
            subjects.forEach(subject => {
                var option = document.createElement('option');
                option.value = subject.id_subject;
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            });
            // Восстанавливаем выбранное значение
            if (selectedSubject) {
                subjectSelect.value = selectedSubject;
            }
        })
        .catch(error => console.error('Error loading subject:', error)); // Восстанавливаем выбранное значение
}

// Функция для загрузки классов по учителю, букве класса, периоду и предмету
function loadClasses() {
    var teacherSelect = document.getElementById('teacherSelect');
    var teacherId = teacherSelect.value;
    var classLetterSelect = document.getElementById('classLetterSelect');
    var classLetter = classLetterSelect.value;
    var periodSelect = document.getElementById('periodSelect');
    var periodId = periodSelect.value;
    var subjectSelect = document.getElementById('subjectSelect');
    var subjectId = subjectSelect.value;
    var yearSelect = document.getElementById('periodSelectYear');
    var selectedYear = yearSelect.value;

    var classSelect = document.getElementById('classSelect');
    var selectedClass = classSelect.value; // Сохраняем текущее значение

    classSelect.innerHTML = '<option value="">Выберите класс</option>';

    var performanceSelect = document.getElementById('performanceSelect');
    var performance = performanceSelect.value

    // Создание массива для хранения параметров
    var params = [];

    if (teacherId) {
        params.push('teacher_id=' + encodeURIComponent(teacherId));
    }
    if (classLetter) {
        params.push('class_letter=' + encodeURIComponent(classLetter));
    }
    if (periodId) {
        params.push('period_id=' + encodeURIComponent(periodId));
    }
    if (subjectId) {
        params.push('subject_id=' + encodeURIComponent(subjectId));
    }
    if (selectedYear) {
        params.push('selected_year=' + encodeURIComponent(selectedYear));
    }
    params.push('performance=' + encodeURIComponent(performance))

    // Формирование строки параметров URL
    var queryString = params.length ? '?' + params.join('&') : '';

    fetch('/api/classes' + queryString)
        .then(response => response.json())
        .then(classes => {
            classes.forEach(classNumber => {
                var option = document.createElement('option');
                option.value = classNumber;
                option.textContent = classNumber;
                classSelect.appendChild(option);
            });
            // Восстанавливаем выбранное значение
            if (selectedClass) {
                classSelect.value = selectedClass;
            }
        })
        .catch(error => console.error('Error loading class_number:', error)); // Восстанавливаем выбранное значение
}

// Функция для загрузки букв классов по учителю, классу, периоду и предмету
function loadClassLetters() {
    var teacherSelect = document.getElementById('teacherSelect');
    var teacherId = teacherSelect.value;
    var classSelect = document.getElementById('classSelect');
    var classNumber = classSelect.value;
    var periodSelect = document.getElementById('periodSelect');
    var periodId = periodSelect.value;
    var subjectSelect = document.getElementById('subjectSelect');
    var subjectId = subjectSelect.value;
    var yearSelect = document.getElementById('periodSelectYear');
    var selectedYear = yearSelect.value;

    var classLetterSelect = document.getElementById('classLetterSelect');
    var selectedClassLetter = classLetterSelect.value; // Сохраняем текущее значение

    classLetterSelect.innerHTML = '<option value="">Выберите букву класса</option>';

    var performanceSelect = document.getElementById('performanceSelect');
    var performance = performanceSelect.value

    // Создание массива для хранения параметров
    var params = [];

    if (teacherId) {
        params.push('teacher_id=' + encodeURIComponent(teacherId));
    }
    if (classNumber) {
        params.push('class_number=' + encodeURIComponent(classNumber));
    }
    if (periodId) {
        params.push('period_id=' + encodeURIComponent(periodId));
    }
    if (subjectId) {
        params.push('subject_id=' + encodeURIComponent(subjectId));
    }
    if (selectedYear) {
        params.push('selected_year=' + encodeURIComponent(selectedYear));
    }
    params.push('performance=' + encodeURIComponent(performance))

    // Формирование строки параметров URL
    var queryString = params.length ? '?' + params.join('&') : '';

    fetch('/api/class_letters' + queryString)
        .then(response => response.json())
        .then(classLetters => {
            classLetters.forEach(letter => {
                var option = document.createElement('option');
                if (letter !== null) {
                    option.value = letter;
                    option.textContent = letter;
                    classLetterSelect.appendChild(option);
                }
            });
            // Восстанавливаем выбранное значение
            if (selectedClassLetter) {
                classLetterSelect.value = selectedClassLetter;
            }
        })
        .catch(error => console.error('Error loading class_letter:', error)); // Восстанавливаем выбранное значение
}

// Функция для загрузки года обучения
function loadYears() {
    var teacherSelect = document.getElementById('teacherSelect');
    var teacherId = teacherSelect.value;
    var classSelect = document.getElementById('classSelect');
    var classNumber = classSelect.value;
    var classLetterSelect = document.getElementById('classLetterSelect');
    var classLetter = classLetterSelect.value;
    var periodSelect = document.getElementById('periodSelect');
    var periodId = periodSelect.value;
    var subjectSelect = document.getElementById('subjectSelect');
    var subjectId = subjectSelect.value;

    var yearSelect = document.getElementById('periodSelectYear');
    var selectedYear = yearSelect.value; // Сохраняем текущее значение

    yearSelect.innerHTML = '<option value="">Выберите год обучения</option>';

    var performanceSelect = document.getElementById('performanceSelect');
    var performance = performanceSelect.value

    // Создание массива для хранения параметров
    var params = [];

    if (teacherId) {
        params.push('teacher_id=' + encodeURIComponent(teacherId));
    }
    if (classLetter) {
        params.push('class_letter=' + encodeURIComponent(classLetter));
    }
    if (periodId) {
        params.push('period_id=' + encodeURIComponent(periodId));
    }
    if (classNumber) {
        params.push('class_number=' + encodeURIComponent(classNumber));
    }
    if (subjectId) {
        params.push('subject_id=' + encodeURIComponent(subjectId));
    }
    params.push('performance=' + encodeURIComponent(performance))

    // Формирование строки параметров URL
    var queryString = params.length ? '?' + params.join('&') : '';

    fetch('/api/year_load' + queryString)
        .then(response => response.json())
        .then(years => {
            years.forEach(year => {
                var option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
            // Восстанавливаем выбранное значение
            if (selectedYear) {
                yearSelect.value = selectedYear;
            }
        })
        .catch(error => console.error('Error loading year:', error)); // Восстанавливаем выбранное значение
}

// Функция для загрузки данных при изменении значений селекторов
document.addEventListener('DOMContentLoaded', function () {
    var subjectSelect = document.getElementById('subjectSelect');
    var teacherSelect = document.getElementById('teacherSelect');
    var classLetterSelect = document.getElementById('classLetterSelect');
    var periodSelect = document.getElementById('periodSelect');
    var classSelect = document.getElementById('classSelect');
    var performanceSelect = document.getElementById('performanceSelect');
    var yearSelect = document.getElementById('periodSelectYear')

    performanceSelect.addEventListener('change', function () {
        loadClassLetters();
        loadClasses();
        loadSubjects();
        loadPeriods();
        loadTeachers();
        loadYears();
    });

    subjectSelect.addEventListener('change', function () {
        loadTeachers();
        loadPeriods();
        loadClasses();
        loadClassLetters();
        loadYears();
    });

    teacherSelect.addEventListener('change', function () {
        loadPeriods();
        loadSubjects();
        loadClasses();
        loadClassLetters();
        loadYears();
    });

    classLetterSelect.addEventListener('change', function () {
        loadTeachers();
        loadPeriods();
        loadSubjects();
        loadClasses();
        loadYears();
    });

    periodSelect.addEventListener('change', function () {
        loadTeachers();
        loadSubjects();
        loadClasses();
        loadClassLetters();
        loadYears();
    });

    classSelect.addEventListener('change', function () {
        loadTeachers();
        loadPeriods();
        loadSubjects();
        loadClassLetters();
        loadYears();
    });

    yearSelect.addEventListener('change', function () {
        loadTeachers();
        loadPeriods();
        loadSubjects();
        loadClasses();
        loadClassLetters();
    });

    // Инициализация селекторов при загрузке страницы
    
    loadClassLetters();
    loadClasses();
    loadSubjects();
    loadPeriods();
    loadTeachers();
    loadYears();
});


// ABC-анализ
function analyzeABCData() {
    function checkLearningPeriods(selector) {
        var theadRows = $(selector).closest('thead').find('tr');
        var hasLearningPeriods = false;
    
        theadRows.each(function () {
            if ($(this).text().includes("Учебные периоды")) {
                hasLearningPeriods = true;
            }
        });
    
        return hasLearningPeriods;
    }

    
    function checkTheadRowCount(selector, expectedCount = 2) {
        var theadRows = $(selector).closest('thead').find('tr');
        return theadRows.length === expectedCount;
    }

    if (!checkLearningPeriods("thead th") || !checkTheadRowCount("thead th", 2)){
        var tableData = [];
        var columns = [];
        var monthCol = [];
        
        function processHeaders(selector, indexOffset = 0) {
            var result = [];
            $(selector).each(function () {
                var colspan = parseInt($(this).attr('colspan') || 1, 10);
                var headerText = $(this).text().trim();
                for (var i = 0; i < colspan; i++) {
                    result.push({ header: headerText, index: result.length + indexOffset });
                }
            });
            return result;
        }
        
        var columns = processHeaders('#studentTable thead tr:nth-child(1) th');
        var monthCol = processHeaders('#studentTable thead tr:nth-child(2) th', 2); // смещение +2 индекса
        
        
        // Удаляем дубликаты заголовков, но сохраняем их индексы
        var uniqueColumns = [];
        columns.forEach(col => {
            if (!uniqueColumns.some(uniqueCol => uniqueCol.header === col.header)) {
                uniqueColumns.push(col);
            }
        });

        var uniqueColumnsMonth = [];
        monthCol.forEach(col => {
            if (!uniqueColumnsMonth.some(uniqueCol => uniqueCol.header === col.header)) {
                uniqueColumnsMonth.push(col);
            }
        });

        $('#studentTable tbody tr').each(function () {
            var rowDataColumns = uniqueColumns.map(col => processCell(this, col, columns));
            var rowDataMonths = uniqueColumnsMonth.map(col => processCell(this, col, monthCol));
            
            // Добавляем в разные массивы, если требуется
            tableData.push(rowDataColumns.concat(rowDataMonths));
        });
        
        function processCell(row, col, columnList) {
            var columnValues = columnList
                .filter(c => c.header === col.header)
                .map(column => {
                    var cellValue = $(row).find(`td:nth-child(${column.index + 1})`).text().trim();
                    if (cellValue === "ОТ" || cellValue === "Б") return 1;
                    if (cellValue === "") return 0;
                    return !isNaN(cellValue) ? parseFloat(cellValue) : cellValue;
                });
        
            return columnValues.length === 1 && typeof columnValues[0] === "string"
                ? columnValues[0] // Если единственное значение - строка, возвращаем как есть
                : columnValues.reduce((acc, val) => acc + (typeof val === "number" ? val : 0), 0); // Суммируем только числа
            
        }

        // Выводим массив строк - только заголовки для DataFrame
        var allUniqueColumns = [...uniqueColumns, ...uniqueColumnsMonth]; // Объединяем массивы
        var columnHeaders = allUniqueColumns.map(col => col.header); // Извлекаем заголовки
    }
    else{
        var tableData = [];
        var columns = [];
    
        // Обработка первой строки заголовка (первый tr)
        $('#studentTable thead tr:nth-child(1) th').each(function () {
            var colspan = $(this).attr('colspan');
            if (colspan) {
                // Обработка второй строки заголовка (второй tr)
                var secondRowHeaders = document.querySelectorAll('#studentTable thead tr:nth-child(2) th');
                for (var i = 0; i < colspan; i++) {
                    columns.push(secondRowHeaders[i].textContent);
                }
            } else {
                // Если colspan не указан, добавляем просто название столбца
                columns.push($(this).text());
            }
        });
    
        // Обработка данных в теле таблицы
        $('#studentTable tbody tr').each(function () {
            var rowData = [];
            $(this).find('td').each(function () {
                if ($(this).text().trim() == '') {
                    rowData.push('0');
                }
                else{
                    if($(this).text().trim() == "ОТ" || $(this).text().trim() == 'Б') {
                        rowData.push('1');
                    }
                    else{
                        rowData.push($(this).text());
                    }
                }
            });
            tableData.push(rowData);
        });

        var columnHeaders = [...columns];
    }

    // // Вывод результата (для отладки)
    // console.log("Unique Columns:", uniqueColumns);
    // console.log("Unique Columns Month:", uniqueColumnsMonth);
    // console.log("Table Data (column sums):", tableData);


    // Получаем значения из меню настроек
    var thresholdA = parseFloat($('#thresholdA').val());
    var thresholdB = parseFloat($('#thresholdB').val());
    var thresholdC = parseFloat($('#thresholdC').val());

    var analysisType = $('#analysisType').val(); // Получаем выбранную меру из меню
    var analysisMeasure = $('#analysisMeasure option:selected').text().trim(); // Мера анализа

    // Округляем значения до 10 знаков после запятой
    thresholdA = parseFloat(thresholdA.toFixed(10));
    thresholdB = parseFloat(thresholdB.toFixed(10));
    thresholdC = parseFloat(thresholdC.toFixed(10));

    // Проверка, что сумма порогов равна 1
    if (Math.abs(thresholdA + thresholdB + thresholdC - 1) > 0.0000001) {
        alert("Ошибка: Сумма порогов должна быть равна 1.");
        return;
    }


    $.ajax({
        url: '/analyzeabc',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ data: tableData, columns: columnHeaders, thresholds: { A: thresholdA, B: thresholdB, C: thresholdC }, analysisMeasure: analysisMeasure, analysisType: analysisType }),
        success: function (response) {
            console.log("Server Response: ", response);

            var analysisMeasure = $('#analysisMeasure option:selected').text(); // Получаем текст выбранной опции из меню

            console.log("Current analysisMeasure: ", analysisMeasure); // Отладочный вывод

            var analysisType = $('#analysisType').val(); // Получаем выбранную меру из меню
            var analysisHeader = document.getElementById('analysisHeader');

            analysisHeader.style.display = 'block';
            if (analysisType == 'attendance') {
                analysisHeader.textContent = 'ABC-анализ посещаемости'
            }
            else {
                analysisHeader.textContent = 'ABC-анализ успеваемости'
            }

            $('#resTable thead').empty();
            var headerRow = '<tr>';
            headerRow += '<th>№</th>';
            headerRow += '<th>Ученики</th>';
            headerRow += `<th>${analysisMeasure}</th>`;
            headerRow += '<th>Процент</th>';
            headerRow += '<th>Кумулятивный процент</th>';
            headerRow += '<th>Категория</th>';
            headerRow += '</tr>';
            $('#resTable thead').append(headerRow);

            var sumMeasure = 0;

            $('#resTable tbody').empty();
            response.forEach(function (row) {
                var rowClass;
                if (row['Категория'] === 'A') {
                    rowClass = 'row-category-a';
                } else if (row['Категория'] === 'B') {
                    rowClass = 'row-category-b';
                } else if (row['Категория'] === 'C') {
                    rowClass = 'row-category-c';
                }

                var newRow = `<tr class="${rowClass}">`;
                newRow += `<td>${row['№']}</td>`;
                newRow += `<td>${row['Ученики']}</td>`;
                newRow += `<td>${row[analysisMeasure]}</td>`;
                newRow += `<td>${row['Процент']}</td>`;
                newRow += `<td>${row['Кумулятивный процент']}</td>`;
                newRow += `<td>${row['Категория']}</td>`;
                newRow += '</tr>';
                sumMeasure += parseFloat(row[analysisMeasure].toFixed(2));
                $('#resTable tbody').append(newRow);
            });

            var newRow = '<tr>';
            newRow += `<td>Сумма</td>`;
            newRow += `<td>-</td>`;
            newRow += `<td>${sumMeasure}</td>`;
            newRow += `<td>100%</td>`;
            newRow += `<td>-</td>`;
            newRow += `<td>-</td>`;
            newRow += '</tr>';
            $('#resTable tbody').append(newRow);

            $('.containerTable1').css('display', 'table');

            google.charts.load('current', { packages: ['corechart', 'bar'] });
            google.charts.setOnLoadCallback(drawChart);

            function drawChart() {
                var dataArray = [
                    ['Ученики', analysisMeasure, { role: 'style' }, { role: 'tooltip', 'p': { 'html': true } }]
                ];

                response.forEach(function (row) {
                    var color;
                    if (row['Категория'] === 'A') {
                        color = 'green';
                    } else if (row['Категория'] === 'B') {
                        color = 'yellow';
                    } else {
                        color = 'red';
                    }
                    var tooltip = '<div style="padding:5px;"><b>Ученик: ' + row['Ученики'] + '</b><br><b>' + analysisMeasure + ': ' + row[analysisMeasure] + '</b><br><b>Категория: ' + row['Категория'] + '</b></div>';
                    dataArray.push([row['Ученики'], parseFloat(row[analysisMeasure]), color, tooltip]);
                });

                var data = google.visualization.arrayToDataTable(dataArray);

                var options = {
                    title: 'ABC-анализ ' + (analysisType == 'attendance' ? 'посещаемости' : 'успеваемости'),
                    hAxis: {
                        title: 'Ученики'
                    },
                    vAxis: {
                        title: analysisMeasure
                    },
                    legend: { position: 'none' },
                    tooltip: { isHtml: true }
                };

                var chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
                chart.draw(data, options);
            }

            // После отрисовки графика делаем блок с рекомендациями видимым
            document.getElementById('recommendations').style.display = 'block';
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX Error:', textStatus, errorThrown);
            alert('Ошибка: не удалось выполнить анализ данных.');
        }
    });
}



// XYZ-анализ
function analyzeXYZData() {
    function checkLearningPeriods(selector) {
        var theadRows = $(selector).closest('thead').find('tr');
        var hasLearningPeriods = false;
    
        theadRows.each(function () {
            if ($(this).text().includes("Учебные периоды")) {
                hasLearningPeriods = true;
            }
        });
    
        return hasLearningPeriods;
    }

    
    function checkTheadRowCount(selector, expectedCount = 2) {
        var theadRows = $(selector).closest('thead').find('tr');
        return theadRows.length === expectedCount;
    }

    if (!checkLearningPeriods("thead th") || !checkTheadRowCount("thead th", 2)){
        var tableData = [];
        var columns = [];
        var monthCol = [];
        
        function processHeaders(selector, indexOffset = 0) {
            var result = [];
            $(selector).each(function () {
                var colspan = parseInt($(this).attr('colspan') || 1, 10);
                var headerText = $(this).text().trim();
                for (var i = 0; i < colspan; i++) {
                    result.push({ header: headerText, index: result.length + indexOffset });
                }
            });
            return result;
        }
        
        var columns = processHeaders('#studentTable thead tr:nth-child(1) th');
        var monthCol = processHeaders('#studentTable thead tr:nth-child(2) th', 2); // смещение +2 индекса
        
        
        // Удаляем дубликаты заголовков, но сохраняем их индексы
        var uniqueColumns = [];
        columns.forEach(col => {
            if (!uniqueColumns.some(uniqueCol => uniqueCol.header === col.header)) {
                uniqueColumns.push(col);
            }
        });

        var uniqueColumnsMonth = [];
        monthCol.forEach(col => {
            if (!uniqueColumnsMonth.some(uniqueCol => uniqueCol.header === col.header)) {
                uniqueColumnsMonth.push(col);
            }
        });

        $('#studentTable tbody tr').each(function () {
            var rowDataColumns = uniqueColumns.map(col => processCell(this, col, columns));
            var rowDataMonths = uniqueColumnsMonth.map(col => processCell(this, col, monthCol));
            
            // Добавляем в разные массивы, если требуется
            tableData.push(rowDataColumns.concat(rowDataMonths));
        });
        
        function processCell(row, col, columnList) {
            var columnValues = columnList
                .filter(c => c.header === col.header)
                .map(column => {
                    var cellValue = $(row).find(`td:nth-child(${column.index + 1})`).text().trim();
                    if (cellValue === "ОТ" || cellValue === "Б") return 1;
                    if (cellValue === "") return 0;
                    return !isNaN(cellValue) ? parseFloat(cellValue) : cellValue;
                });
        
            return columnValues.length === 1 && typeof columnValues[0] === "string"
                ? columnValues[0] // Если единственное значение - строка, возвращаем как есть
                : columnValues.reduce((acc, val) => acc + (typeof val === "number" ? val : 0), 0); // Суммируем только числа
            
        }

        // Выводим массив строк - только заголовки для DataFrame
        var allUniqueColumns = [...uniqueColumns, ...uniqueColumnsMonth]; // Объединяем массивы
        var columnHeaders = allUniqueColumns.map(col => col.header); // Извлекаем заголовки
    }
    else{
        var tableData = [];
        var columns = [];
    
        // Обработка первой строки заголовка (первый tr)
        $('#studentTable thead tr:nth-child(1) th').each(function () {
            var colspan = $(this).attr('colspan');
            if (colspan) {
                // Обработка второй строки заголовка (второй tr)
                var secondRowHeaders = document.querySelectorAll('#studentTable thead tr:nth-child(2) th');
                for (var i = 0; i < colspan; i++) {
                    columns.push(secondRowHeaders[i].textContent);
                }
            } else {
                // Если colspan не указан, добавляем просто название столбца
                columns.push($(this).text());
            }
        });
    
        // Обработка данных в теле таблицы
        $('#studentTable tbody tr').each(function () {
            var rowData = [];
            $(this).find('td').each(function () {
                if ($(this).text().trim() == '') {
                    rowData.push('0');
                }
                else{
                    if($(this).text().trim() == "ОТ" || $(this).text().trim() == 'Б') {
                        rowData.push('1');
                    }
                    else{
                        rowData.push($(this).text());
                    }
                }
            });
            tableData.push(rowData);
        });

        var columnHeaders = [...columns];
    }

    // Получаем значения из меню настроек
    var thresholdX = parseFloat($('#thresholdX').val());
    var thresholdY = parseFloat($('#thresholdY').val());
    var thresholdZ = parseFloat($('#thresholdZ').val());
    var analysisMeasure1 = $('#startQuarter option:selected').text(); // Получаем текст выбранной опции из меню
    var analysisMeasure2 = $('#endQuarter option:selected').text(); // Получаем текст выбранной опции из меню

    // Проверка, что пороги в сумме дают 1
    if (thresholdX + thresholdY + thresholdZ !== 100) {
        alert("Ошибка: Сумма порогов должна быть равна 100.");
        return;
    }

    $.ajax({
        url: '/analyzexyz',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ data: tableData, columns: columnHeaders, thresholds: { X: thresholdX, Y: thresholdY, Z: thresholdZ }, analysisMeasure1: analysisMeasure1, analysisMeasure2: analysisMeasure2 }),
        success: function (response) {
            console.log("Server Response: ", response);

            var analysisMeasure1 = $('#startQuarter option:selected').text(); // Получаем текст выбранной опции из меню
            var analysisMeasure2 = $('#endQuarter option:selected').text(); // Получаем текст выбранной опции из меню
            var analysisMeasure = analysisMeasure1 + " - " + analysisMeasure2;

            console.log("Current startQuarter: ", analysisMeasure); // Отладочный вывод

            var analysisType = $('#analysisType').val(); // Получаем выбранную меру из меню
            var analysisHeader = document.getElementById('analysisHeader');

            analysisHeader.style.display = 'block';
            if (analysisType == 'attendance') {
                analysisHeader.textContent = 'XYZ-анализ посещаемости'
            }
            else {
                analysisHeader.textContent = 'XYZ-анализ успеваемости'
            }

            $('#resTable thead').empty();
            var headerRow = '<tr>';
            headerRow += '<th>№</th>';
            headerRow += '<th>Ученики</th>';
            headerRow += `<th>${analysisMeasure}</th>`;
            headerRow += '<th>Коэффициент вариации</th>';
            headerRow += '<th>Категория</th>';
            headerRow += '</tr>';
            $('#resTable thead').append(headerRow);

            var sumMeasure = 0;

            $('#resTable tbody').empty();
            response.forEach(function (row) {
                var rowClass;
                if (row['Категория'] === 'X') {
                    rowClass = 'row-category-x';
                } else if (row['Категория'] === 'Y') {
                    rowClass = 'row-category-y';
                } else if (row['Категория'] === 'Z') {
                    rowClass = 'row-category-z';
                }

                var newRow = `<tr class="${rowClass}">`;
                newRow += `<td>${row['№']}</td>`;
                newRow += `<td>${row['Ученики']}</td>`;
                newRow += `<td>${row["Анализируемый период"]}</td>`;
                newRow += `<td>${row['Коэффициент вариации']}</td>`;
                newRow += `<td>${row['Категория']}</td>`;
                newRow += '</tr>';
                sumMeasure += parseFloat(row["Анализируемый период"]);
                $('#resTable tbody').append(newRow);
            });

            var newRow = '<tr>';
            newRow += `<td>Сумма</td>`;
            newRow += `<td>-</td>`;
            newRow += `<td>${sumMeasure}</td>`;
            newRow += `<td>100%</td>`;
            newRow += `<td>-</td>`;
            newRow += '</tr>';
            $('#resTable tbody').append(newRow);

            $('.containerTable1').css('display', 'table');

            google.charts.load('current', { packages: ['corechart', 'bar'] });
            google.charts.setOnLoadCallback(drawChart);

            function drawChart() {
                var dataArray = [
                    ['Ученики', analysisMeasure, { role: 'style' }, { role: 'tooltip', 'p': { 'html': true } }]
                ];

                response.forEach(function (row) {
                    var color;
                    if (row['Категория'] === 'X') {
                        color = 'green';
                    } else if (row['Категория'] === 'Y') {
                        color = 'yellow';
                    } else {
                        color = 'red';
                    }
                    var tooltip = '<div style="padding:5px;"><b>Ученик: ' + row['Ученики'] + '</b><br><b>' + analysisMeasure + ': ' + row["Анализируемый период"] + '</b><br><b>Категория: ' + row['Категория'] + '</b></div>';
                    dataArray.push([row['Ученики'], parseFloat(row["Анализируемый период"]), color, tooltip]);
                });

                var data = google.visualization.arrayToDataTable(dataArray);

                var options = {
                    title: 'XYZ-анализ ' + (analysisType == 'attendance' ? 'посещаемости' : 'успеваемости'),
                    hAxis: {
                        title: 'Ученики'
                    },
                    vAxis: {
                        title: analysisMeasure
                    },
                    legend: { position: 'none' },
                    tooltip: { isHtml: true }
                };

                var chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
                chart.draw(data, options);
            }

            // После отрисовки графика делаем блок с рекомендациями видимым
            document.getElementById('recommendations').style.display = 'block';
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX Error:', textStatus, errorThrown);
            alert('Ошибка: не удалось выполнить анализ данных.');
        }
    });
}
////////////////////////////////////////////////////////////////////////////////////////////////////
// Загрузка фото
// document.addEventListener('DOMContentLoaded', function () {
//     const photoInput = document.getElementById('photoInput');
//     const photoPreviewContainer = document.getElementById('photoPreviewContainer');
//     const photoUploadArea = document.getElementById('photoUploadArea');

//     // Клик по области загрузки вызывает клик по input[type="file"] только если файл не выбран
//     photoUploadArea.addEventListener('click', () => {
//         photoInput.click();
//     });

//     // Обновление превью фотографий
//     photoInput.addEventListener('change', function () {
//         photoPreviewContainer.innerHTML = ''; // Очищаем контейнер
//         Array.from(photoInput.files).forEach((file, index) => {
//             const reader = new FileReader();
//             reader.onload = (e) => {
//                 const wrapper = document.createElement('div');
//                 wrapper.classList.add('photo-wrapper');

//                 const img = document.createElement('img');
//                 img.src = e.target.result;

//                 const removeButton = document.createElement('button');
//                 removeButton.classList.add('remove-photo');
//                 removeButton.innerText = '×';
//                 removeButton.setAttribute('data-index', index);

//                 removeButton.addEventListener('click', () => {
//                     removePhoto(index);
//                 });

//                 wrapper.appendChild(img);
//                 wrapper.appendChild(removeButton);
//                 photoPreviewContainer.appendChild(wrapper);
//             };
//             reader.readAsDataURL(file);
//         });

//         // Используем количество файлов в photoInput для проверки
//         toggleUploadAreaVisibility();
//     });

//     // Поддержка Drag & Drop
//     photoUploadArea.addEventListener('dragover', (e) => {
//         e.preventDefault();
//         photoUploadArea.style.borderColor = '#007bff';
//     });

//     photoUploadArea.addEventListener('dragleave', () => {
//         photoUploadArea.style.borderColor = '#ccc';
//     });

//     photoUploadArea.addEventListener('drop', (e) => {
//         e.preventDefault();
//         const files = e.dataTransfer.files;
//         photoInput.files = files;
//         const event = new Event('change');
//         photoInput.dispatchEvent(event);
//     });

//     // Удаление фотографии
//     function removePhoto(indexToRemove) {
//         const fileListArray = Array.from(photoInput.files);
//         fileListArray.splice(indexToRemove, 1);

//         // Обновляем input с файлами
//         const dataTransfer = new DataTransfer();
//         fileListArray.forEach((file) => dataTransfer.items.add(file));
//         photoInput.files = dataTransfer.files;

//         // Обновляем превью
//         const event = new Event('change');
//         photoInput.dispatchEvent(event);
//     }

//     // Функция для скрытия или отображения области загрузки
//     function toggleUploadAreaVisibility() {
//         if (photoInput.files.length > 0) {
//             photoUploadArea.classList.add('hide');  // Скрываем блок с загрузкой
//         } else {
//             photoUploadArea.classList.remove('hide');  // Показываем блок с загрузкой
//         }
//     }
// });

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

// function validateDatesAndPhotos() {
//     const datesCount = selectedDatesList.children.length;
//     const photosCount = photoInput.files.length;

//     const message = document.getElementById('validationMessage');
//     if (!message) {
//         const validationDiv = document.createElement('div');
//         validationDiv.id = 'validationMessage';
//         document.querySelector('.containerForUploadPhotos').appendChild(validationDiv);
//     }

//     if (datesCount !== photosCount) {
//         message.textContent = `Количество выбранных дат (${datesCount}) и загруженных фотографий (${photosCount}) не совпадает.`;
//         message.style.color = 'red';
//     } else {
//         message.textContent = 'Все проверки пройдены.';
//         message.style.color = 'green';
//     }
// }

// function renderAttendanceTable(data) {
//     const table = document.getElementById('studentTable');
//     const thead = table.querySelector('thead');
//     const tbody = table.querySelector('tbody');

//     // Очищаем текущие данные
//     thead.innerHTML = '';
//     tbody.innerHTML = '';

//     // Формируем заголовки
//     const headerRow = document.createElement('tr');
//     const dateHeader = document.createElement('th');
//     dateHeader.textContent = 'Дата';
//     const absentHeader = document.createElement('th');
//     absentHeader.textContent = 'Отсутствующие';
//     headerRow.appendChild(dateHeader);
//     headerRow.appendChild(absentHeader);
//     thead.appendChild(headerRow);

//     // Заполняем строки
//     Object.keys(data).forEach(date => {
//         const row = document.createElement('tr');
//         const dateCell = document.createElement('td');
//         dateCell.textContent = date;

//         const absentCell = document.createElement('td');
//         absentCell.textContent = data[date]['absent'].join(', ');

//         row.appendChild(dateCell);
//         row.appendChild(absentCell);
//         tbody.appendChild(row);
//     });

//     // Показываем таблицу
//     document.querySelector('.containerTable').style.display = 'block';
// }








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

                const analysisMeasure = $('#analysisMeasure');
                analysisMeasure.empty(); // Очищаем существующие опции
                
                const excludedIndices = [0, 1]; // Пропускаем первые два столбца
                const measures = new Set(); // Уникальные значения для опций
                
                // Функция проверки, что все значения в столбце, начиная с data[3], пустые
                function isColumnEmptyInRows(data, columnIndex) {
                    // Проверяем все строки, начиная с data[3]
                    return data.slice(3).every(row => !row[columnIndex] || row[columnIndex] === "");
                }

                // Функция для фильтрации заголовков, исключая столбцы, в которых все значения пустые начиная с data[3]
                function filterHeaders(headers, data) {
                    return headers.filter((header, index) => {
                        // Исключаем заголовки, если в соответствующем столбце, начиная с data[3], все значения пустые
                        return !isColumnEmptyInRows(data, index);
                    });
                }

                // Обработка всех возможных строк с заголовками
                const headers = [
                    ...filterHeaders(response.columns || [], response.data),  // Фильтруем для columns
                    ...filterHeaders(response.data[0] || [], response.data),  // Фильтруем для data[0]
                ];
                
                // Перебираем заголовки и добавляем уникальные значения
                headers.forEach((header, index) => {
                    if (!excludedIndices.includes(index)) {
                        // Проверяем, если это строка, и она не пустая
                        if (typeof header === "string" && header.trim() !== "") {
                            measures.add(header.trim()); // Добавляем уникальное значение в measures
                        }
                        // Если это не строка, но не пустое значение (не null и не undefined)
                        else if (header !== null && header !== undefined && header !== "") {
                            measures.add(header); // Добавляем значение как есть
                        }
                    }
                });
                
                // Генерация опций для селектора
                measures.forEach((measure) => {
                    analysisMeasure.append(`<option value="${measure}">${measure}</option>`);
                });
                
                if(analysisMeasure?.length){
                    // Если есть доступные опции, выбираем первую
                    if (analysisMeasure.children().length > 0) {
                        analysisMeasure.find('option').first().prop('selected', true);
                    } else {
                        alert('Нет доступных мер анализа.');
                    }
                }
                

                // Для XYZ-анализа
                const startMeasure = $('#startQuarter');
                startMeasure.empty(); // Очищаем существующие опции
                const endMeasure = $('#endQuarter');
                endMeasure.empty(); // Очищаем существующие опции

                // Генерация опций для селектора
                measures.forEach((measure) => {
                    startMeasure.append(`<option value="${measure}">${measure}</option>`);
                    endMeasure.append(`<option value="${measure}">${measure}</option>`);
                });
                
                if(startMeasure?.length && endMeasure?.length){
                    // Если есть доступные опции, выбираем первую
                    if (startMeasure.children().length > 0 && endMeasure.children().length > 0) {
                        startMeasure.find('option').first().prop('selected', true);
                        endMeasure.find('option').first().prop('selected', true);
                    } else {
                        alert('Нет доступных мер анализа.');
                    }
                }
                
                $('.containerTable').css('display', 'table');
            
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('AJAX Error:', textStatus, errorThrown);
                alert('Ошибка: Произошла ошибка при распознавании фото.');
            }
        });
    });
});


// Функция переключения вкладок
function openTab(evt, tabId) {
    // Скрываем все табы
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Убираем класс активности у кнопок
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Показываем выбранный таб
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}


// // Получение обновления прогресса
// socket.on('photo_processed', function (data) {
//     const progress = document.getElementById('progress');
//     progress.textContent = `Обработано фото ${data.photo_index} из ${data.total_photos}`;
    
//     const processedPhotos = document.getElementById('processedPhotos');
//     const studentList = data.recognized_students.map(id => `<li>Студент ID: ${id}</li>`).join('');
//     processedPhotos.innerHTML += `<p>Фото ${data.photo_index}: <ul>${studentList}</ul></p>`;
// });

// // Получение превью обработанного фото
// socket.on('photo_preview', function (data) {
//     const photoPreviewContainer = document.getElementById('photoPreviewContainer');
//     const img = document.createElement('img');
//     img.src = `data:image/jpeg;base64,${data.image}`;
//     img.className = 'photo-preview';
//     photoPreviewContainer.appendChild(img);
// });

// // Получение ошибок
// socket.on('processing_error', function (data) {
//     alert(`Ошибка обработки: ${data.error}`);
// });

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
    if (!photos.includes(photoSrc)) { // Предотвращение дублирования
        photos.push(photoSrc);
        updateCarousel();
    }
});

// Обработка ошибок
socket.on('processing_error', function (data) {
    alert(`Ошибка обработки: ${data.error}`);
});

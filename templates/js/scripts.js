google.charts.load('current', { packages: ['corechart','bar'] });

import {
    setClassNumber, setClassLetter,
    setSubjectId, setTeacherId,
    setAnalysis, setYear,
    getAll, getClassNumber, getClassLetter,
    getSubjectId, getTeacherId,
    getAnalysis, getYear, getThresholdA,
    getThresholdB, getThresholdC,
    setThresholdA, setThresholdB, setThresholdC,
    getThresholdX, getThresholdY, getThresholdZ,
    setThresholdX, setThresholdY, setThresholdZ,
    getTypeAnalyze, setTypeAnalyze
  } from './store.js';

//////////////////////Ш////А////П/////К/////А/////С///В////Е///Р////Х///У//////////////////////////////////////////////////////

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

            // Добавляем метрики для анализов
            measuresAdd(response);

            // Обновляем хранилище данных
            const p = response.params;

            try {
              setClassNumber( +p.classNumber );  // number
              setClassLetter( p.classLetter );  // string
              setSubjectId(    p.subjectId );   // integer
              setTeacherId(    p.teacherId );   // integer
              setAnalysis(     p.analysis );    // string
              setYear(         p.year );        // string "YYYY-YYYY"
            } catch (err) {
              console.error("Ошибка при установке параметров в store:", err);
            }

            $('.containerTable').css('display', 'table');
        },
        error: function (xhr, status, error) {
            console.error("Ошибка при загрузке данных:", error);
        }
    });
}
// «Пробрасываем» в глобальный scope
window.loadData = loadData;

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

// Табличное заполнение с помощью файла Excel
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

                // Добавляем метрики для анализов
                measuresAdd(response);

                // Обновляем хранилище данных
                const p = response.params;

                try {
                    setClassNumber( +p.classNumber );  // number
                    setClassLetter( p.classLetter );  // string
                    setSubjectId(    p.subjectId );   // integer
                    setTeacherId(    p.teacherId );   // integer
                    setAnalysis(     p.analysis );    // string
                    setYear(         p.year );        // string "YYYY-YYYY"
                } catch (err) {
                    console.error("Ошибка при установке параметров в store:", err);
                }

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

window.updateThresholdValue = updateThresholdValue

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

function parceForAnalysis(){
    var tableData = [];
    var columnHeaders = [];

    // 1) Проверяет, есть ли строка с текстом "Учебные периоды" ровно в шапке нашей таблицы
    function checkLearningPeriods() {
        return $('#studentTable thead tr')
        .toArray()
        .some(tr => $(tr).text().includes("Учебные периоды"));
    }
    
    // 2) Проверяет, что в шапке нашей таблицы ровно expectedCount строк
    function checkTheadRowCount(expectedCount = 2) {
        return $('#studentTable thead tr').length === expectedCount;
    }
    
    // 3) Логируем отдельно, чтобы убедиться:
    console.log("hasLearningPeriods:", checkLearningPeriods());
    console.log("theadRowCount:",      $('#studentTable thead tr').length);

    if (!checkLearningPeriods() || !checkTheadRowCount(2)){
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

        function parseCell(val) {
            if (val === '') return 0;
            if (val === 'ОТ' || val==='Б') return 1;
            return +val;
        }
                
        var headerRowsCount = $('#studentTable thead tr').length;

        if (headerRowsCount === 3) {
            // 1) Раскрываем colspan’ы и получаем три массива одинаковой длины:
            const head0 = []; // годы (повторяются по colspan)
            $('#studentTable thead tr:eq(0) th:not([rowspan="3"])').each(function(){
                const $th   = $(this);
                const span  = +($th.attr('colspan') || 1);
                for(let i = 0; i < span; i++) head0.push($th.text().trim());
            });

            const head1 = []; // месяцы
            $('#studentTable thead tr:eq(1) th').each(function(){
                const $th   = $(this);
                const span  = +($th.attr('colspan') || 1);
                for(let i = 0; i < span; i++) head1.push($th.text().trim());
            });

            const head2 = $('#studentTable thead tr:eq(2) th')
                            .map((_,th) => $(th).text().trim())
                            .get(); // дни

            // 2) Статические заголовки и их реальные позиции в строке:
            const staticThs = $('#studentTable thead tr:eq(0) th[rowspan="3"]')
                                .map((_,th)=>({
                                    header: $(th).text().trim(),
                                    pos:    $(th).index() // порядковый номер ячейки в <tr>
                                }))
                                .get();
            // staticThs[0]=№, staticThs[1]=Ученики, staticThs[2]=Итог за период

            // 3) Собираем «динамический» массив:
            //    year/month/day + реальная позиция = 2 + i, т.к. первые 2 — статические
            const dyn = head0.map((year,i)=>({
                year,
                month: head1[i],
                day:   head2[i],
                pos:   2 + i
            }));

            // 4) Уникальный порядок годов и месяцев
            const years = Array.from(new Set(head0));
            const monthsByYear = {};
            years.forEach(y => {
                monthsByYear[y] = {};
                dyn.filter(d => d.year === y)
                .forEach(d => {
                    if (!monthsByYear[y][d.month]) monthsByYear[y][d.month] = [];
                    monthsByYear[y][d.month].push(d);
                });
            });

            // 5) Формируем новый список заголовков
            columnHeaders.push(staticThs[0].header, staticThs[1].header); // «№», «Ученики»

            years.forEach(y => {
                Object.keys(monthsByYear[y]).forEach(m => {
                // все дни
                monthsByYear[y][m].forEach(d => {
                    columnHeaders.push(`${d.day} ${m} ${y}`);
                });
                // итог по месяцу
                columnHeaders.push(`${m} ${y}`);
                });
                // итог по году
                columnHeaders.push(y);
            });

            // затем итог за период
            columnHeaders.push(staticThs[2].header);

            // 6) Собираем данные строк — так, чтобы tableData был массивом массивов
            tableData = Array.from($('#studentTable tbody tr')).map(tr => {
                const texts = $(tr).find('td').map((_,td)=>$(td).text().trim()).get();
                const row = [];

                // №, Ученики
                row.push(parseCell(texts[ staticThs[0].pos ]));
                row.push(texts[ staticThs[1].pos ]);

                // динамика: дни→месяц→год
                years.forEach(y => {
                let sumYear = 0;
                Object.keys(monthsByYear[y]).forEach(m => {
                    let sumMonth = 0;
                    monthsByYear[y][m].forEach(d => {
                    const v = parseCell(texts[d.pos]);
                    row.push(v);
                    sumMonth += v;
                    });
                    row.push(sumMonth);
                    sumYear += sumMonth;
                });
                row.push(sumYear);
                });

                // Итог за период
                row.push(parseCell(texts[ texts.length - 1 ]));
                return row;
            });
        } else {
            // ДВУХУРОВНЕВАЯ thead ТАБЛИЦА
            var columns = [];
            var monthCol = [];
            
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

            // ФОРМИРОВАНИЕ TABLEDATA И COLUMNHEADERS
            // 1) Список месяцев в порядке их появления
            var months = uniqueColumns
            .map(c => c.header)
            .filter(h => monthCol.some(mc => {
                var parent = columns.find(col => col.index === mc.index).header;
                return parent === h;
            }));

            // 2) Группируем объекты дней по месяцу (с индексами)
            var daysByMonth = {};
            months.forEach(m => {
            daysByMonth[m] = monthCol.filter(mc => {
                var parent = columns.find(col => col.index === mc.index).header;
                return parent === m;
            });
            });

            // 3) Статические колонки (те, что идут после месяцев)
            var staticCols = uniqueColumns
            .filter(c =>
                c.header !== "№" &&
                c.header !== "Ученики" &&
                !months.includes(c.header)
            );

            // 4) Новый порядок заголовков
            var newColumnHeaders = ["№", "Ученики"];
            months.forEach(m => {
            // сначала дни
            daysByMonth[m].forEach(mc => {
                newColumnHeaders.push(mc.header + " " + m);
            });
            // потом сам месяц (сумма)
            newColumnHeaders.push(m);
            });
            // в конец — итоговые колонки
            staticCols.forEach(c => newColumnHeaders.push(c.header));

            // 5) Собираем tableData в новом порядке
            var newTableData = [];
            $('#studentTable tbody tr').each(function() {
            // 5.1) Вытягиваем все ячейки
            var rowValues = $(this).find('td').map((i, td) => {
                var t = $(td).text().trim();
                if (t === "")           return 0;
                if (t === "ОТ" || t === "Б") return 1;
                return !isNaN(t) ? parseFloat(t) : t;
            }).get();

            var newRow = [];
            // № и Ученики
            newRow.push(rowValues[0], rowValues[1]);

            // 5.2) Для каждого месяца: дни → сумма
            months.forEach(m => {
                // дни в порядке из daysByMonth
                daysByMonth[m].forEach(mc => {
                newRow.push(rowValues[mc.index]);
                });
                // сумма по этому месяцу
                var sum = daysByMonth[m]
                .reduce((acc, mc) => acc + (rowValues[mc.index] || 0), 0);
                newRow.push(sum);
            });

            // 5.3) Финальные статические колонки
            staticCols.forEach(c => {
                var idx = uniqueColumns.find(col => col.header === c.header).index;
                newRow.push(rowValues[idx]);
            });

            newTableData.push(newRow);
            });

            // 6) Применяем
            columnHeaders = newColumnHeaders;
            tableData = newTableData;
        }

    }
    else{

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

        columnHeaders = [...columns];
    }

    return { tableData, columnHeaders };
}

// ABC-анализ
function analyzeABCData() {
    // Получаем данные из таблицы
    var { tableData, columnHeaders } = parceForAnalysis();

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
            // Заполнение хранилища
            setThresholdA(thresholdA);
            setThresholdB(thresholdB); 
            setThresholdC(thresholdC);
            setTypeAnalyze('abc');
            setAnalysis(analysisType == 'attendance' ? 'attendance' : 'grades');

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

            // 1) Считаем количество по категориям
            // Подсчёт категорий
            const counts = { A: 0, B: 0, C: 0 };

            response.forEach(r => {
            const cat = r['Категория'];
            if (cat === 'A') counts.A++;
            if (cat === 'B') counts.B++;
            if (cat === 'C') counts.C++;
            });

            // 2) подготовим массив строк для DataTables
            var dtData = response.map(function(r){
                return [
                r['№'],
                r['Ученики'],
                r[analysisMeasure],
                r['Процент'],
                r['Кумулятивный процент'],
                r['Категория']
                ];
            });
            
            // 3) инициализация
            if ( $.fn.DataTable.isDataTable('#resTable') ) {
                $('#resTable').DataTable().clear().destroy();
            }
            
            $('#resTable').DataTable({
                data: dtData,
                columns: [
                { title: '№' },
                { title: 'Ученики' },
                { title: analysisMeasure },
                { title: 'Процент' },
                { title: 'Кумулятивный процент' },
                { title: 'Категория' }
                ],

                // отключаем первичную сортировку
                order: [],

                // сразу 100 строк
                pageLength: 100,
                lengthMenu: [ [10, 25, 50, 100], [10, 25, 50, 100] ],

                // экспорт-кнопки
                dom: 'lBfrtip',
                buttons: [
                    {
                    extend: 'copyHtml5',
                    text:    'Копировать',
                    className: 'btn btn-outline-secondary btn-sm'
                    },
                    {
                    extend: 'excelHtml5',
                    text:    'Excel',
                    className: 'btn btn-outline-success btn-sm'
                    },
                    {
                    extend: 'pdfHtml5',
                    text:    'PDF',
                    className: 'btn btn-outline-danger btn-sm'
                    },
                    {
                    extend: 'print',
                    text:    'Печать',
                    className: 'btn btn-outline-primary btn-sm'
                    }
                ],

                paging:    true,
                searching: true,
                ordering:  true,
                language:  { url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/ru.json' },
               
                createdRow: function(row, data){
                // раскрашиваем строку по категории в последнем столбце
                var cat = data[5]; // колонка «Категория»
                if (cat==='A')  $(row).addClass('row-category-a');
                if (cat==='B')  $(row).addClass('row-category-b');
                if (cat==='C')  $(row).addClass('row-category-c');
                }
            });

            pieCounts = counts; // запомним для переключения

            // 4) Метрики
            // Показываем карточки метрик и блоки
            document.getElementById('metricsCards').style.display = 'flex';
            document.querySelectorAll('details').forEach(d => d.style.display = 'block');
            document.getElementById('filters-form').style.display = 'block';
            document.getElementById('totalCount').textContent = response.length;
            document.getElementById('countA').textContent = counts.A;
            document.getElementById('countB').textContent = counts.B;
            document.getElementById('countC').textContent = counts.C;

            // 5) Рисуем все графики
            drawHistogram(response, analysisMeasure);
            drawPieChart(pieCounts);
            

            // После отрисовки графика делаем блок с рекомендациями видимым
            document.getElementById('recommendations').style.display = 'block';

            if (window.loadStudents) {
                window.loadStudents();
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX Error:', textStatus, errorThrown);
            alert('Ошибка: не удалось выполнить анализ данных.');
        }
    });
}
// «Пробрасываем» в глобальный scope
window.analyzeABCData = analyzeABCData;

//////////////////////////////Г//Р///А////Ф////И////К///И////////////////////////////////////////////////////////////////////////
// === 3. Гистограмма ===
function drawHistogram(dataRows, measure) {
    // подготовка данных
    const categories = dataRows.map(r => r['Ученики']);
    const values = dataRows.map(r => +r[measure]);
    const colors = dataRows.map(r =>
      r['Категория'] === 'A' ? 'green'
      : r['Категория'] === 'B' ? 'yellow'
      : 'red'
    );
  
    // инициализация ECharts
    const chartDom = document.getElementById('chart_histogram');
    const myChart = echarts.init(chartDom);
  
    // опции
    const option = {
      title: {
        text: 'Гистограмма',
        left: 'center',
        textStyle: { fontSize: 20 }
      },
      grid: { top: 60, left: 50, right: 30, bottom: 50 },
      xAxis: {
        type: 'category',
        name: 'Ученики',
        data: categories,
        axisLabel: { rotate: 45, interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: measure
      },
      tooltip: {
        trigger: 'item',
        formatter: params => {
          const i = params.dataIndex;
          const r = dataRows[i];
          return `
            <div style="padding:5px;">
              <b>${r['Ученики']}</b><br/>
              <b>${measure}: ${r[measure]}</b><br/>
              <b>Категория: ${r['Категория']}</b>
            </div>
          `;
        },
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderColor: '#aaa',
        borderWidth: 1,
        textStyle: { color: '#333' },
        extraCssText: 'box-shadow: 0 0 5px rgba(0,0,0,0.3);'
      },
      series: [{
        name: measure,
        type: 'bar',
        data: values.map((v, idx) => ({
          value: v,
          itemStyle: { color: colors[idx] }
        })),
        barWidth: '60%',
        emphasis: {
          itemStyle: { opacity: 0.8 }
        }
      }]
    };
  
    // отрисовка
    myChart.setOption(option);
  
    // при изменении размера окна – ресайз графика
    window.addEventListener('resize', () => myChart.resize());
  }
  
// === 4. Круговая 2D-диаграмма ===

// текущие данные
let pieCounts = { A: 0, B: 0, C: 0 };

// регистрируем тему (опционально)
echarts.registerTheme('myLight', {
  backgroundColor: '#fafafa',
  textStyle: { color: '#333' },
  title:     { textStyle: { color: '#555', fontWeight: 'normal' } },
  legend:    { textStyle: { color: '#444' } }
});

function drawPieChart(counts) {
  const chartDom = document.getElementById('chart_pie3d');
  const myChart  = echarts.init(chartDom, 'myLight');

  // готовим градиенты
  const gradientColors = [
    new echarts.graphic.LinearGradient(0, 0, 1, 1, [
      { offset: 0, color: '#4CAF50' },
      { offset: 1, color: '#8BC34A' }
    ]),
    new echarts.graphic.LinearGradient(0, 0, 1, 1, [
      { offset: 0, color: '#FFEB3B' },
      { offset: 1, color: '#FFC107' }
    ]),
    new echarts.graphic.LinearGradient(0, 0, 1, 1, [
      { offset: 0, color: '#F44336' },
      { offset: 1, color: '#E91E63' }
    ])
  ];

  // приводим в формат для 2D pie
  const data2d = [
    { value: counts.A, name: 'A категория' },
    { value: counts.B, name: 'B категория' },
    { value: counts.C, name: 'C категория' }
  ];

  myChart.setOption({
    title: {
      text: 'Соотношение учащихся по группам',
      left:   'center',
      top:    20,
      textStyle: { fontSize: 20 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left:   20,
      top:    'middle',
      data:   data2d.map(d => d.name)
    },
    series: [{
      type: 'pie',
      radius: '60%',
      center: ['50%', '55%'],
      data: data2d.map((d, i) => ({
        value: d.value,
        name:  d.name,
        itemStyle: {
          color:       gradientColors[i],
          shadowBlur:  20,
          shadowColor: 'rgba(0,0,0,0.2)'
        }
      })),
      label: {
        show:      true,
        formatter: '{b}\n{d}%',
        fontSize:  12,
        lineHeight: 18
      },
      labelLine: {
        length:  15,
        length2: 10,
        smooth:  true,
        lineStyle: { width: 2 }
      },
      emphasis: {
        itemStyle: {
          shadowBlur:  30,
          shadowColor: 'rgba(0,0,0,0.3)'
        },
        label: {
          fontSize:   16,
          fontWeight: 'bold'
        }
      },
      animationType:   'scale',
      animationEasing: 'elasticOut',
      animationDelay:  idx => idx * 200
    }]
  });
}

// при изменении размера окна — имзменение размера диаграммы
window.addEventListener('resize', () => {
  const chartDom = document.getElementById('chart_pie3d');
  const myChart  = echarts.getInstanceByDom(chartDom);
  if (myChart) myChart.resize();
});

//////////////////////////////Г//Р///А////Ф////И////К///И////////////////////////////////////////////////////////////////////////

// XYZ-анализ
// function analyzeXYZData() {
//     // Получаем данные из таблицы
//     var { tableData, columnHeaders } = parceForAnalysis();

//     console.log("tableData: ", tableData); // Отладочный вывод
//     console.log("columnHeaders: ", columnHeaders); // Отладочный вывод

//     // Получаем значения из меню настроек
//     var thresholdX = parseFloat($('#thresholdX').val());
//     var thresholdY = parseFloat($('#thresholdY').val());
//     var thresholdZ = parseFloat($('#thresholdZ').val());
//     var analysisMeasure1 = $('#startQuarter option:selected').text(); // Получаем текст выбранной опции из меню
//     var analysisMeasure2 = $('#endQuarter option:selected').text(); // Получаем текст выбранной опции из меню

//     // Проверка, что пороги в сумме дают 1
//     if (thresholdX + thresholdY + thresholdZ !== 100) {
//         alert("Ошибка: Сумма порогов должна быть равна 100.");
//         return;
//     }

//     $.ajax({
//         url: '/analyzexyz',
//         type: 'POST',
//         contentType: 'application/json',
//         data: JSON.stringify({ data: tableData, columns: columnHeaders, thresholds: { X: thresholdX, Y: thresholdY, Z: thresholdZ }, analysisMeasure1: analysisMeasure1, analysisMeasure2: analysisMeasure2 }),
//         success: function (response) {
//             // Заполнение хранилища
//             setThresholdX(thresholdX);
//             setThresholdY(thresholdY); 
//             setThresholdZ(thresholdZ);
//             setTypeAnalyze('xyz');
//             var analysisType = $('#analysisType').val(); // Получаем выбранную меру из меню
//             setAnalysis(analysisType == 'attendance' ? 'attendance' : 'grades');

//             var analysisMeasure1 = $('#startQuarter option:selected').text(); // Получаем текст выбранной опции из меню
//             var analysisMeasure2 = $('#endQuarter option:selected').text(); // Получаем текст выбранной опции из меню
//             var analysisMeasure = analysisMeasure1 + " - " + analysisMeasure2;

//             console.log("Current startQuarter: ", analysisMeasure); // Отладочный вывод

            
//             var analysisHeader = document.getElementById('analysisHeader');

//             analysisHeader.style.display = 'block';
//             if (analysisType == 'attendance') {
//                 analysisHeader.textContent = 'XYZ-анализ посещаемости'
//             }
//             else {
//                 analysisHeader.textContent = 'XYZ-анализ успеваемости'
//             }

//             // 1) Считаем количество по категориям
//             // Подсчёт категорий
//             const counts = { X: 0, Y: 0, Z: 0 };

//             response.forEach(r => {
//             const cat = r['Категория'];
//             if (cat === 'X') counts.X++;
//             if (cat === 'Y') counts.Y++;
//             if (cat === 'Z') counts.Z++;
//             });

//             // 2) подготовим массив строк для DataTables
//             var dtData = response.map(function(r){
//                 return [
//                 r['№'],
//                 r['Ученики'],
//                 r['Анализируемый период'],
//                 r['Коэффициент вариации'],
//                 r['Категория']
//                 ];
//             });
            
//             // 3) инициализация
//             if ( $.fn.DataTable.isDataTable('#resTable') ) {
//                 $('#resTable').DataTable().clear().destroy();
//             }
            
//             var table = $('#resTable').DataTable({
//                 data: dtData,
//                 columns: [
//                 { title: '№' },
//                 { title: 'Ученики' },
//                 { title: analysisMeasure },
//                 { title: 'Коэффициент вариации' },
//                 { title: 'Категория' }
//                 ],

//                 // отключаем первичную сортировку
//                 order: [],

//                 // сразу 100 строк
//                 pageLength: 100,
//                 lengthMenu: [ [10, 25, 50, 100], [10, 25, 50, 100] ],

//                 // экспорт-кнопки
//                 dom: 'lBfrtip',
//                 buttons: [
//                     {
//                     extend: 'copyHtml5',
//                     text:    'Копировать',
//                     className: 'btn btn-outline-secondary btn-sm'
//                     },
//                     {
//                     extend: 'excelHtml5',
//                     text:    'Excel',
//                     className: 'btn btn-outline-success btn-sm'
//                     },
//                     {
//                     extend: 'pdfHtml5',
//                     text:    'PDF',
//                     className: 'btn btn-outline-danger btn-sm'
//                     },
//                     {
//                     extend: 'print',
//                     text:    'Печать',
//                     className: 'btn btn-outline-primary btn-sm'
//                     }
//                 ],

//                 paging:    true,
//                 searching: true,
//                 ordering:  true,
//                 language:  { url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/ru.json' },
               
//                 // Для каждой строки при создании добавляем класс и привязываем contextmenu
//                 createdRow: function(row, data){
//                     var $cell = $('td', row).eq(4); // Получаем ячейку с категорией
//                     $cell.addClass('category-cell'); // Добавляем класс для стилизации
//                     $cell.on('contextmenu', function(e) {
//                         e.preventDefault(); // Отменяем стандартное контекстное меню
//                         $('#category-menu').remove(); // Удаляем предыдущее меню, если есть
//                         var menu = $('<ul id="category-menu" style="position:absolute; z-index:10000; list-style:none; margin:0; padding:5px; background:#fff; border:1px solid #ccc; border-radius:4px;"></ul>');
//                         ['X','Y','Z'].forEach(function(cat) {
//                             $('<li>')
//                                 .text(cat)
//                                 .css({ padding: '2px 8px', cursor: 'pointer' })
//                                 .on('mouseenter', function(){ $(this).css('background','#f0f0f0') })
//                                 .on('mouseleave', function(){ $(this).css('background','') })
//                                 .on('click', function() {
//                                 // Меняем значение в таблице и перекрашиваем строку
//                                 var cell = table.cell(e.currentTarget);
//                                 cell.data(cat);
//                                 table.row(cell.index().row).invalidate().draw(false);
//                                 menu.remove();
//                                 })
//                                 .appendTo(menu);
//                         });
//                         // Показываем меню в точке клика
//                         $('body').append(menu);
//                         menu.css({ top: e.pageY, left: e.pageX });
//                     });
//                 },

//             // При каждом рендере обновляем класс строки под нужную категорию
//             rowCallback: function(row, data) {
//                 $(row).removeClass('row-category-x row-category-y row-category-z');
//                 var cat = data[4];
//                 if (cat === 'X') $(row).addClass('row-category-x');
//                 else if (cat === 'Y') $(row).addClass('row-category-y');
//                 else if (cat === 'Z') $(row).addClass('row-category-z');
//             }
//         });

//         // Скрываем меню, если кликнули где-то ещё
//         $(document).on('click', function(e) {
//             if (!$(e.target).closest('#category-menu').length) {
//             $('#category-menu').remove();
//             }
//         });

//             pieCountsXYZ = counts; // запомним для переключения

//             // 4) Метрики
//             // Показываем карточки метрик и блоки
//             document.getElementById('metricsCards').style.display = 'flex';
//             document.querySelectorAll('details').forEach(d => d.style.display = 'block');
//             document.getElementById('filters-form').style.display = 'block';
//             document.getElementById('totalCount').textContent = response.length;
//             document.getElementById('countX').textContent = counts.X;
//             document.getElementById('countY').textContent = counts.Y;
//             document.getElementById('countZ').textContent = counts.Z;

//             // 5) Рисуем все графики
//             drawHistogramXYZ(response, analysisMeasure);
//             drawPieChartXYZ(pieCountsXYZ);
            

//             // После отрисовки графика делаем блок с рекомендациями видимым
//             document.getElementById('recommendations').style.display = 'block';

//             if (window.loadStudents) {
//                 window.loadStudents();
//             }
//         },
//         error: function (jqXHR, textStatus, errorThrown) {
//             console.error('AJAX Error:', textStatus, errorThrown);
//             alert('Ошибка: не удалось выполнить анализ данных.');
//         }
//     });
// }


let originalResponse = null;
let currentResponse = null;
let table;
let thresholdX, thresholdY, thresholdZ, maxAllowed, minAllowed;
let analysisMeasure = 'Период';
let lastMethod = 'cv';

let isDragging = false;
let dragAction = null; // 'select' или 'deselect'
let currentEditSpan = null;
let $prevCell = null;

// Клик — просто переключаем эту строку
$(document)
  .on('click', '#resTable tbody td.select-checkbox', function(e) {
    if (e.which !== 1) return; // только левая кнопка
    const rowIdx = table.row(this).index();
    if ($(table.row(rowIdx).node()).hasClass('selected')) {
      table.row(rowIdx).deselect();
    } else {
      table.row(rowIdx).select();
    }
  })
  // mousedown — начинаем drag, определяем действие по состоянию стартовой строки
  .on('mousedown', '#resTable tbody td.select-checkbox', function(e) {
    if (e.which !== 1) return; // только левая кнопка
    isDragging = true;
    const rowIdx = table.row(this).index();
    const isSel = $(table.row(rowIdx).node()).hasClass('selected');
    dragAction = isSel ? 'deselect' : 'select';
    // сразу применяем к этой строке
    if (dragAction === 'select')   table.row(rowIdx).select();
    else                            table.row(rowIdx).deselect();
    return false; // чтобы не было выделения текста
  })
  // mouseover во время drag — применяем то же действие
  .on('mouseover', '#resTable tbody td.select-checkbox', function(e) {
    if (!isDragging) return;
    const rowIdx = table.row(this).index();
    if (dragAction === 'select')   table.row(rowIdx).select();
    else                            table.row(rowIdx).deselect();
  });

// в любом месте при отпускании мыши — завершаем drag
$(document).on('mouseup', () => {
  isDragging = false;
  dragAction = null;
});

// === Меню периодов: только для одной выделенной строки ===
// Выполнить один раз после загрузки скрипта, но до любых перерисовок таблицы:
$(document).on('contextmenu',
    '#resTable tbody td.period-cell.editable, #resTable tbody td.period-cell.editable span.period-value',
    function(e) {
      e.preventDefault();
  
      // 1) Найти <td>
      const $td = $(e.target).closest('td.period-cell.editable');
  
      // 2) Снять подсветку с предыдущей (если была)
      if ($prevCell) {
        $prevCell.removeClass('selected-period-cell');
      }
  
      // 3) Добавить подсветку к этой
      $td.addClass('selected-period-cell');
      $prevCell = $td;
  
      // 4) Показать меню
      $('#period-menu')
        .css({ top: e.pageY, left: e.pageX })
        .data('cell', $td)
        .show();
    }
  );
  
  // Скрыть меню и снять подсветку при клике вне
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#period-menu, #resTable td.period-cell.editable').length) {
      $('#period-menu').hide();
      if ($prevCell) {
        $prevCell.removeClass('selected-period-cell');
        $prevCell = null;
      }
    }
  });
  

// Обработка кликов в period-menu
$('#period-menu').on('click', 'li', function() {
  const action = $(this).data('action');
  const $cell  = $('#period-menu').data('cell');
  const cell   = table.cell($cell);
  const rowIdx = cell.index().row;
  const quarter= $cell.data('quarter');

  if (action === 'outlier') {
    // замена резкого выброса этого периода на среднее остальных
    const periods = currentResponse[rowIdx].period;
    const values  = Object.entries(periods).map(([k,v]) => ({k,v:+v}));
    const mean    = values.reduce((s,o)=>s+o.v,0)/values.length;
    currentResponse[rowIdx].period[quarter] = mean;
  }
  else if (action === 'reset') {
    // вернуть исходное из originalResponse
    const orig = originalResponse[rowIdx].period[quarter];
    currentResponse[rowIdx].period[quarter] = orig;
  }

  // Общий пересчет
  recalcRow(rowIdx);

  // Обновление таблицы и графиков
  drawTable(currentResponse);
  showMetrics(currentResponse);
  drawHistogramXYZ(currentResponse);
  drawPieChartXYZ(currentResponse);

  $('#period-menu').hide();
});

// Крестик закрывает period-menu
$('#period-menu').on('click', '.close-period-menu', function(e) {
    e.stopPropagation();
    $('#period-menu').hide();
});


function analyzeXYZData() {
    // Получаем данные из таблицы
    var { tableData, columnHeaders } = parceForAnalysis();

    console.log("tableData: ", tableData); // Отладочный вывод
    console.log("columnHeaders: ", columnHeaders); // Отладочный вывод

    // Получаем значения из меню настроек
    thresholdX = parseFloat($('#thresholdX').val());
    thresholdY = parseFloat($('#thresholdY').val());
    thresholdZ = parseFloat($('#thresholdZ').val());
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
            // Заполнение хранилища
            setThresholdX(thresholdX);
            setThresholdY(thresholdY); 
            setThresholdZ(thresholdZ);
            setTypeAnalyze('xyz');
            var analysisType = $('#analysisType').val(); // Получаем выбранную меру из меню
            setAnalysis(analysisType == 'attendance' ? 'attendance' : 'grades');

            var analysisMeasure1 = $('#startQuarter option:selected').text(); // Получаем текст выбранной опции из меню
            var analysisMeasure2 = $('#endQuarter option:selected').text(); // Получаем текст выбранной опции из меню
            analysisMeasure = analysisMeasure1 + " - " + analysisMeasure2;

            console.log("Current startQuarter: ", analysisMeasure); // Отладочный вывод
            console.log("Response: ", response); // Отладочный вывод    
            
            var analysisHeader = document.getElementById('analysisHeader');

            analysisHeader.style.display = 'block';
            if (analysisType == 'attendance') {
                analysisHeader.textContent = 'XYZ-анализ посещаемости'
            }
            else {
                analysisHeader.textContent = 'XYZ-анализ успеваемости'
            }

            // Сохраняем «чистый» ответ
            originalResponse = JSON.parse(JSON.stringify(response));
            currentResponse = JSON.parse(JSON.stringify(response)); // Сохраняем текущий ответ для дальнейшего использования
            // Вычисляем максимумы по avg и по сумме, чтобы потом нормировать в проценты
            window.maxAvg = Math.max(...currentResponse.map(r => r.avg));
            window.maxSum = Math.max(...currentResponse.map(r => r['Анализируемый период']));

            // Рисуем таблицу, метрики и графики
            drawTable(currentResponse);
            showMetrics(currentResponse);

            drawHistogramXYZ(currentResponse);
            drawPieChartXYZ(currentResponse);

            // После отрисовки графика делаем блок с рекомендациями видимым
            document.getElementById('recommendations').style.display = 'block';

            if (window.loadStudents) {
                window.loadStudents();
            }

        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX Error:', textStatus, errorThrown);
            alert('Ошибка: не удалось выполнить анализ данных.');
        }
    });
}

// 2) Построение DataTable с колонкой-чекбокс и контекст-меню
function drawTable(dataRows) {
    // Получаем динамические ключи заголовков
    const periodKeys = dataRows.length
    ? Object.keys(dataRows[0].period)
    : [];

    // Строим заголовки
    const columns = [
        {
            title: '*',
            className: 'select-checkbox',
            orderable: false,
            data: null,
            defaultContent: ''
        },
        { title: '№', data: '№' },
        { title: 'Ученики', data: 'Ученики' },
        // Динамически по periodKeys
        ...periodKeys.map(key => ({
            title: key,
            data: row => row.period[key] || 0,
            className: 'period-cell editable',
            createdCell: (td, cellData, rowData) => {
                const quarter = key;
                $(td)
                    .empty()
                    .addClass('period-cell editable')
                    .attr('data-quarter', quarter)    // ← кладём атрибут сюда
                    .css({ position: 'relative', overflow: 'visible' })
                    .append(`<span class="period-value" contenteditable="true" data-quarter="${quarter}">${cellData}</span>`)
                    .append(`
                        <div class="edit-controls" contenteditable="false" style="display:none;">
                            <button class="confirm btn-success btn-sm">✓</button>
                            <button class="cancel  btn-danger  btn-sm">✕</button>
                        </div>
                    `);
            }
        })),
        { title: analysisMeasure, data: 'Анализируемый период', name: 'sum',},
        { title: 'Среднее значение', data: 'avg', name: 'avg', 
            render: function(data, type, row) {
            // при выводе (display, filter и т. п.) форматируем
            return (typeof data === 'number') 
              ? data.toFixed(2) 
              : data;
          } },
        { title: 'Коэффициент вариации', data: 'Коэффициент вариации', name: 'cv' },
        { title: 'Категория', name: 'cat', data: 'Категория', className: 'category-cell' }
    ]

    // Если уже был DataTable — уничтожаем и сбрасываем выбор
    if ($.fn.DataTable.isDataTable('#resTable')) {
        $('#resTable tbody tr').each(function() {
        $(this).removeClass('selected');
        $(this).find('td.select-checkbox').html('').removeClass('selected-marker');
        });
        table.destroy();
        $('#resTable').empty();
    }

    // Находим индекс колонки Категория
    const categoryIdx = columns.findIndex(col => col.data === 'Категория');

    // Инициализация
    table = $('#resTable').DataTable({
      data: dataRows,
      columns: columns,
      select: { style: 'multi', selector: 'td.select-checkbox', info: false },
      order: [ categoryIdx, 'asc' ], // сортируем по категории
      // сразу 100 строк
      pageLength: 100,
      lengthMenu: [ [10, 25, 50, 100], [10, 25, 50, 100] ],
      dom: 'lBfrtip',
      buttons: [
        {
        extend: 'copyHtml5',
        text:    'Копировать',
        className: 'btn btn-outline-secondary btn-sm'
        },
        {
        extend: 'excelHtml5',
        text:    'Excel',
        className: 'btn btn-outline-success btn-sm'
        },
        {
        extend: 'pdfHtml5',
        text:    'PDF',
        className: 'btn btn-outline-danger btn-sm'
        },
        {
        extend: 'print',
        text:    'Печать',
        className: 'btn btn-outline-primary btn-sm'
        },
        {
            text: 'Сбросить таблицу',
            className: 'btn btn-outline-warning btn-sm',
            action: function() {
                // Восстанавливаем исходные данные
                currentResponse = JSON.parse(JSON.stringify(originalResponse));
                // Сбросим метод классификации на дефолт (если нужно)
                lastMethod = 'cv';
                // Перерисуем таблицу и всё остальное
                drawTable(currentResponse);
                showMetrics(currentResponse);
                drawHistogramXYZ(currentResponse);
                drawPieChartXYZ(currentResponse);
            }
        }
    ],
    paging:    true,
    searching: true,
    ordering:  true,
      language: { url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/ru.json',
        select: {
            // скрываем колонки/ячейки
            columns: "",
            cells:   "",
            // оставляем только строки, и начинаем её с перевода строки
            rows: {
                0:  "",                                // когда 0 — ничего не выводим
                1:  "\nВыбрана 1 запись",              // для одной
                _:  "\nВыбрано %d записей"             // для остальных, %d → число :contentReference[oaicite:1]{index=1}
            }
        },
       },
      createdRow: function(row,rowData){
        const $row = $(row);
        // 1) категория
        const $cat = $row.find('td.category-cell')
                        .attr('title','Правый‑клик: изменить категорию');
        // 2) чек‑бокс‑ячейка
        const $chk = $row.find('td.select-checkbox')
                        .attr('title','Правый‑клик: автоклассификация');

        const cat = rowData['Категория'];
        if (typeof cat === 'string') {
            $(row).addClass('row-category-' + cat.toLowerCase());
        }
      }
    });

    // Навешиваем обработчики инлайн-редактирования
    // делаем ячейку относительной, чтобы позиционировать кнопки
    $('#resTable tbody')
        // когда пользователь кликает внутрь span — сохраняем старое значение, но ещё не показываем кнопки
        .on('focus', 'span.period-value', function() {
            const $span = $(this).css('outline','none');
            $span.data('oldValue', $span.text());
            currentEditSpan = $span;
        })
        .on('focusin', 'span.period-value', function() {
            $(this).siblings('.edit-controls').show();
        })
        // при вводе в span — показываем контролы (единожды)
        .on('input', 'span.period-value', function() {
            const $span = $(this);
            $span.siblings('.edit-controls').show();
        })
        // клик по кнопкам
        // новый, исправленный блок:
        .on('click', '.edit-controls button', function(e) {
            e.stopPropagation();
            const $btn  = $(this);
            const $td   = $btn.closest('td');                // получаем TD
            const $span = $td.find('span.period-value');
            const oldV  = parseFloat($span.data('oldValue'));
            const newV  = parseFloat($span.text().trim());
            const rowIdx= table.cell($td).index().row;
            const quarter = $span.data('quarter');
        
            if ($btn.hasClass('confirm')) {
            if (isNaN(newV)) {
                alert('Введите корректное число');
                $span.text(oldV);                           // возвращаем старое значение
            } else {
                // 1) Обновляем данные
                currentResponse[rowIdx].period[quarter] = newV;
                recalcRow(rowIdx);

                // 2) Обновляем сам span (оставляем contenteditable)
                $span.text(newV);

                // 3) Обновляем остальные колонки через API
                const avgCol = table.column('avg:name').index();
                const cvCol  = table.column('cv:name').index();
                const catCol = table.column('cat:name').index();
                const sumCol = table.column('sum:name').index();

                table
                    .cell(rowIdx, avgCol).data(currentResponse[rowIdx].avg.toFixed(2))
                    .cell(rowIdx, cvCol).data(currentResponse[rowIdx]['Коэффициент вариации'])
                    .cell(rowIdx, catCol).data(currentResponse[rowIdx]['Категория'])
                    .cell(rowIdx, sumCol).data(currentResponse[rowIdx]['Анализируемый период'])
                    .draw(false);

                // 4) Обновляем метрики и графики
                showMetrics(currentResponse);
                drawHistogramXYZ(currentResponse);
                drawPieChartXYZ(currentResponse);
            }
            } else {  // cancel
                $span.text(oldV);
            }
        
            // убираем контролы
            $td.find('.edit-controls').hide();
            currentEditSpan = null;
        })
        .on('focusout', 'span.period-value', function() {
            const $span = $(this);
            setTimeout(() => {
              $span.siblings('.edit-controls').hide();
            }, 150);
    });


    // При выборе строки
    table.on('select', function(e, dt, type, indexes) {
        indexes.forEach(i => {
        const cell = table.cell(i, 0).node();
        $(cell).html('*');
        $(cell).addClass('selected-marker');
        });
    });
    
    // При снятии выбора
    table.on('deselect', function(e, dt, type, indexes) {
        indexes.forEach(i => {
          // убрать «*»
          const cell = table.cell(i, 0).node();
          $(cell).html('').removeClass('selected-marker');
        });
    });
      
    // Контекст-меню на чекбокс-колонке (для автоклассификации выбранных)
    $('#resTable tbody').on('contextmenu','td.select-checkbox', function(e){
      e.preventDefault();
      const selIdx = table.rows({ selected: true }).indexes().toArray();
      showContextMenu(e.pageX,e.pageY,'auto', selIdx);
    });
  
    // Контекст-меню на ячейке «Категория» (для ручной/авто-одного)
    $('#resTable tbody').on('contextmenu','td.category-cell', function(e){
      e.preventDefault();
      const idx = table.cell(this).index().row;
      showContextMenu(e.pageX,e.pageY,'cell', [idx]);
    });
  }

  // Пересчёт метрик для одной строки
  function recalcRow(idx) {
    const r = currentResponse[idx];
    const vals = Object.values(r.period).map(v => +v);
    const sum = vals.reduce((a,b) => a+b, 0);
    const avg = vals.length ? sum/vals.length : 0;
    const variance = vals.reduce((s,v) => s + (v-avg)*(v-avg), 0) / (vals.length||1);
    const stddev = Math.sqrt(variance);
    const cvPct = avg ? (stddev/avg*100) : 0;
  
    r['Анализируемый период']     = sum;
    r.avg                         = avg;
    r['Коэффициент вариации']     = `${cvPct.toFixed(2)}%`;
  
    // Переклассификация по текущему методу (например, храните последний выбранный)
    r['Категория'] = classifyByMethod(r, lastMethod);

    // Теперь подкрашиваем <tr> в соответствии с новой категорией:
    const $row = $(table.row(idx).node());
    // убираем старые классы
    $row.removeClass('row-category-x row-category-y row-category-z');
    // добавляем новый
    $row.addClass('row-category-' + r['Категория'].toLowerCase());
  }
  

  // 3) Всплывающее меню — общий обработчик
function showContextMenu(x,y, mode, rows) {
    const $menu = $('#category-menu')
        .css({ left: x, top: y })
        .show();
  
    // Показываем нужные секции
    $menu.find('.section-manual')[mode==='cell' ? 'show':'hide']();
    $menu.find('.section-auto')[mode!=='cell' ? 'show':'hide']();

    // сброс старых
    $menu.find('.menu-item').off('click');
    $menu.find('.btn-reset').off('click');
  
    // Ручная замена
    $menu.find('.manual').on('click', function(){
      const newCat = $(this).data('cat');
      rows.forEach(r => updateCell(r,newCat));
      $menu.hide();
    });
  
    // Автоклассификация
    $menu.find('.auto').on('click', function() {
        const method = $(this).data('method');

        lastMethod = method; // сохраняем текущий метод для пересчета

        const scope  = $(this).hasClass('one') ? 'one' : 'all';

        // При методе allowed — обновляем порог из меню
        if (method === 'allowed') {
            maxAllowed = parseFloat($('#ctx-maxAllowed').val());
            minAllowed = parseFloat($('#ctx-minAllowed').val());

            if (minAllowed > maxAllowed) {
                alert('Ошибка: мин. порог не может быть больше макс. порога');
                return;
            }
        }

        // Собираем индексы строк
        let targetRows;
        if (scope === 'one') {
        targetRows = rows;               // выбранные строки (может быть одна)
        } else {
        targetRows = table.rows().indexes().toArray(); // все строки
        }

        // Применяем классификацию
        targetRows.forEach(i => {
        const newCat = classifyByMethod(currentResponse[i], method);
        updateCell(i, newCat);
        });

        $menu.hide();
    });

    $menu.find('.btn-reset').on('click', () => {
        // восстанавливаем логику:
        currentResponse = JSON.parse(JSON.stringify(originalResponse));
        // восстанавливаем данные
        drawTable(currentResponse);
        showMetrics(currentResponse);
        drawHistogramXYZ(currentResponse);
        drawPieChartXYZ(currentResponse);
        $menu.hide();
    });

    // Скрыть меню при клике вне
    $(document).off('click.ctx').on('click.ctx', e => {
        if (!$(e.target).closest('#category-menu').length) {
        $menu.hide();
        $(document).off('click.ctx');
        }
    });
  }

// 4) Обновление одной ячейки и всей строки
function updateCell(rowIdx, newCat) {
    // Обновляем текущий массив
    currentResponse[rowIdx]['Категория'] = newCat;
  
    // 1) Находим индекс колонки «cat»
    const catColIdx = table.column('cat:name').index();
  
    // 2) Записываем в нужную ячейку
    table.cell(rowIdx, catColIdx).data(newCat);
  
    // 3) Перерисовываем строку
    table.row(rowIdx).invalidate().draw(false);
  
    // 4) Перекрашиваем <tr>
    const $r = $(table.row(rowIdx).node());
    $r.removeClass('row-category-x row-category-y row-category-z')
      .addClass('row-category-' + newCat.toLowerCase());
  
    // 5) Снимаем выбор через API
    table.row(rowIdx).deselect();
  
    // Обновляем метрики и графики
    showMetrics(currentResponse);
    drawHistogramXYZ(currentResponse);
    drawPieChartXYZ(currentResponse);
  }
  
  // 5) Классификация по методу
  function classifyByMethod(r, method) {
    let vPct;

    if (method === 'avgAbsence') {
        vPct = (r.avg / maxAvg) * 100;
    }
    else if (method === 'sumAbsence') {
        vPct = (r['Анализируемый период'] / maxSum) * 100;
    }
    else if (method === 'allowed') {
        // единый метод для мин+макс порогов
        const val = r['Анализируемый период'];
        if (val < minAllowed)      return 'X';
        else if (val > maxAllowed) return 'Z';
        else                        return 'Y';
    }
    else { // CV уже в %
        vPct = parseFloat(r['Коэффициент вариации'].replace('%', ''));
    }

    if (vPct <= thresholdX){
        return 'X';
    }              
    else if (vPct <= thresholdX + thresholdY) {
        return 'Y';
    }
    else {
        return 'Z';
    }
}

  function showMetrics(data) {
    const cnt = { X: 0, Y: 0, Z: 0 };
    data.forEach(r => cnt[r['Категория']]++);
  
    document.getElementById('metricsCards').style.display = 'flex';
    document.querySelectorAll('details').forEach(d => d.style.display = 'block');
    document.getElementById('filters-form').style.display = 'block';
    $('#totalCount').text(data.length);
    $('#countX').text(cnt.X);
    $('#countY').text(cnt.Y);
    $('#countZ').text(cnt.Z);
  }

// «Пробрасываем» в глобальный scope
window.analyzeXYZData = analyzeXYZData;

///////////////////Г/Р/А/Ф/И/К/И////X///Y////Z///А///Н//А//Л//И//З/А///////////////////////////
// === 3. Гистограмма ===
function drawHistogramXYZ(dataRows) {
    // подготовка данных
    const categories = dataRows.map(r => r['Ученики']);
    const values = dataRows.map(r => +r['Анализируемый период']);
    const colors = dataRows.map(r =>
      r['Категория'] === 'X' ? 'green'
      : r['Категория'] === 'Y' ? 'yellow'
      : 'red'
    );
  
    // инициализация ECharts
    const chartDom = document.getElementById('chart_histogram');
    const myChart = echarts.init(chartDom);
  
    // опции
    const option = {
      title: {
        text: 'Гистограмма',
        left: 'center',
        textStyle: { fontSize: 20 }
      },
      grid: { top: 60, left: 50, right: 30, bottom: 50 },
      xAxis: {
        type: 'category',
        name: 'Ученики',
        data: categories,
        axisLabel: { rotate: 45, interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: analysisMeasure
      },
      tooltip: {
        trigger: 'item',
        formatter: params => {
          const i = params.dataIndex;
          const r = dataRows[i];
          return `
            <div style="padding:5px;">
              <b>${r['Ученики']}</b><br/>
              <b>${analysisMeasure}: ${r['Анализируемый период']}</b><br/>
              <b>Категория: ${r['Категория']}</b>
            </div>
          `;
        },
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderColor: '#aaa',
        borderWidth: 1,
        textStyle: { color: '#333' },
        extraCssText: 'box-shadow: 0 0 5px rgba(0,0,0,0.3);'
      },
      series: [{
        name: analysisMeasure,
        type: 'bar',
        data: values.map((v, idx) => ({
          value: v,
          itemStyle: { color: colors[idx] }
        })),
        barWidth: '60%',
        emphasis: {
          itemStyle: { opacity: 0.8 }
        }
      }]
    };
  
    // отрисовка
    myChart.setOption(option);
  
    // при изменении размера окна – ресайз графика
    window.addEventListener('resize', () => myChart.resize());
  }


function drawPieChartXYZ(data) {
    const chartDom = document.getElementById('chart_pie3d');
    const myChart  = echarts.init(chartDom, 'myLight');

    // подготовка данных
    const counts = { X: 0, Y: 0, Z: 0 };
    data.forEach(r => {
        const cat = r['Категория'];
        if (cat === 'X') counts.X++;
        if (cat === 'Y') counts.Y++;
        if (cat === 'Z') counts.Z++;
        }
    );    
  
    // готовим градиенты
    const gradientColors = [
      new echarts.graphic.LinearGradient(0, 0, 1, 1, [
        { offset: 0, color: '#4CAF50' },
        { offset: 1, color: '#8BC34A' }
      ]),
      new echarts.graphic.LinearGradient(0, 0, 1, 1, [
        { offset: 0, color: '#FFEB3B' },
        { offset: 1, color: '#FFC107' }
      ]),
      new echarts.graphic.LinearGradient(0, 0, 1, 1, [
        { offset: 0, color: '#F44336' },
        { offset: 1, color: '#E91E63' }
      ])
    ];
  
    // приводим в формат для 2D pie
    const data2d = [
      { value: counts.X, name: 'X категория' },
      { value: counts.Y, name: 'Y категория' },
      { value: counts.Z, name: 'Z категория' }
    ];
  
    myChart.setOption({
      title: {
        text: 'Соотношение учащихся по группам',
        left:   'center',
        top:    20,
        textStyle: { fontSize: 20 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left:   20,
        top:    'middle',
        data:   data2d.map(d => d.name)
      },
      series: [{
        type: 'pie',
        radius: '60%',
        center: ['50%', '55%'],
        data: data2d.map((d, i) => ({
          value: d.value,
          name:  d.name,
          itemStyle: {
            color:       gradientColors[i],
            shadowBlur:  20,
            shadowColor: 'rgba(0,0,0,0.2)'
          }
        })),
        label: {
          show:      true,
          formatter: '{b}\n{d}%',
          fontSize:  12,
          lineHeight: 18
        },
        labelLine: {
          length:  15,
          length2: 10,
          smooth:  true,
          lineStyle: { width: 2 }
        },
        emphasis: {
          itemStyle: {
            shadowBlur:  30,
            shadowColor: 'rgba(0,0,0,0.3)'
          },
          label: {
            fontSize:   16,
            fontWeight: 'bold'
          }
        },
        animationType:   'scale',
        animationEasing: 'elasticOut',
        animationDelay:  idx => idx * 200
      }]
    });
  }

// let pieCountsXYZ = { X: 0, Y: 0, Z: 0 };
// // === 3. Гистограмма ===
// function drawHistogramXYZ(dataRows, measure) {
//     // подготовка данных
//     const categories = dataRows.map(r => r['Ученики']);
//     const values = dataRows.map(r => +r['Анализируемый период']);
//     const colors = dataRows.map(r =>
//       r['Категория'] === 'X' ? 'green'
//       : r['Категория'] === 'Y' ? 'yellow'
//       : 'red'
//     );
  
//     // инициализация ECharts
//     const chartDom = document.getElementById('chart_histogram');
//     const myChart = echarts.init(chartDom);
  
//     // опции
//     const option = {
//       title: {
//         text: 'Гистограмма',
//         left: 'center',
//         textStyle: { fontSize: 20 }
//       },
//       grid: { top: 60, left: 50, right: 30, bottom: 50 },
//       xAxis: {
//         type: 'category',
//         name: 'Ученики',
//         data: categories,
//         axisLabel: { rotate: 45, interval: 0 }
//       },
//       yAxis: {
//         type: 'value',
//         name: measure
//       },
//       tooltip: {
//         trigger: 'item',
//         formatter: params => {
//           const i = params.dataIndex;
//           const r = dataRows[i];
//           return `
//             <div style="padding:5px;">
//               <b>${r['Ученики']}</b><br/>
//               <b>${measure}: ${r['Анализируемый период']}</b><br/>
//               <b>Категория: ${r['Категория']}</b>
//             </div>
//           `;
//         },
//         backgroundColor: 'rgba(255,255,255,0.9)',
//         borderColor: '#aaa',
//         borderWidth: 1,
//         textStyle: { color: '#333' },
//         extraCssText: 'box-shadow: 0 0 5px rgba(0,0,0,0.3);'
//       },
//       series: [{
//         name: measure,
//         type: 'bar',
//         data: values.map((v, idx) => ({
//           value: v,
//           itemStyle: { color: colors[idx] }
//         })),
//         barWidth: '60%',
//         emphasis: {
//           itemStyle: { opacity: 0.8 }
//         }
//       }]
//     };
  
//     // отрисовка
//     myChart.setOption(option);
  
//     // при изменении размера окна – ресайз графика
//     window.addEventListener('resize', () => myChart.resize());
//   }


// function drawPieChartXYZ(counts) {
//     const chartDom = document.getElementById('chart_pie3d');
//     const myChart  = echarts.init(chartDom, 'myLight');
  
//     // готовим градиенты
//     const gradientColors = [
//       new echarts.graphic.LinearGradient(0, 0, 1, 1, [
//         { offset: 0, color: '#4CAF50' },
//         { offset: 1, color: '#8BC34A' }
//       ]),
//       new echarts.graphic.LinearGradient(0, 0, 1, 1, [
//         { offset: 0, color: '#FFEB3B' },
//         { offset: 1, color: '#FFC107' }
//       ]),
//       new echarts.graphic.LinearGradient(0, 0, 1, 1, [
//         { offset: 0, color: '#F44336' },
//         { offset: 1, color: '#E91E63' }
//       ])
//     ];
  
//     // приводим в формат для 2D pie
//     const data2d = [
//       { value: counts.X, name: 'X категория' },
//       { value: counts.Y, name: 'Y категория' },
//       { value: counts.Z, name: 'Z категория' }
//     ];
  
//     myChart.setOption({
//       title: {
//         text: 'Соотношение учащихся по группам',
//         left:   'center',
//         top:    20,
//         textStyle: { fontSize: 20 }
//       },
//       tooltip: {
//         trigger: 'item',
//         formatter: '{b}: {c} ({d}%)'
//       },
//       legend: {
//         orient: 'vertical',
//         left:   20,
//         top:    'middle',
//         data:   data2d.map(d => d.name)
//       },
//       series: [{
//         type: 'pie',
//         radius: '60%',
//         center: ['50%', '55%'],
//         data: data2d.map((d, i) => ({
//           value: d.value,
//           name:  d.name,
//           itemStyle: {
//             color:       gradientColors[i],
//             shadowBlur:  20,
//             shadowColor: 'rgba(0,0,0,0.2)'
//           }
//         })),
//         label: {
//           show:      true,
//           formatter: '{b}\n{d}%',
//           fontSize:  12,
//           lineHeight: 18
//         },
//         labelLine: {
//           length:  15,
//           length2: 10,
//           smooth:  true,
//           lineStyle: { width: 2 }
//         },
//         emphasis: {
//           itemStyle: {
//             shadowBlur:  30,
//             shadowColor: 'rgba(0,0,0,0.3)'
//           },
//           label: {
//             fontSize:   16,
//             fontWeight: 'bold'
//           }
//         },
//         animationType:   'scale',
//         animationEasing: 'elasticOut',
//         animationDelay:  idx => idx * 200
//       }]
//     });
//   }

//////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ////////////////////////////////////////////////////
// Помощник: разбить response.columns (первая строка) на группы { month, start, indexes }
function getHeaderGroups(columns) {
    const groups = [];
    let current = null;

    columns.forEach((col, idx) => {
        const text = String(col || "").trim();
        if (text) {
            if (current) groups.push(current);
            current = { month: text, start: idx, indexes: [idx] };
        } else if (current) {
            current.indexes.push(idx);
        }
    });
    if (current) groups.push(current);
    return groups;
}

// Помощник: проверяет, есть ли в колонке idx хоть одно непустое значение среди строк data[3..]
function isColumnNonEmpty(data, idx) {
    return data.slice(3).some(row => {
        const v = row[idx];
        return v !== "" && v != null;
    });
}

export function measuresAdd(response) {
    const excludedStarts = [0, 1];            // отбрасываем «№» и «Ученики»
    const data = response.data || [];
    const header1 = response.columns || [];   // первая строка thead
    const header2 = data[0] || [];            // вторая строка thead
    const header3 = data[1] || [];            // третья строка thead (если есть)

    // теперь — убеждаемся, что header3[0] пустая, и при этом есть хотя бы одна «дневная» колонка
    const hasThirdLevel = 
        String(header3[0] || "").trim() === "" && 
        header3.some((cell, idx) => 
            idx > 1 &&                     // пропускаем первые две «№» и «Ученики»
            String(cell || "").trim()      // находим хоть одну непустую ячейку в третьем ряду
        );

    const measures = new Set();
    const analysisMeasure = $('#analysisMeasure').empty();
    const startQuarter   = $('#startQuarter').empty();
    const endQuarter     = $('#endQuarter').empty();

    if (hasThirdLevel) {
        // --- ТРЁХУРОВНЕВЫЙ РЕЖИМ ---
        // 1) Группируем header1 (годы и итоговые столбцы)
        const topGroups = getHeaderGroups(header1)
            .filter(g => !excludedStarts.includes(g.start));

        topGroups.forEach(top => {
            const yearText = String(top.month).trim();

            // 2) Если год (четыре цифры) — обрабатываем его как верхний уровень
            if (/^\d{4}$/.test(yearText)) {
                measures.add(yearText);  // добавляем «2025» и т.п.

                // 3) Для этого года группируем месяцы по header2
                //    Сначала делаем срез header2 по индексам top.indexes
                const subHeader2 = top.indexes.map(i => header2[i]);
                const monthGroups = getHeaderGroups(subHeader2).map(mg => ({
                    month:   mg.month,
                    // переводим локальные индексы mg.indexes обратно в глобальные
                    indexes: mg.indexes.map(localIdx => top.indexes[localIdx])
                }));

                monthGroups.forEach(mg => {
                    const monthName = String(mg.month).trim();
                    if (!monthName) return;
                    measures.add(`${monthName} ${yearText}`);             // добавляем «Апрель 2025»
                    // 4) Внутри каждого monthGroup: по header3 — отдельные дни
                    mg.indexes.forEach(colIdx => {
                        const dayText = String(header3[colIdx] || "").trim();
                        if (!dayText) return;
                        // проверяем, есть ли данные в колонке
                        if (!isColumnNonEmpty(data, colIdx)) return;
                        // например: «21 Апрель 2025»
                        measures.add(`${dayText} ${monthName} ${yearText}`);
                    });
                });

            } else {
                // 5) Итоговые столбцы (например, «Итог за период»)
                measures.add(yearText);
            }
        });

    } else {
        // --- ДВУХУРОВНЕВЫЙ РЕЖИМ ---

        // 1) Собираем группы и исключаем первые две
        let groups = getHeaderGroups(response.columns || []);
        groups = groups.filter(g => !excludedStarts.includes(g.start));

        // 2) Оставляем только группы с хоть одной оценкой
        const good = groups.filter(g => 
            g.indexes.some(i => isColumnNonEmpty(data, i))
        );

        // 3) Пройдём по каждой «живой» группе:
        good.forEach(g => {
            // 3.1) добавляем месяц/период, если это не «Учебные периоды»
            if (g.month !== "Учебные периоды") {
                measures.add(g.month);
            }

            // 3.2) Добавим её дочерние заголовки:
            g.indexes.forEach(i => {
                const h2 = String(header2[i] || "").trim();
                if (!h2) return;                   // пропускаем пустые

                // проверяем, есть ли в этой колонке хоть одна оценка
                if (!isColumnNonEmpty(data, i)) return;

                let name;
                if (/^\d+$/.test(h2)) {
                    // дата → добавляем «число + месяц»
                    name = `${h2} ${g.month}`;
                } else {
                    // строковый заголовок (например, "1 четверть") → берём как есть
                    name = h2;
                }
                measures.add(name);
            });
        });
    }

    // 4) Заполняем селект
    if (measures.size === 0) {
        alert('Нет доступных мер анализа.');
        return;
    }
    measures.forEach(m => {
        analysisMeasure.append(`<option value="${m}">${m}</option>`);
    });
    analysisMeasure.find('option').first().prop('selected', true);

    measures.forEach(m => {
        startQuarter.append(`<option value="${m}">${m}</option>`);
        endQuarter  .append(`<option value="${m}">${m}</option>`);
    });
    if (startQuarter.children().length && endQuarter.children().length) {
        startQuarter.find('option').first().prop('selected', true);
        endQuarter  .find('option').first().prop('selected', true);
    }
}

window.measuresAdd = measuresAdd;

//////////////////////////////////////////////////////////////////////////////////////////////////////


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
// «Пробрасываем» в глобальный scope
window.openTab = openTab;
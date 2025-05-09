// Загрузка из БД
function loadDataABCXYZ() {
    // Получение значений из селекторов
    var classSelectText = $("#classSelect option:selected").text();
    var classLetterSelectText = $("#classLetterSelect option:selected").text();
    var subjectSelectText = $("#subjectSelect option:selected").text();
    var teacherSelectText = $("#teacherSelect option:selected").text();
    var performanceSelectText = $("#performanceSelect option:selected").val();
    var periodSelectText = $("#periodSelect option:selected").text();
    var periodSelectYearText = $("#periodSelectYear option:selected").text();

    // Отправка AJAX-запроса на сервер Flask
    $.ajax({
        url: "/load_data_abcxyz",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            classSelectValue: classSelectText,
            classLetterSelectValue: classLetterSelectText,
            subjectSelectValue: subjectSelectText,
            teacherSelectValue: teacherSelectText,
            performanceSelectValue: performanceSelectText,
            periodSelectValue: periodSelectText,
            periodSelectYearValue: periodSelectYearText
        }),
        success: function (response) {
            // Очистка заголовков и строк таблицы перед добавлением новых данных
            $('#studentTablePerf thead').empty();
            $('#studentTablePerf tbody').empty();
            $('#studentTableAttend thead').empty();
            $('#studentTableAttend tbody').empty();

            var analysisHeader1 = document.getElementById('analysisHeader1');

            analysisHeader1.style.display = 'block';
            analysisHeader1.textContent = 'Успеваемость учеников'

            var analysisHeader2 = document.getElementById('analysisHeader2');

            analysisHeader2.style.display = 'block';
            analysisHeader2.textContent = 'Посещаемость учеников'

            // Объединение пустых ячеек в заголовках
            var prevHeader = null;
            var colspan = 1;

            let emptyIndices = [];
            var ind = 0;

            // Найти индексы строк, которые равны ""
            response.data1[0].forEach(function (cell) {
                if (cell === "") {
                    emptyIndices.push(ind);
                }
                ind += 1;
            });

            var theadRow = '<tr>';
            response.columns1.forEach(function (column, index) {
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
                if (emptyIndices.includes(response.columns1.length - 1)) {
                    theadRow += `<th rowspan="2">${prevHeader}</th>`;
                }
                else {
                    theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                }
            }
            theadRow += '</tr>';
            $('#studentTablePerf thead').append(theadRow);

            // Заполнение первой строки данных в таблице
            var firstRow = '<tr>';
            response.data1[0].forEach(function (cell) {
                if (cell !== "") {
                    firstRow += `<th>${cell || ""}</th>`;
                }
            });
            firstRow += '</tr>';
            $('#studentTablePerf thead').append(firstRow);

            // Заполнение данных в таблице, начиная с второй строки
            response.data1.slice(1).forEach(function (row) {
                var newRow = '<tr>';
                row.forEach(function (cell) {
                    newRow += `<td>${cell || ""}</td>`;
                });
                newRow += '</tr>';
                $('#studentTablePerf tbody').append(newRow);
            });

            // Определение типа анализа на основе загруженных данных
            var containsAverageGrade = response.columns1.includes('Средняя оценка');
            var containsAttendanceDays = response.columns1.includes('Дни посещения');
            var containsAllGrade = response.columns1.includes('Год')
            var containsYearTotal = response.columns1.includes('Итог.');
            var containsPeriodTotal = response.columns1.includes('Итог за период');

            // Определение меры анализа на основе загруженных данных
            var containsAllGrade = response.columns1.includes('Год');
            var contains1 = response.data1[0].includes('1 четверть');
            var contains2 = response.data1[0].includes('2 четверть');
            var contains3 = response.data1[0].includes('3 четверть');
            var contains4 = response.data1[0].includes('4 четверть');
            var containsMedium1 = response.columns1.includes('1 полугодие');
            var containsMedium2 = response.columns1.includes('2 полугодие');
            var containsPeriodGrade = response.columns1.includes('Оценка за период');

            var analysisMeasure = $('#analysisMeasure');
            // Показ опций, которые остались отключенными
            analysisMeasure.find('option:disabled').show();

            analysisMeasure.find('option').prop('disabled', true);
            // Включаем опции для анализа посещаемости, если они присутствуют в данных
            if (containsAttendanceDays) {
                analysisMeasure.find('option[value="attendanceDays"]').prop('disabled', false);
            }
            if (containsPeriodTotal) {
                analysisMeasure.find('option[value="periodTotal"]').prop('disabled', false);
            }
            if (contains1) {
                analysisMeasure.find('option[value="quarter1"]').prop('disabled', false);
            }
            if (contains2) {
                analysisMeasure.find('option[value="quarter2"]').prop('disabled', false);
            }
            if (contains3) {
                analysisMeasure.find('option[value="quarter3"]').prop('disabled', false);
            }
            if (contains4) {
                analysisMeasure.find('option[value="quarter4"]').prop('disabled', false);
            }
            // Включаем опции для анализа успеваемости, если они присутствуют в данных
            if (containsAverageGrade) {
                analysisMeasure.find('option[value="averageGrade"]').prop('disabled', false);
            }
            if (containsAllGrade) {
                analysisMeasure.find('option[value="year"]').prop('disabled', false);
            }
            if (containsMedium1) {
                analysisMeasure.find('option[value="medium1"]').prop('disabled', false);
            }
            if (containsMedium2) {
                analysisMeasure.find('option[value="medium2"]').prop('disabled', false);
            }
            if (containsYearTotal) {
                analysisMeasure.find('option[value="yearTotal"]').prop('disabled', false);
            }
            if (containsPeriodGrade) {
                analysisMeasure.find('option[value="gradePeriod"]').prop('disabled', false);
            }

            // Скрытие опций, которые остались отключенными
            analysisMeasure.find('option:disabled').hide();

            // Выбор первой доступной опции
            analysisMeasure.find('option:not(:disabled)').first().prop('selected', true);

            // Посещение
            // Объединение пустых ячеек в заголовках
            var prevHeader = null;
            var colspan = 1;

            let emptyIndices1 = [];
            var ind = 0;

            // Найти индексы строк, которые равны ""
            response.data2[0].forEach(function (cell) {
                if (cell === "") {
                    emptyIndices1.push(ind);
                }
                ind += 1;
            });

            var theadRow = '<tr>';
            response.columns2.forEach(function (column, index) {
                if (column === "") {
                    colspan++;
                } else {
                    if (prevHeader !== null) {
                        if (emptyIndices1.includes(index - 1)) {
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
                if (emptyIndices1.includes(response.columns2.length - 1)) {
                    theadRow += `<th rowspan="2">${prevHeader}</th>`;
                }
                else {
                    theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                }
            }
            theadRow += '</tr>';
            $('#studentTableAttend thead').append(theadRow);

            // Заполнение первой строки данных в таблице
            var firstRow = '<tr>';
            response.data2[0].forEach(function (cell) {
                if (cell !== "") {
                    firstRow += `<th>${cell || ""}</th>`;
                }
            });
            firstRow += '</tr>';
            $('#studentTableAttend thead').append(firstRow);

            // Заполнение данных в таблице, начиная с второй строки
            response.data2.slice(1).forEach(function (row) {
                var newRow = '<tr>';
                row.forEach(function (cell) {
                    newRow += `<td>${cell || ""}</td>`;
                });
                newRow += '</tr>';
                $('#studentTableAttend tbody').append(newRow);
            });

            // Проверка данных для включения соответствующих опций
            var contains1 = response.data2[0].includes('1 четверть');
            var contains2 = response.data2[0].includes('2 четверть');
            var contains3 = response.data2[0].includes('3 четверть');
            var contains4 = response.data2[0].includes('4 четверть');
            var containsMedium1 = response.data2[0].includes('1 полугодие');
            var containsMedium2 = response.data2[0].includes('2 полугодие');
        
            // Функция для управления опциями в выпадающем списке
            function manageOptions(selector, conditions, options) {
                var select = $(selector);
                select.find('option').prop('disabled', true);
                
                for (var i = 0; i < conditions.length; i++) {
                    if (conditions[i]) {
                        select.find(`option[value="${options[i]}"]`).prop('disabled', false);
                    }
                }
                
                // Скрытие опций, которые остались отключенными
                select.find('option:disabled').hide();
                
                // Выбор первой доступной опции
                select.find('option:not(:disabled)').first().prop('selected', true);
            }

            // Условия для начального и конечного периода
            var quarterConditions = [contains1, contains2, contains3, contains4];
            var quarterOptions = ['Q1', 'Q2', 'Q3', 'Q4'];
            
            var mediumConditions = [containsMedium1, containsMedium2];
            var mediumOptions = ['H1', 'H2'];

            // Управление опциями для начального периода
            manageOptions('#startQuarter', quarterConditions.concat(mediumConditions), quarterOptions.concat(mediumOptions));

            // Управление опциями для конечного периода
            manageOptions('#endQuarter', quarterConditions.concat(mediumConditions), quarterOptions.concat(mediumOptions));
           
            $('.containerTable').css('display', 'table');
        },
        error: function (xhr, status, error) {
            console.error("Ошибка при загрузке данных:", error);
        }
    });
}

// Табличное заполнение
$(document).ready(function () {
    $('#uploadFormABCXYZ').on('submit', function (e) {
        e.preventDefault();

        var formData = new FormData();
        formData.append('file', $('#fileInput')[0].files[0]);

        $.ajax({
            url: '/uploadabcxyz',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                // Очистка заголовков и строк таблицы перед добавлением новых данных
                $('#studentTablePerf thead').empty();
                $('#studentTablePerf tbody').empty();
                $('#studentTableAttend thead').empty();
                $('#studentTableAttend tbody').empty();

                var analysisHeader1 = document.getElementById('analysisHeader1');

                analysisHeader1.style.display = 'block';
                analysisHeader1.textContent = 'Успеваемость учеников'

                var analysisHeader2 = document.getElementById('analysisHeader2');

                analysisHeader2.style.display = 'block';
                analysisHeader2.textContent = 'Посещаемость учеников'

                // Объединение пустых ячеек в заголовках
                var prevHeader = null;
                var colspan = 1;

                let emptyIndices = [];
                var ind = 0;

                // Найти индексы строк, которые равны ""
                response.data1[0].forEach(function (cell) {
                    if (cell === "") {
                        emptyIndices.push(ind);
                    }
                    ind += 1;
                });

                var theadRow = '<tr>';
                response.columns1.forEach(function (column, index) {
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
                    if (emptyIndices.includes(response.columns1.length - 1)) {
                        theadRow += `<th rowspan="2">${prevHeader}</th>`;
                    }
                    else {
                        theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                    }
                }
                theadRow += '</tr>';
                $('#studentTablePerf thead').append(theadRow);

                // Заполнение первой строки данных в таблице
                var firstRow = '<tr>';
                response.data1[0].forEach(function (cell) {
                    if (cell !== "") {
                        firstRow += `<th>${cell || ""}</th>`;
                    }
                });
                firstRow += '</tr>';
                $('#studentTablePerf thead').append(firstRow);

                var rowData = []; // Массив для хранения значений ячеек

                // Заполнение данных в таблице, начиная с второй строки
                response.data1.slice(1).forEach(function (row) {
                    var newRow = '<tr>';
                    row.forEach(function (cell) {
                        var cellValue = cell || "0";
                        newRow += `<td>${cellValue}</td>`;
                        rowData.push(cellValue)
                    });
                    newRow += '</tr>';
                    $('#studentTablePerf tbody').append(newRow);
                });

                // Определение типа анализа на основе загруженных данных
                var containsAverageGrade = response.columns1.includes('Средняя оценка');
                var containsAttendanceDays = response.columns1.includes('Дни посещения');
                var containsAllGrade = response.columns1.includes('Год')

                // Определение меры анализа на основе загруженных данных
                var containsAllGrade = response.columns1.includes('Год');
                var contains1 = response.data1[0].includes('1 четверть');
                var contains2 = response.data1[0].includes('2 четверть');
                var contains3 = response.data1[0].includes('3 четверть');
                var contains4 = response.data1[0].includes('4 четверть');
                var containsMedium1 = response.columns1.includes('1 полугодие');
                var containsMedium2 = response.columns1.includes('2 полугодие');
                var containsYearTotal = response.columns1.includes('Итог.');
                var containsPeriodTotal = response.columns1.includes('Итог за период');
                var containsPeriodGrade = response.columns1.includes('Оценка за период');

                var analysisMeasure = $('#analysisMeasure');
                // Показ опций, которые остались отключенными
                analysisMeasure.find('option:disabled').show();

                analysisMeasure.find('option').prop('disabled', true);
                // Включаем опции для анализа посещаемости, если они присутствуют в данных
                if (containsAttendanceDays) {
                    analysisMeasure.find('option[value="attendanceDays"]').prop('disabled', false);
                }
                if (containsPeriodTotal) {
                    analysisMeasure.find('option[value="periodTotal"]').prop('disabled', false);
                }
                if (contains1) {
                    analysisMeasure.find('option[value="quarter1"]').prop('disabled', false);
                }
                if (contains2) {
                    analysisMeasure.find('option[value="quarter2"]').prop('disabled', false);
                }
                if (contains3) {
                    analysisMeasure.find('option[value="quarter3"]').prop('disabled', false);
                }
                if (contains4) {
                    analysisMeasure.find('option[value="quarter4"]').prop('disabled', false);
                }
                // Включаем опции для анализа успеваемости, если они присутствуют в данных
                if (containsAverageGrade) {
                    analysisMeasure.find('option[value="averageGrade"]').prop('disabled', false);
                }
                if (containsAllGrade) {
                    analysisMeasure.find('option[value="year"]').prop('disabled', false);
                }
                if (containsMedium1) {
                    analysisMeasure.find('option[value="medium1"]').prop('disabled', false);
                }
                if (containsMedium2) {
                    analysisMeasure.find('option[value="medium2"]').prop('disabled', false);
                }
                if (containsYearTotal) {
                    analysisMeasure.find('option[value="yearTotal"]').prop('disabled', false);
                }
                if (containsPeriodGrade) {
                    analysisMeasure.find('option[value="gradePeriod"]').prop('disabled', false);
                }

                // Скрытие опций, которые остались отключенными
                analysisMeasure.find('option:disabled').hide();

                // Выбор первой доступной опции
                analysisMeasure.find('option:not(:disabled)').first().prop('selected', true);


               
                // Посещение
                // Объединение пустых ячеек в заголовках
                var prevHeader = null;
                var colspan = 1;

                let emptyIndices1 = [];
                var ind = 0;

                // Найти индексы строк, которые равны ""
                response.data2[0].forEach(function (cell) {
                    if (cell === "") {
                        emptyIndices1.push(ind);
                    }
                    ind += 1;
                });

                var theadRow = '<tr>';
                response.columns2.forEach(function (column, index) {
                    if (column === "") {
                        colspan++;
                    } else {
                        if (prevHeader !== null) {
                            if (emptyIndices1.includes(index - 1)) {
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
                    if (emptyIndices1.includes(response.columns2.length - 1)) {
                        theadRow += `<th rowspan="2">${prevHeader}</th>`;
                    }
                    else {
                        theadRow += `<th colspan="${colspan}">${prevHeader}</th>`;
                    }
                }
                theadRow += '</tr>';
                $('#studentTableAttend thead').append(theadRow);

                // Заполнение первой строки данных в таблице
                var firstRow = '<tr>';
                response.data2[0].forEach(function (cell) {
                    if (cell !== "") {
                        firstRow += `<th>${cell || ""}</th>`;
                    }
                });
                firstRow += '</tr>';
                $('#studentTableAttend thead').append(firstRow);

                var rowData = []; // Массив для хранения значений ячеек

                // Заполнение данных в таблице, начиная с второй строки
                response.data2.slice(1).forEach(function (row) {
                    var newRow = '<tr>';
                    row.forEach(function (cell) {
                        var cellValue = cell || "0";
                        newRow += `<td>${cellValue}</td>`;
                        rowData.push(cellValue)
                    });
                    newRow += '</tr>';
                    $('#studentTableAttend tbody').append(newRow);
                });          
                
                 // Проверка данных для включения соответствующих опций
                var contains1 = response.data2[0].includes('1 четверть');
                var contains2 = response.data2[0].includes('2 четверть');
                var contains3 = response.data2[0].includes('3 четверть');
                var contains4 = response.data2[0].includes('4 четверть');
                var containsMedium1 = response.data2[0].includes('1 полугодие');
                var containsMedium2 = response.data2[0].includes('2 полугодие');
                var containsFinal = response.columns2.includes('Итог за период');
               
                // Функция для управления опциями в выпадающем списке
                function manageOptions(selector, conditions, options) {
                    var select = $(selector);
                    select.find('option').prop('disabled', true);
                    
                    for (var i = 0; i < conditions.length; i++) {
                        if (conditions[i]) {
                            select.find(`option[value="${options[i]}"]`).prop('disabled', false);
                        }
                    }
                    
                    // Скрытие опций, которые остались отключенными
                    select.find('option:disabled').hide();
                    
                    // Выбор первой доступной опции
                    select.find('option:not(:disabled)').first().prop('selected', true);
                }

                // Условия для начального и конечного периода
                var quarterConditions = [contains1, contains2, contains3, contains4];
                var quarterOptions = ['Q1', 'Q2', 'Q3', 'Q4'];
                
                var mediumConditions = [containsMedium1, containsMedium2];
                var mediumOptions = ['H1', 'H2'];

                var finalOption = 'I';

                // Управление опциями для начального периода
                manageOptions('#startQuarter', quarterConditions.concat(mediumConditions).concat(containsFinal), quarterOptions.concat(mediumOptions).concat(finalOption));

                // Управление опциями для конечного периода
                manageOptions('#endQuarter', quarterConditions.concat(mediumConditions).concat(containsFinal), quarterOptions.concat(mediumOptions).concat(finalOption));

                $('.containerTable').css('display', 'table');
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('AJAX Error:', textStatus, errorThrown);
                alert('Ошибка: данные не соответствуют образцу загрузки.');
            }
        });
    });
});


// ABCXYZ-анализ
function analyzeABCXYZData() {
    var tableData1 = [];
    var columns1 = [];
    var tableData2 = [];
    var columns2 = [];

    // Обработка первой строки заголовка (первый tr)
    $('#studentTablePerf thead tr:nth-child(1) th').each(function () {
        var colspan = $(this).attr('colspan');
        if (colspan) {
            // Обработка второй строки заголовка (второй tr)
            var secondRowHeaders = document.querySelectorAll('#studentTablePerf thead tr:nth-child(2) th');
            for (var i = 0; i < colspan; i++) {
                columns1.push(secondRowHeaders[i].textContent);
            }
        } else {
            // Если colspan не указан, добавляем просто название столбца
            columns1.push($(this).text());
        }
    });

    // Обработка данных в теле таблицы
    $('#studentTablePerf tbody tr').each(function () {
        var rowData = [];
        $(this).find('td').each(function () {
            if ($(this).text().trim() == '') {
                rowData.push('0');
            }
            else{
                rowData.push($(this).text());
            }
        });
        tableData1.push(rowData);
    });

    // Обработка первой строки заголовка (первый tr)
    $('#studentTableAttend thead tr:nth-child(1) th').each(function () {
        var colspan = $(this).attr('colspan');
        if (colspan) {
            // Обработка второй строки заголовка (второй tr)
            var secondRowHeaders = document.querySelectorAll('#studentTableAttend thead tr:nth-child(2) th');
            for (var i = 0; i < colspan; i++) {
                columns2.push(secondRowHeaders[i].textContent);
            }
        } else {
            // Если colspan не указан, добавляем просто название столбца
            columns2.push($(this).text());
        }
    });

    // Обработка данных в теле таблицы
    $('#studentTableAttend tbody tr').each(function () {
        var rowData = [];
        $(this).find('td').each(function () {
            if ($(this).text().trim() == '') {
                rowData.push('0');
            }
            else{
                rowData.push($(this).text());
            }
        });
        tableData2.push(rowData);
    });

    // Получаем значения из меню настроек
    var thresholdA = parseFloat($('#thresholdA').val());
    var thresholdB = parseFloat($('#thresholdB').val());
    var thresholdC = parseFloat($('#thresholdC').val());

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

    var analysisMeasure = $('#analysisMeasure option:selected').text(); // Получаем текст выбранной опции из меню

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
        url: '/analyzeabcxyz',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ data1: tableData1, columns1: columns1, data2: tableData2, columns2:columns2, thresholds: { A: thresholdA, B: thresholdB, C: thresholdC, X: thresholdX, Y: thresholdY, Z: thresholdZ }, analysisMeasure: analysisMeasure, analysisMeasure1: analysisMeasure1, analysisMeasure2: analysisMeasure2 }),
        success: function (response) {
            console.log("Server Response: ", response);

            var analysisMeasure1 = $('#startQuarter option:selected').text(); // Получаем текст выбранной опции из меню
            var analysisMeasure2 = $('#endQuarter option:selected').text(); // Получаем текст выбранной опции из меню
            var analysisMeasure0 = analysisMeasure1 + " - " + analysisMeasure2;

            var analysisMeasure = $('#analysisMeasure option:selected').text(); // Получаем текст выбранной опции из меню

            console.log("Current startQuarter: ", analysisMeasure0); // Отладочный вывод

            var analysisType = $('#analysisType').val(); // Получаем выбранную меру из меню
            var analysisHeader = document.getElementById('analysisHeader');

            analysisHeader.style.display = 'block';
            analysisHeader.textContent = 'ABC/XYZ-анализ успеваемости и посещаемости'

            // 1) Считаем количество по категориям
            // Подсчёт категорий
            const counts = { AX: 0, BX: 0, CX: 0,
                 AY: 0, BY: 0, CY: 0,
                AZ: 0, BZ: 0, CZ: 0 };

            response.forEach(r => {
            const cat = r['Категория'];
            if (cat === 'AX') counts.AX++;
            if (cat === 'AY') counts.AY++;
            if (cat === 'AZ') counts.AZ++;
            if (cat === 'BX') counts.BX++;
            if (cat === 'BY') counts.BY++;
            if (cat === 'BZ') counts.BZ++;
            if (cat === 'CX') counts.CX++;
            if (cat === 'CY') counts.CY++;
            if (cat === 'CZ') counts.CZ++;
            });

            // 2) подготовим массив строк для DataTables
            var dtData = response.map(function(r){
                return [
                r['№'],
                r['Ученики'],
                r[analysisMeasure],
                r['Анализируемый период'],
                r['Процент'],
                r['Кумулятивный процент'],
                r['Коэффициент вариации'],
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
                { title: `Оценки за ${analysisMeasure}` },
                { title: `Посещение: ${analysisMeasure0}` },
                { title: 'Процент' },
                { title: 'Кумулятивный процент' },
                { title: 'Коэффициент вариации' },
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
                var cat = data[7]; // колонка «Категория»
                if (cat === 'AX') $(row).addClass('row-category-ax');
                if (cat === 'AY') $(row).addClass('row-category-ay');
                if (cat === 'AZ') $(row).addClass('row-category-az');
                if (cat === 'BX') $(row).addClass('row-category-bx');
                if (cat === 'BY') $(row).addClass('row-category-by');
                if (cat === 'BZ') $(row).addClass('row-category-bz');
                if (cat === 'CX') $(row).addClass('row-category-cx');
                if (cat === 'CY') $(row).addClass('row-category-cy');
                if (cat === 'CZ') $(row).addClass('row-category-cz');
                }
            });

            pieCountsABCXYZ = counts; // запомним для переключения

            // 4) Метрики
            // Показываем карточки метрик и блоки
            document.getElementById('metricsCards').style.display = 'flex';
            document.querySelectorAll('details').forEach(d => d.style.display = 'block');
            document.getElementById('totalCount').textContent = response.length;
            document.getElementById('countAX').textContent = counts.AX;
            document.getElementById('countAY').textContent = counts.AY;
            document.getElementById('countAZ').textContent = counts.AZ;
            document.getElementById('countBX').textContent = counts.BX;
            document.getElementById('countBY').textContent = counts.BY;
            document.getElementById('countBZ').textContent = counts.BZ;
            document.getElementById('countCX').textContent = counts.CX;
            document.getElementById('countCY').textContent = counts.CY;
            document.getElementById('countCZ').textContent = counts.CZ;
            // 5) Рисуем все графики
            drawEChartsBubble(response, analysisMeasure, analysisMeasure0);
            drawPieChartABCXYZ(pieCountsABCXYZ);
            
            // После отрисовки графика делаем блок с рекомендациями видимым
            document.getElementById('recommendations').style.display = 'block';
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX Error:', textStatus, errorThrown);
            alert('Ошибка: не удалось выполнить анализ данных.');
        }
    });
}

let pieCountsABCXYZ = { AX: 0, BX: 0, CX: 0, AY: 0, BY: 0, CY: 0,
    AZ: 0, BZ: 0, CZ: 0};

function drawPieChartABCXYZ(counts) {
    const chartDom = document.getElementById('chart_pie3d');
    if (!chartDom) return;
    const myChart  = echarts.init(chartDom, 'myLight');

    // 1) Определяем 9 групп с их цветами
    const groups = [
        { key: 'AX', title: 'AX категория', color: '#00ff00' },
        { key: 'AY', title: 'AY категория', color: '#99ff00' },
        { key: 'AZ', title: 'AZ категория', color: '#cfff5f' },
        { key: 'BX', title: 'BX категория', color: '#ffff00' },
        { key: 'BY', title: 'BY категория', color: '#ffe344' },
        { key: 'BZ', title: 'BZ категория', color: '#ffb700' },
        { key: 'CX', title: 'CX категория', color: '#ff4800' },
        { key: 'CY', title: 'CY категория', color: '#ff5731' },
        { key: 'CZ', title: 'CZ категория', color: '#ff0000' }
    ];

    // 2) Собираем data для pie
    const data = groups.map(g => ({
        name: g.title,
        value: counts[g.key] || 0,
        itemStyle: { color: g.color }
    }));

    myChart.setOption({
        title: {
        text: 'Соотношение учащихся по группам',
        left: 'center',
        top: 20,
        textStyle: { fontSize: 20 }
        },
        tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
        },
        legend: {
        orient: 'vertical',
        left: 20,
        top: 'middle',
        data: data.map(d => d.name)
        },
        series: [{
        type: 'pie',
        radius: '60%',
        center: ['60%', '55%'],
        data,
        label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 12
        },
        labelLine: {
            length: 10,
            length2: 5
        },
        emphasis: {
            itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0,0,0,0.3)'
            },
            label: {
            fontSize: 14,
            fontWeight: 'bold'
            }
        },
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: idx => idx * 100
        }]
    });
}

function drawEChartsBubble(response, analysisMeasure, analysisMeasure0) {
    const chartDom = document.getElementById('chart_div');
    if (!chartDom) return;
    const chart = echarts.init(chartDom, 'myLight');
  
    // 1) Подготовка сырых точек и подсчёт дубликатов по (x,y)
    const pairsCount = {};
    const raw = response.map(row => {
      const x = parseFloat(row[analysisMeasure]);
      const y = parseFloat(row['Анализируемый период']);
      const key = `${x}_${y}`;
      pairsCount[key] = (pairsCount[key] || 0) + 1;
      return {
        name: row['Ученики'],
        x, y,
        cumPct: parseFloat(row['Кумулятивный процент']),
        category: row['Категория']
      };
    });
  
    // 2) Преобразуем в data для ECharts
    const data = raw.map(item => {
      return {
        name: item.name,
        value: [ item.x, item.y, item.cumPct ],
        category: item.category,
        duplicate: pairsCount[`${item.x}_${item.y}`] > 1
      };
    });
  
    const colorMap = {
      AX: '#00ff00', AY: '#99ff00', AZ: '#cfff5f',
      BX: '#ffff00', BY: '#ffe344', BZ: '#ffb700',
      CX: '#ff4800', CY: '#ff5731', CZ: '#ff0000'
    };
  
    chart.setOption({
      title: {
        text: 'Распределение учеников по оценкам и пропускам',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: params => {
          const [x, y, pct] = params.value;
          return `
            <strong>${params.name}</strong><br/>
            Оценка: ${x}<br/>
            Пропуски: ${y}<br/>
            Кум. %: ${pct.toFixed(1)}%<br/>
            Категория: ${params.data.category}
          `;
        }
      },
      xAxis: { name: 'Оценка', type: 'value', min: 0, max: 6 },
      yAxis: { name: 'Пропуски', type: 'value', min: 0, max: 25 },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, yAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 10 }
      ],
      series: [{
        name: 'Ученики',
        type: 'scatter',
        data,
        symbolSize: d => d[2] / 100 * 40 + 8,
        itemStyle: {
          color: params => colorMap[params.data.category] || '#888'
        },
        emphasis: {
          label: {
            show: true,
            formatter: params => params.data.name,
            fontSize: 14,
            color: '#000',
            position: 'right'
          },
          itemStyle: {
            borderColor: '#333',
            borderWidth: 2
          }
        },
        label: {
          show: true,
          formatter: params => params.data.duplicate ? '' : params.data.name,
          fontSize: 12,
          color: '#333',
          position: 'right',
          distance: 8
        },
        avoidLabelOverlap: true,
        labelLayout: {
          hideOverlap: false,
          moveOverlap: 'shiftY'
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }]
    });
  }
  
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


// ABC-анализ
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

            $('#resTable thead').empty();
            var headerRow = '<tr>';
            headerRow += '<th>№</th>';
            headerRow += '<th>Ученики</th>';
            headerRow += `<th>Оценки за ${analysisMeasure}</th>`;
            headerRow += `<th>Посещение: ${analysisMeasure0}</th>`;
            headerRow += '<th>Процент</th>';
            headerRow += '<th>Кумулятивный процент</th>';
            headerRow += '<th>Коэффициент вариации</th>';
            headerRow += '<th>Категория</th>';
            headerRow += '</tr>';
            $('#resTable thead').append(headerRow);

            var sumMeasure1 = 0;
            var sumMeasure2 = 0;

            $('#resTable tbody').empty();
            response.forEach(function (row) {
                var rowClass;
                if (row['Категория'] === 'AX') {
                    rowClass = 'row-category-ax';
                } else if (row['Категория'] === 'AY') {
                    rowClass = 'row-category-ay';
                } else if (row['Категория'] === 'AZ') {
                    rowClass = 'row-category-az';
                } else if (row['Категория'] === 'BX') {
                    rowClass = 'row-category-bx';
                } else if (row['Категория'] === 'BY') {
                    rowClass = 'row-category-by';
                } else if (row['Категория'] === 'BZ') {
                    rowClass = 'row-category-bz';
                } else if (row['Категория'] === 'CX') {
                    rowClass = 'row-category-cx';
                } else if (row['Категория'] === 'CY') {
                    rowClass = 'row-category-cy';
                } else if (row['Категория'] === 'CZ') {
                    rowClass = 'row-category-cz';
                }                

                var newRow = `<tr class="${rowClass}">`;
                newRow += `<td>${row['№']}</td>`;
                newRow += `<td>${row['Ученики']}</td>`;
                newRow += `<td>${row[analysisMeasure]}</td>`;
                newRow += `<td>${row["Анализируемый период"]}</td>`;
                newRow += `<td>${row['Процент']}</td>`;
                newRow += `<td>${row['Кумулятивный процент']}</td>`;
                newRow += `<td>${row['Коэффициент вариации']}</td>`;
                newRow += `<td>${row['Категория']}</td>`;
                newRow += '</tr>';
                sumMeasure1 += parseFloat(row[analysisMeasure].toFixed(2));
                sumMeasure2 += parseFloat(row["Анализируемый период"]);
                $('#resTable tbody').append(newRow);
            });

            var newRow = '<tr>';
            newRow += `<td>Сумма</td>`;
            newRow += `<td>-</td>`;
            newRow += `<td>${sumMeasure1}</td>`;
            newRow += `<td>${sumMeasure2}</td>`;
            newRow += `<td>-</td>`;
            newRow += `<td>100%</td>`;
            newRow += `<td>-</td>`;
            newRow += `<td>-</td>`;
            newRow += '</tr>';
            $('#resTable tbody').append(newRow);

            $('.containerTable1').css('display', 'table');

            google.charts.load('current', { packages: ['corechart'] });
            google.charts.setOnLoadCallback(drawChart);
    
            var chart;
            var data;
            var options;
    
            function getCategoryColor(category) {
                switch(category) {
                    case 'AX':
                        return 'rgb(49, 255, 49)'; // Зеленый
                    case 'AY':
                        return 'rgb(150, 255, 49)'; // Светло-зеленый
                    case 'AZ':
                        return 'rgb(207, 255, 95)'; // Салатовый
                    case 'BX':
                        return 'rgb(255, 255, 0)'; // Желтый
                    case 'BY':
                        return 'rgb(255, 227, 66)'; // Желто-оранжевый
                    case 'BZ':
                        return 'rgb(255, 183, 0)'; // Оранжевый
                    case 'CX':
                        return 'rgb(255, 72, 0)'; // Красный
                    case 'CY':
                        return 'rgb(255, 87, 65)'; // Красный-розовый
                    case 'CZ':
                        return 'rgb(255, 0, 0)'; // Красный
                    default:
                        return 'rgb(0, 0, 0)'; // Черный по умолчанию
                }
            }
    
            function drawChart() {
                var dataArray = [
                    ['Ученики', 'Оценка за ' + analysisMeasure, 'Посещение за ' + analysisMeasure0, 'Категория']
                ];
    
                response.forEach(function (row) {
                    var category = row['Категория'];
                    var tooltip = category;
                    dataArray.push([row['Ученики'], parseFloat(row[analysisMeasure]), parseFloat(row["Анализируемый период"]), tooltip]);
                });
    
                data = google.visualization.arrayToDataTable(dataArray);
    
                options = {
                    title: 'ABC/XYZ-анализ успеваемости и посещаемости',
                    hAxis: {
                        title: 'Оценка',
                        minValue: 0, // Устанавливаем минимальное значение для оси X
                        maxValue: 6
                    },
                    vAxis: {
                        title: 'Количество пропусков',
                        minValue: 0, // Устанавливаем минимальное значение для оси Y
                        maxValue: 25
                    },
                    legend: { position: 'none' },
                    tooltip: { isHtml: true },
                    colors: response.map(function(row) { return getCategoryColor(row['Категория']); }),
                    explorer: {
                        actions: ['dragToZoom', 'rightClickToReset'],
                        axis: 'horizontal_and_vertical',
                        keepInBounds: true,
                        maxZoomIn: 0.1
                    }
                };
    
                chart = new google.visualization.BubbleChart(document.getElementById('chart_div'));
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
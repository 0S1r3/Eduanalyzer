import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, render_template
from functions.format import format_value  # Импорт функции из другого файла

from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError

from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

import pandas as pd
import plotly.express as px
from functions.format import format_value  # Импорт функции из другого файла
from functions.analyzeABC import analyzeABC_data
from functions.analyzeXYZ import analyzeXYZ_data
from functions.analyzeABCXYZ import analyze_ABC_XYZ

df = pd.read_excel(r'C:\Users\38fla\VisualStudioProjects\EduAnalyzer\test.xls')

# Работа с данными
if 'Учебный год' not in df.iloc[:,0].values:
    raise ValueError("Ошибка: Строка 'Учебный год' не найдена в загруженном файле")

if 'Класс' not in df.iloc[:,0].values:
    raise ValueError("Ошибка: Строка 'Класс' не найдена в загруженном файле")

if 'Учитель' not in df.iloc[:,0].values:
    raise ValueError("Ошибка: Строка 'Учитель' не найдена в загруженном файле")

if 'Предмет' not in df.iloc[:,0].values:
    raise ValueError("Ошибка: Строка 'Предмет' не найдена в загруженном файле")

if 'Тип учета' not in df.iloc[:,0].values:
    raise ValueError("Ошибка: Строка 'Тип учета' не найдена в загруженном файле")

# Проверка наличия столбца 'Ученики'
if 'Ученики' not in df.iloc[:, 0].values:
    raise ValueError("Ошибка: Столбец 'Ученики' не найден в загруженном файле")

indexYear = df[df.iloc[:, 0] == 'Учебный год'].index[0]
indexClass = df[df.iloc[:, 0] == 'Класс'].index[0]
indexTeacher = df[df.iloc[:, 0] == 'Учитель'].index[0]
indexSubject = df[df.iloc[:, 0] == 'Предмет'].index[0]
indexPerAt = df[df.iloc[:, 0] == 'Тип учета'].index[0]

year_val = df.iloc[indexYear, 1]
class_val = str(df.iloc[indexClass, 1])
teacher_full_name_val = df.iloc[indexTeacher, 1]
subject_val = df.iloc[indexSubject, 1]
performance = df.iloc[indexPerAt, 1]

start_year, end_year = year_val.split('/')

if any(char.isalpha() for char in class_val):
    class_number, letter = ''.join(filter(str.isdigit, class_val)), ''.join(filter(str.isalpha, class_val))
else:
    class_number = class_val
    letter = None

##################Получение Data и Columns###############################

# Найдем индекс строки, где начинается таблица с учениками
start_index = df[df.iloc[:, 0] == 'Ученики'].index[0]

# Чтение данных из файла Excel, начиная с строки, где найдено значение "Ученики"
df = pd.read_excel(r'C:\Users\38fla\VisualStudioProjects\EduAnalyzer\test.xls', skiprows=start_index)

# Задаем правильные имена столбцов
# Заменяем 'nan' на пустые строки в именах столбцов
df.columns = df.iloc[0].astype(str).str.replace('nan', '')

# Заменяем 'nan' на пустые строки в строках DataFrame
df = df.apply(lambda x: x.map(lambda x: '' if pd.isna(x) else x))

df = df[1:]

# Находим индекс последней строки с данными ученика
last_student_index = df[df.iloc[:, 0].astype(str).str.match(r'\d+\..*')].index[-1]

# Удаляем строки после последней строки с данными ученика
df = df.iloc[:last_student_index]

# Преобразуем значения столбца в строки перед использованием .str
df.iloc[:, 0] = df.iloc[:, 0].astype(str)

data = pd.DataFrame(df)

if 'Средняя оценка' in data.columns:
    # Применение форматирования к столбцу Средняя оценка
    data['Средняя оценка'] = data['Средняя оценка'].apply(format_value)

# Удаление столбцов, содержащих только NaN значения
data = data.dropna(axis=1, how="all")

# Создаем столбец '№' с номерами строк
data.insert(0, '№', range(1, len(data) + 1))

# Удаляем первую цифру из столбца 'Ученики' с помощью регулярного выражения
data['Ученики'] = data['Ученики'].str.replace(r'^\d+\.\s', '', regex=True)

# Конец работы с данными

columns = data.columns.tolist()

# Заполнение NaN значений пустыми строками
data = data.where(pd.notnull(data), "")

# Преобразование данных в формат JSON
# data = data.to_dict(orient ='split') 
data = data.values.tolist()

# Преобразование списка списков
for i, row in enumerate(data):
    if i == 0:
        row[0] =  ''  # Добавление пустого элемента в начало первого вложенного списка
    else:
        row[0] = i   # Добавление номера строки в начало каждого вложенного списка

    
######Добавление данных################
months = [
    "Январь", 
    "Февраль", 
    "Март", 
    "Апрель", 
    "Май", 
    "Июнь", 
    "Июль", 
    "Август", 
    "Сентябрь", 
    "Октябрь", 
    "Ноябрь", 
    "Декабрь"
]

if any(col in months for col in columns):
    month_indices = []
    for col in columns:
        if col in months:
            month_index = str(months.index(col) + 1)
            if months.index(col) + 1 >=10:
                month_index = str(months.index(col) + 1)
            else:
                month_index = '0' + str(months.index(col) + 1)
            if col in ["Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]:
                month_index = start_year + '-' + month_index
            else:
                month_index = end_year + '-' + month_index
            month_indices.append(month_index)
    
    # Найти индексы всех месяцев в columns
    month_ind = [i for i, col in enumerate(columns) if col in months]
    

    # Список для хранения числовых значений каждого месяца
    all_month_numbers = []

    # Обработка каждого месяца
    for i in range(len(month_ind)):
        start_index = month_ind[i]
        end_index = month_ind[i + 1] if i + 1 < len(month_ind) else len(columns)
        
        # Найти последний пустой индекс перед следующим месяцем
        last_empty_index = end_index - 1
        while last_empty_index > start_index and columns[last_empty_index] != '':
            last_empty_index -= 1

        # Извлечь числа из первой строки для текущего диапазона
        numbers = data[0][start_index:last_empty_index + 1]
###########################################################################################################
        # Проверка, что все элементы являются числами, и преобразование их при необходимости
        clean_numbers = []
        for number in numbers:
            try:
                # Преобразуем к float, чтобы обработать как целые числа, так и числа с плавающей точкой
                clean_number = float(number)
                clean_numbers.append(clean_number)
            except ValueError:
                # Если не удается преобразовать, то пропускаем элемент
                continue

        all_month_numbers.append(str(clean_numbers))
#############################################################################################################
        #all_month_numbers.append(str(numbers))

    # Создание нового массива с датами
    date_array = []

    for month_index, numbers_str in zip(month_indices, all_month_numbers):
        year, month = month_index.split('-')  # Разбиваем строку на год и месяц
        # Преобразуем строку с числами в список, если она не пустая
        numbers = eval(numbers_str) if numbers_str.strip() else []
        for number in numbers:
            if isinstance(number, (int, float)):
                # Проверяем, что число меньше 10 и преобразуем его в строку
                day = str(int(number)).zfill(2)  # Преобразуем число в строку, заполняя нулями слева при необходимости
                date = f"{year}-{month}-{day}"  # Составляем дату в формате "ГГГГ-ММ-ДД"
                date_array.append(date)
    k=0
    for row in data[1:]:  # Начинаем считывание с data[1]
        # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
        for i in range(2, 2+len(date_array)):
            value = row[i]
            if value == '':
                continue
            student = row[1]


            date = date_array[i-2]
##########################################################################
    # Инициализация списка для хранения совпадений
    matched_records = []
    count = 0  # Счетчик совпадений

    # Предыдущие значения для сравнения
    previous_value = None
    previous_date = None

    # Перебор строк в данных, начиная со второго элемента
    for row in data[1:]:  # Начинаем считывание с data[1]
        print(row)
        # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
        for i in range(2, 2 + len(date_array)):
            value = row[i]
            if value == '':
                continue
            
            student = row[1]  # Получение имени ученика
            date = date_array[i - 2]  # Получение даты

            # Проверяем, совпадают ли value и date с предыдущими
            if value == previous_value and date == previous_date:
                count += 1  # Увеличиваем счетчик, если совпадают

            else:
                # Если мы встретили новое значение, запоминаем предыдущие
                if previous_value is not None and previous_date is not None:
                    # Записываем информацию о предыдущем совпадении
                    matched_records.append({
                        'student': student,
                        'date': previous_date,
                        'value': previous_value,
                        'count': count
                    })
                # Сбрасываем счетчик для нового значения
                previous_value = value
                previous_date = date
                count = 1  # Начинаем новый подсчет

    # Обработка последнего совпадения после завершения цикла
    if previous_value is not None and previous_date is not None:
        matched_records.append({
            'student': student,
            'date': previous_date,
            'value': previous_value,
            'count': count
        })

    # Выводим или записываем совпадения
    for record in matched_records:
        print(f"Студент: {record['student']}, Дата: {record['date']}, Оценка: {record['value']}, Количество совпадений: {record['count']}")
            
            
##############################################################################################################################################

    year, month = month_indices[0].split('-')  # Разбиваем строку на год и месяц

    if int(month) == 9 or int(month) == 10:
        last_period = 1
    if int(month) == 11 or int(month) == 12:
        last_period = 2
    if int(month) == 1 or int(month) == 3 or int(month) == 2:
        last_period = 3
    if int(month) == 4 or int(month) == 5:
        last_period = 4

    for row in data[1:]:  # Начинаем считывание с data[1]
        # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
        value = row[len(row)-1]
        if value == '':
            continue
        student = row[1]


        date = date_array[len(date_array)-1]



    periods = []
    date_arr = []

    for item in data[0][2:]:  # Начинаем считывание с элемента с индексом 2
        if item == '1 четверть':
            date_arr.append(str(start_year + '-10-31'))
            periods.append(1)
        elif item == '2 четверть':
            date_arr.append(str(start_year + '-12-31'))
            periods.append(2)
        elif item == '3 четверть':
            date_arr.append(str(end_year + '-03-31'))
            periods.append(3)
        elif item == '4 четверть':
            date_arr.append(str(end_year + '-05-31'))
            periods.append(4)
        elif item == '1 полугодие':
            date_arr.append(str(start_year + '-12-31'))
            periods.append(7)
        elif item == '2 полугодие':
            date_arr.append(str(end_year + '-05-31'))
            periods.append(8)

    for item in columns:  # Начинаем считывание с элемента с индексом 2
        if item == 'Год':
            date_arr.append(str(end_year + '-05-31'))
            periods.append(5)
        elif item == 'Итог.':
            date_arr.append(str(end_year + '-05-31'))
            periods.append(6)
    
    for row in data[1:]:  # Начинаем считывание с data[1]
        for i in range(2, len(row)):
            # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
            value = row[i]
            student = row[1]



            date = date_arr[i-2]
            period = periods[i-2]
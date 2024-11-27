from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, send_from_directory, session

from functions.models import db, User, Student, Subject, Teacher, Period, Attendance, Performance, text

from functools import wraps

import bcrypt
import base64
import os
from datetime import datetime
import json
import locale

import pandas as pd
import plotly.express as px
from functions.format import format_value  # Импорт функции из другого файла
from functions.analyzeABC import analyzeABC_data
from functions.analyzeXYZ import analyzeXYZ_data
from functions.analyzeABCXYZ import analyze_ABC_XYZ
from functions.recognizedPhoto import get_known_faces_and_ids, process_class_photo

app = Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = '24g0274r_mbg(^61*_qm89t*ss&gs4ha1b5p1)#*0fu4iu0jb('
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@db:5432/school_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

locale.setlocale(locale.LC_TIME, 'ru_RU.UTF-8')

db.init_app(app)

##########################ДИНАМИЧЕСКАЯ ЗАГРУЗКА ДАННЫХ#########################################
@app.route('/api/teachers', methods=['GET'])
def get_teachers():
    subject_id = request.args.get('subject_id')
    class_letter = request.args.get('class_letter')
    period_id = request.args.get('period_id')
    class_number = request.args.get('class_number')
    perf = request.args.get('performance')
    year = request.args.get('selected_year')

    if year:
        start_year, end_year = map(int, year.split('-'))

    teachers_query = Teacher.query

    if perf == 'grades':
        if period_id or class_letter or class_number:
            teachers_query = teachers_query.join(Performance, Performance.id_teacher == Teacher.id_teacher, isouter=True)
        
        if subject_id:
            teachers_query = teachers_query.filter(Teacher.id_subject == subject_id)
        
        if period_id:
            teachers_query = teachers_query.filter(Performance.id_period == period_id)

        if year:
            # Используем поле date из Performance для фильтрации по году
            teachers_query = teachers_query.filter(
                db.extract('year', Performance.date) >= start_year,
                db.extract('year', Performance.date) <= end_year
            )
        
        if class_letter or class_number:
            teachers_query = teachers_query.join(Student, Student.id_student == Performance.id_student, isouter=True)
        
        if class_letter is not None:
            teachers_query = teachers_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            teachers_query = teachers_query.filter(Student.class_number == class_number)
    else:
        if period_id or class_letter or class_number:
            teachers_query = teachers_query.join(Attendance, Attendance.id_teacher == Teacher.id_teacher, isouter=True)
        
        if subject_id:
            teachers_query = teachers_query.filter(Teacher.id_subject == subject_id)
        
        if period_id:
            teachers_query = teachers_query.filter(Attendance.id_period == period_id)

        if year:
            # Используем поле date из Attendance для фильтрации по году
            teachers_query = teachers_query.filter(
                db.extract('year', Attendance.date) >= start_year,
                db.extract('year', Attendance.date) <= end_year
            )
        
        if class_letter or class_number:
            teachers_query = teachers_query.join(Student, Student.id_student == Attendance.id_student, isouter=True)
        
        if class_letter:
            teachers_query = teachers_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            teachers_query = teachers_query.filter(Student.class_number == class_number)
    teachers = teachers_query.all()
    return jsonify([teacher.to_dict() for teacher in teachers])

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    teacher_id = request.args.get('teacher_id')
    class_number = request.args.get('class_number')
    class_letter = request.args.get('class_letter')
    period_id = request.args.get('period_id')
    perf = request.args.get('performance')
    year = request.args.get('selected_year')

    if year:
        start_year, end_year = map(int, year.split('-'))

    subjects_query = Subject.query

    if perf == 'grades':
        if teacher_id or period_id or class_letter or class_number:
            subjects_query = subjects_query.join(Teacher, Teacher.id_subject == Subject.id_subject, isouter=True)
            subjects_query = subjects_query.join(Performance, Performance.id_teacher == Teacher.id_teacher, isouter=True)
            subjects_query = subjects_query.join(Student, Student.id_student == Performance.id_student, isouter=True)
        
        if teacher_id:
            subjects_query = subjects_query.filter(Teacher.id_teacher == teacher_id)
        
        if period_id:
            subjects_query = subjects_query.filter(Performance.id_period == period_id)

        if year:
            # Используем поле date из Performance для фильтрации по году
            subjects_query = subjects_query.filter(
                db.extract('year', Performance.date) >= start_year,
                db.extract('year', Performance.date) <= end_year
            )
        
        if class_letter is not None:
            subjects_query = subjects_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            subjects_query = subjects_query.filter(Student.class_number == class_number)
    else:
        if teacher_id or period_id or class_letter or class_number:
            subjects_query = subjects_query.join(Teacher, Teacher.id_subject == Subject.id_subject, isouter=True)
            subjects_query = subjects_query.join(Attendance, Attendance.id_teacher == Teacher.id_teacher, isouter=True)
            subjects_query = subjects_query.join(Student, Student.id_student == Attendance.id_student, isouter=True)
        
        if teacher_id:
            subjects_query = subjects_query.filter(Teacher.id_teacher == teacher_id)
        
        if period_id:
            subjects_query = subjects_query.filter(Attendance.id_period == period_id)

        if year:
            # Используем поле date из Attendance для фильтрации по году
            subjects_query = subjects_query.filter(
                db.extract('year', Attendance.date) >= start_year,
                db.extract('year', Attendance.date) <= end_year
            )
        
        if class_letter is not None:
            subjects_query = subjects_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            subjects_query = subjects_query.filter(Student.class_number == class_number)

    subjects = subjects_query.all()
    return jsonify([subject.to_dict() for subject in subjects])

@app.route('/api/periods', methods=['GET'])
def get_periods():
    teacher_id = request.args.get('teacher_id')
    class_number = request.args.get('class_number')
    class_letter = request.args.get('class_letter')
    subject_id = request.args.get('subject_id')
    perf = request.args.get('performance')
    year = request.args.get('selected_year')

    if year:
        start_year, end_year = map(int, year.split('-'))

    periods_query = Period.query

    if perf == 'grades':
        if teacher_id or subject_id or class_letter or class_number:
            periods_query = periods_query.join(Performance, Performance.id_period == Period.id_period)
        if teacher_id:
            periods_query = periods_query.filter(Performance.id_teacher == teacher_id)
        
        if subject_id:
            periods_query = periods_query.join(Teacher, Teacher.id_teacher == Performance.id_teacher)
            periods_query = periods_query.filter(Teacher.id_subject == subject_id)
        
        if class_letter or class_number:
            periods_query = periods_query.join(Student, Student.id_student == Performance.id_student, isouter=True)
        
        if class_letter is not None:
            periods_query = periods_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            periods_query = periods_query.filter(Student.class_number == class_number)

        if year:
            # Используем поле date из Performance для фильтрации по году
            periods_query = periods_query.filter(
                db.extract('year', Performance.date) >= start_year,
                db.extract('year', Performance.date) <= end_year
            )
    else:
        if teacher_id or subject_id or class_letter or class_number:
            periods_query = periods_query.join(Attendance, Attendance.id_period == Period.id_period)
        if teacher_id:
            periods_query = periods_query.filter(Attendance.id_teacher == teacher_id)
        
        if subject_id:
            periods_query = periods_query.join(Teacher, Teacher.id_teacher == Attendance.id_teacher)
            periods_query = periods_query.filter(Teacher.id_subject == subject_id)
        
        if class_letter or class_number:
            periods_query = periods_query.join(Student, Student.id_student == Attendance.id_student, isouter=True)
        
        if class_letter is not None:
            periods_query = periods_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            periods_query = periods_query.filter(Student.class_number == class_number)

        if year:
            # Используем поле date из Attendance для фильтрации по году
            periods_query = periods_query.filter(
                db.extract('year', Attendance.date) >= start_year,
                db.extract('year', Attendance.date) <= end_year
            )

    periods = periods_query.all()
    return jsonify([period.to_dict() for period in periods])

@app.route('/api/classes', methods=['GET'])
def get_classes():
    teacher_id = request.args.get('teacher_id')
    class_number = request.args.get('class_number')
    class_letter = request.args.get('class_letter')
    period_id = request.args.get('period_id')
    subject_id = request.args.get('subject_id')
    perf = request.args.get('performance')
    year = request.args.get('selected_year')

    if year:
        start_year, end_year = map(int, year.split('-'))

    classes_query = Student.query

    if perf == 'grades':
        if teacher_id or period_id or subject_id:
            classes_query = classes_query.join(Performance, Performance.id_student == Student.id_student, isouter=True)
            classes_query = classes_query.join(Teacher, Teacher.id_teacher == Performance.id_teacher, isouter=True)
            classes_query = classes_query.join(Subject, Subject.id_subject == Teacher.id_subject, isouter=True)
        
        if teacher_id:
            classes_query = classes_query.filter(Teacher.id_teacher == teacher_id)
        
        if period_id:
            classes_query = classes_query.filter(Performance.id_period == period_id)
        
        if subject_id:
            classes_query = classes_query.filter(Subject.id_subject == subject_id)
        
        if class_letter is not None:
            classes_query = classes_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            classes_query = classes_query.filter(Student.class_number == class_number)

        if year:
            # Фильтрация по году на основе поля date в Performance
            classes_query = classes_query.filter(
                db.extract('year', Performance.date) >= start_year,
                db.extract('year', Performance.date) <= end_year
            )
    else:
        if teacher_id or period_id or subject_id:
            classes_query = classes_query.join(Attendance, Attendance.id_student == Student.id_student, isouter=True)
            classes_query = classes_query.join(Teacher, Teacher.id_teacher == Attendance.id_teacher, isouter=True)
            classes_query = classes_query.join(Subject, Subject.id_subject == Teacher.id_subject, isouter=True)
        
        if teacher_id:
            classes_query = classes_query.filter(Teacher.id_teacher == teacher_id)
        
        if period_id:
            classes_query = classes_query.filter(Attendance.id_period == period_id)
        
        if subject_id:
            classes_query = classes_query.filter(Subject.id_subject == subject_id)
        
        if class_letter is not None:
            classes_query = classes_query.filter(Student.class_letter == class_letter)
        
        if class_number:
            classes_query = classes_query.filter(Student.class_number == class_number)

        if year:
            # Фильтрация по году на основе поля date в Attendance
            classes_query = classes_query.filter(
                db.extract('year', Attendance.date) >= start_year,
                db.extract('year', Attendance.date) <= end_year
            )

    class_numbers = classes_query.with_entities(Student.class_number).distinct().all()
    return jsonify([class_number[0] for class_number in class_numbers])

@app.route('/api/class_letters', methods=['GET'])
def get_class_letters():
    teacher_id = request.args.get('teacher_id')
    class_number = request.args.get('class_number')
    period_id = request.args.get('period_id')
    subject_id = request.args.get('subject_id')
    perf = request.args.get('performance')
    year = request.args.get('selected_year')

    if year:
        start_year, end_year = map(int, year.split('-'))

    letters_query = Student.query.with_entities(Student.class_letter).distinct()

    if perf == 'grades':
        if teacher_id or period_id or subject_id:
            letters_query = letters_query.join(Performance, Performance.id_student == Student.id_student, isouter=True)
        
        if teacher_id:
            letters_query = letters_query.filter(Performance.id_teacher == teacher_id)
        
        if period_id:
            letters_query = letters_query.filter(Performance.id_period == period_id)
        
        if subject_id:
            letters_query = letters_query.join(Teacher, Teacher.id_teacher == Performance.id_teacher, isouter=True)
            letters_query = letters_query.filter(Teacher.id_subject == subject_id)
        
        if class_number:
            letters_query = letters_query.filter(Student.class_number == class_number)
        
        if year:
            # Фильтрация по году на основе поля date
            letters_query = letters_query.filter(
                db.extract('year', Performance.date) >= start_year,
                db.extract('year', Performance.date) <= end_year
            )
    else:
        if teacher_id or period_id or subject_id:
            letters_query = letters_query.join(Attendance, Attendance.id_student == Student.id_student, isouter=True)
        
        if teacher_id:
            letters_query = letters_query.filter(Attendance.id_teacher == teacher_id)
        
        if period_id:
            letters_query = letters_query.filter(Attendance.id_period == period_id)
        
        if subject_id:
            letters_query = letters_query.join(Teacher, Teacher.id_teacher == Attendance.id_teacher, isouter=True)
            letters_query = letters_query.filter(Teacher.id_subject == subject_id)
        
        if class_number:
            letters_query = letters_query.filter(Student.class_number == class_number)
        
        if year:
            # Фильтрация по году на основе поля date
            letters_query = letters_query.filter(
                db.extract('year', Attendance.date) >= start_year,
                db.extract('year', Attendance.date) <= end_year
            )

    class_letters = letters_query.all()
    return jsonify([class_letter[0] for class_letter in class_letters])

@app.route('/api/year_load', methods=['GET'])
def get_year_load():
    teacher_id = request.args.get('teacher_id')
    period_id = request.args.get('period_id')
    class_number = request.args.get('class_number')
    class_letter = request.args.get('class_letter')
    perf = request.args.get('performance')

    app.logger.info(f"Получены параметры: teacher_id={teacher_id}, period_id={period_id}, class_number={class_number}, class_letter={class_letter}, performance={perf}")

    # Запрос для получения уникальных лет
    if perf == 'grades':
        years_query = db.session.query(
            db.extract('year', Performance.date).label('year'),
            db.extract('month', Performance.date).label('month')
        ).distinct().join(Student, Student.id_student == Performance.id_student)

    else:  # Если perf не grades, то подразумевается attendance
        years_query = db.session.query(
            db.extract('year', Attendance.date).label('year'),
            db.extract('month', Attendance.date).label('month')
        ).distinct().join(Student, Student.id_student == Attendance.id_student)

    # Применение фильтров
    if class_number:
        years_query = years_query.filter(Student.class_number == class_number)
        app.logger.info(f"Фильтр по номеру класса: {class_number}")

    if class_letter:
        years_query = years_query.filter(Student.class_letter == class_letter)
        app.logger.info(f"Фильтр по букве класса: {class_letter}")

    if teacher_id:
        if perf == 'grades':
            years_query = years_query.filter(Performance.id_teacher == teacher_id)
            app.logger.info(f"Фильтр по учителю (grades): {teacher_id}")
        else:
            years_query = years_query.filter(Attendance.id_teacher == teacher_id)
            app.logger.info(f"Фильтр по учителю (attendance): {teacher_id}")

    if period_id:
        if perf == 'grades':
            years_query = years_query.filter(Performance.id_period == period_id)
            app.logger.info(f"Фильтр по периоду (grades): {period_id}")
        else:
            years_query = years_query.filter(Attendance.id_period == period_id)
            app.logger.info(f"Фильтр по периоду (attendance): {period_id}")

    years_with_months = years_query.order_by(
        db.extract('year', Performance.date if perf == 'grades' else Attendance.date),
        db.extract('month', Performance.date if perf == 'grades' else Attendance.date)
    ).all()

    app.logger.info(f"Найденные годы с месяцами: {years_with_months}")

    # Сбор уникальных годов и их месяцев
    year_months = {}
    for year, month in years_with_months:
        year_months.setdefault(int(year), []).append(int(month))

    app.logger.info(f"Годы и месяцы: {year_months}")

    year_ranges = []
    unique_years = sorted(year_months.keys())

    if unique_years:
        for year in unique_years:
            months = year_months[year]
            max_month = max(months)

            if max_month < 7:  # Второе полугодие
                year_ranges.append(f"{year - 1}-{year}")
            else:  # Первое полугодие
                year_ranges.append(f"{year}-{year + 1}")

    # Обработка одиночных годов
    for year in unique_years:
        months = year_months[year]
        if len(months) == 1:
            max_month = max(months)
            if max_month < 7:
                year_ranges.append(f"{year - 1}-{year}")
            else:
                year_ranges.append(f"{year}-{year + 1}")

    # Удаляем дубликаты, если они есть
    year_ranges = list(set(year_ranges))

    app.logger.info(f"Сформированные диапазоны лет: {year_ranges}")
    return jsonify(year_ranges)


###############################################################################################

###############################Получение данных из БД##########################################ПРОВЕРИТЬ ЗАГРУЗКУ ПОСЕЩЕНИЯ, ПО МЕСЯЦАМ КОТОРОЕ С ОДИНАКОВЫМИ ДНЯМИ##
@app.route('/load_data', methods=['POST'])
def load_data():
    # Получение данных из запроса
    data = request.json
    class_select = data.get('classValue')
    class_letter = data.get('classLetterValue')
    subject = data.get('subjectValue')
    teacher = data.get('teacherValue')
    performance_type = data.get('performanceValue')
    period_type = data.get('periodValue')
    period_year = data.get('periodValueYear')

    if class_letter == "Выберите букву класса":
        class_letter = None


    app.logger.info(performance_type)
    # Проверка наличия period_year перед разделением
    if period_year:
        start_year, end_year = period_year.split('-')
    else:
        # Обработка случая, когда period_year отсутствует
        return jsonify({"error": "Не указан период"}), 400
    
    # Разделение period_year на начало и конец года
    start_year, end_year = period_year.split('-')

    # Получение идентификатора учителя по его имени
    name_parts = teacher.split()
    surname = name_parts[0]
    first_name = name_parts[1]
    patronymic = name_parts[2] if len(name_parts) > 2 else None
    if patronymic is None:
        # Получение идентификатора ученика по его имени
        teacher_query = db.session.execute(
            text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
            {'surname': surname, 'first_name': first_name}
        )
        teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
    else:
        # Получение идентификатора ученика по его имени
        teacher_query = db.session.execute(
            text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
        )
        teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки

    print(f"Teacher ID: {teacher_id}")  # Отладочный вывод

    # Получение идентификатора предмета
    subject_query = db.session.execute(
        text("SELECT id_subject FROM school.subjects WHERE name = :subject"),
        {'subject': subject}
    )
    subject_id = subject_query.fetchone()[0]  # Получение первого столбца первой строки

    if period_type in ('Год', 'Итог.'):
        if performance_type == 'grades':
            if class_letter is None:
                # SQL-запрос для итоговых периодов
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    sp.period,
                    MAX(p.grade) AS final_grade
                FROM 
                    school.students s
                LEFT JOIN 
                    school.performance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                JOIN 
                    school.periods sp ON p.id_period = sp.id_period
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter is NULL AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, 9, 1) AND 
                        MAKE_DATE(:end_year, 5, 31) AND
                    (sp.period = :period_type OR 
                    (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
                GROUP BY s.id_student, sp.period
                ORDER BY 
                    s.id_student, sp.period;
                ''')
            else:
                # SQL-запрос для итоговых периодов
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    sp.period,
                    MAX(p.grade) AS final_grade
                FROM 
                    school.students s
                LEFT JOIN 
                    school.performance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                JOIN 
                    school.periods sp ON p.id_period = sp.id_period
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter = :class_letter AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, 9, 1) AND 
                        MAKE_DATE(:end_year, 5, 31) AND
                    (sp.period = :period_type OR 
                    (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
                GROUP BY s.id_student, sp.period
                ORDER BY 
                    s.id_student, sp.period;
                ''')
                
            # Выполнение SQL-запроса
            result = db.session.execute(query, {
                'class_select': class_select,
                'class_letter': class_letter,
                'subject': subject_id,
                'teacher': teacher_id,
                'period_type': period_type,
                'start_year': start_year,
                'end_year': end_year
            })
        else:
            if class_letter is None:
                # SQL-запрос для обычных периодов
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    sp.period,
                    MAX(p.final_attendance) as final_grade
                FROM 
                    school.students s
                LEFT JOIN 
                    school.attendance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                JOIN 
                    school.periods sp ON p.id_period = sp.id_period
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter is NULL AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, 9, 1) AND 
                        MAKE_DATE(:end_year, 5, 31) AND
                    (sp.period = :period_type OR 
                    (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
                GROUP BY s.id_student, sp.period
                ORDER BY 
                    s.id_student, sp.period;
                ''')
            else:
                # SQL-запрос для обычных периодов
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    sp.period,
                    MAX(p.final_attendance) as final_grade
                FROM 
                    school.students s
                LEFT JOIN 
                    school.attendance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                JOIN 
                    school.periods sp ON p.id_period = sp.id_period
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter = :class_letter AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, 9, 1) AND 
                        MAKE_DATE(:end_year, 5, 31) AND
                    (sp.period = :period_type OR 
                    (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
                GROUP BY s.id_student, sp.period
                ORDER BY 
                    s.id_student, sp.period;
                ''')

            # Выполнение SQL-запроса
            result = db.session.execute(query, {
                'class_select': class_select,
                'class_letter': class_letter,
                'subject': subject_id,
                'teacher': teacher_id,
                'period_type': period_type,
                'start_year': start_year,
                'end_year': end_year
            })

        # Разработка массива столбцов
        # Инициализация множества для уникальных значений
        unique_periods = set()
        
        # Разработка массива других строк
        unique_row = set()
        grades = []

        column = ["№","Ученики", "Учебные периоды"]
        # Перебор результатов запроса
        for row in result:
            unique_periods.add(row[1])
            unique_row.add(row[0])
            grades.append(row[2])
        unique_per = sorted(list(unique_periods))
        for i in range(1, len(unique_per)):
            if (unique_per[i] in ["1 четверть", "2 четверть", "3 четверть", "4 четверть", "1 полугодие", "2 полугодие"]):
                column.append("")           
        column.append(period_type)

        # Разработка массива 1 строки
        data = [["", ""]]
        for i in range(0, len(unique_per)):
            if (unique_per[i] in ["1 четверть", "2 четверть", "3 четверть", "4 четверть", "1 полугодие", "2 полугодие"]):
                data[0].append(unique_per[i])        
        data[0].append("")

        unique_names = list(unique_row)
        count = 0
        for i in range(1, len(unique_names) + 1):
            data.append([]) # Добавление нового пустого списка в data
            data[i].append(str(i))
            data[i].append(unique_names[i-1])
            for c in range(count, len(grades)):
                count += 1
                data[i].append(grades[c])
                if (unique_per[c % len(unique_per)] == "Год" or unique_per[c % len(unique_per)] == "Итог."):
                    break

        # Сортировка данных по имени ученика (второй столбец)
        data_sorted = sorted(data[1:], key=lambda x: x[1])  # Сортируем только с 1-го индекса (пропускаем заголовок)

        # Обновление номеров учеников
        for index, row in enumerate(data_sorted, start=1):
            row[0] = str(index)  # Обновляем номер ученика

        # Объединяем заголовок с отсортированными данными
        data = [data[0]] + data_sorted

        return jsonify({'columns': column, 'data': data})

    else:
        start_month = '9'
        end_month = '6'
        if (period_type == '1 полугодие'):
            start_month = '9'
            end_month = '12'
        if (period_type == '2 полугодие'):
            start_month = '1'
            end_month = '5'
        if (period_type == '1 четверть'):
            start_month = '9'
            end_month = '10'
        if (period_type == '2 четверть'):
            start_month = '11'
            end_month = '12'
        if (period_type == '3 четверть'):
            start_month = '1'
            end_month = '3'
        if (period_type == '4 четверть'):
            start_month = '4'
            end_month = '5'

        # SQL-запрос для четвертей  и полугодий
        if performance_type == 'grades':
            if class_letter is None:
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    CASE 
                        WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                        WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                        WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                        WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                        WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                        WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                        WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                        WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                        WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                    END AS month,
                    EXTRACT(DAY FROM p.date) AS day,
                    p.grade AS lesson_grade,
                    ROUND(SUM(p.grade * p.count_grades) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date))::DECIMAL /
      SUM(p.count_grades) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)), 2) AS average_grade, p.count_grades
                FROM 
                    school.students s
                LEFT JOIN 
                    school.performance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter is NULL AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.id_period IS NULL AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, :start_month, 1) AND 
                        MAKE_DATE(:end_year, :end_month, 31)
                ORDER BY 
                    s.id_student, p.date;
                ''')
            else:
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    CASE 
                        WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                        WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                        WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                        WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                        WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                        WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                        WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                        WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                        WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                    END AS month,
                    EXTRACT(DAY FROM p.date) AS day,
                    p.grade AS lesson_grade,
                    ROUND(SUM(p.grade * p.count_grades) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date))::DECIMAL /
      SUM(p.count_grades) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)), 2) AS average_grade, p.count_grades
                FROM 
                    school.students s
                LEFT JOIN 
                    school.performance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter = :class_letter AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.id_period IS NULL AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, :start_month, 1) AND 
                        MAKE_DATE(:end_year, :end_month, 31)
                ORDER BY 
                    s.id_student, p.date;
                ''')

            # Выполнение SQL-запроса
            result = db.session.execute(query, {
                'class_select': class_select,
                'class_letter': class_letter,
                'subject': subject_id,
                'teacher': teacher_id,
                'start_year': start_year,
                'end_year': end_year,
                'start_month': start_month,
                'end_month': end_month
            })

            # Разработка массива столбцов
            column = ["№", "Ученики"]

            # Инициализация пустого словаря для хранения дней по месяцам
            days_by_month = {}

            unique_row = set()
            avg_grades = []

            # Подсчет максимального количества повторений для каждого дня
            max_repeats_per_day = {}

            # Перебор результатов запроса
            for row in result:
                # Получаем месяц, день и оценку из результата запроса
                month_str = row[1]
                day = row[2]
                grade = row[3]
                full_name = row[0]  # Добавляем получение имени
                count_grades = row[5]  # Количество оценок

                avg_grade = row[4]

                if row[0] not in unique_row:
                    unique_row.add(row[0])
                    avg_grades.append(row[4])

                # Проверяем, существует ли уже список кортежей для этого месяца
                if month_str not in days_by_month:
                    # Если нет, создаем новый список для этого месяца
                    days_by_month[month_str] = {}

                # Проверяем, существует ли уже этот день в текущем месяце
                if day not in days_by_month[month_str]:
                    # Если нет, создаем новый список для оценок этого дня
                    days_by_month[month_str][day] = []

                # Добавляем оценку в список оценок для этого дня
                days_by_month[month_str][day].append((grade, full_name, count_grades,avg_grade))

                # Подсчет повторений для каждого дня
                if month_str not in max_repeats_per_day:
                    max_repeats_per_day[month_str] = {}

                if day not in max_repeats_per_day[month_str]:
                    max_repeats_per_day[month_str][day] = {}

                if full_name not in max_repeats_per_day[month_str][day]:
                    max_repeats_per_day[month_str][day][full_name] = 0

                max_repeats_per_day[month_str][day][full_name] += count_grades

            # Определяем максимальное количество повторений для каждого дня
            final_day_repeats = {}
            for month, days in max_repeats_per_day.items():
                final_day_repeats[month] = {}
                for day, students in days.items():
                    # Вычисляем максимальное количество повторений среди всех учеников
                    max_repeats = max(students.values())
                    final_day_repeats[month][day] = max_repeats

            # Сортировка месяцев по порядку
            sorted_months = sorted(days_by_month.keys(), key=lambda x: (
                1 if x == "Январь" else 2 if x == "Февраль" else 3 if x == "Март" else 4 if x == "Апрель" else 5 if x == "Май" else 6 if x == "Июнь" else 7 if x == "Июль" else 8 if x == "Август" else 9 if x == "Сентябрь" else 10 if x == "Октябрь" else 11 if x == "Ноябрь" else 12
            ))

            # Перебираем уникальные месяцы из словаря days_by_month
            for month in sorted_months:
                column.append(month)
                # Сортировка дней внутри каждого месяца
                sorted_days = sorted(days_by_month[month].keys())
                for day in sorted_days:
                    # Определяем количество повторений для текущего дня
                    repeats = final_day_repeats[month][day]
                    # Добавляем день в колонку столько раз, сколько повторений
                    for _ in range(repeats):
                        column.append("")
                # Удаляем одно значение, так как в columns было добавлено название месяца
                column = column[:-1]
            column.append("Средняя оценка")
            column.append("Оценка за период")

            data = [["", ""]]

            # Перебираем уникальные месяцы из словаря days_by_month
            for month in sorted_months:
                sorted_days = sorted(days_by_month[month].keys())
                for day in sorted_days:
                    # Определяем количество повторений для текущего дня
                    repeats = final_day_repeats[month][day]
                    # Добавляем день в data[0] столько раз, сколько повторений
                    for _ in range(repeats):
                        data[0].append(day)
            data[0].append("")
            data[0].append("")

            # Разработка массива других строк
            unique_names = list(unique_row)
            for i in range(1, len(unique_names) + 1):
                data.append([])  # Добавление нового пустого списка в data
                data[i].append(str(i))
                data[i].append(unique_names[i - 1])

                avg_ = None
                for month in sorted_months:
                    sorted_days = sorted(days_by_month[month].keys())
                    for day in sorted_days:
                        # Определяем количество повторений для текущего дня
                        repeats = final_day_repeats[month][day]
                        # Проверяем, есть ли оценка для этого ученика в этот день
                        grades_added = []
                        count_end = False
                        for _ in range(repeats):
                            found = False
                            for grade, full_name, count_grades, avg_grade in days_by_month[month][day]:
                                if full_name == unique_names[i - 1]:
                                    avg_ = avg_grade # Ну Матвей, нехороший
                                    if grade not in grades_added:
                                        # Если эта оценка еще не добавлена, добавляем её
                                        for _ in range(count_grades):
                                            data[i].append(grade)
                                        if count_grades > 1:
                                            count_end = True
                                        grades_added.append(grade)
                                        found = True
                                        break
                            if (not found) and (not count_end):  # Если у ученика нет оценки за этот день или она уже была добавлена
                                data[i].append("")
                # data[i].append(avg_grades[i - 1])
                data[i].append(avg_)
                # data[i].append(str(round(float(avg_grades[i - 1]))))
                data[i].append(str(round(float(avg_))))

            # Сортировка данных по имени ученика (второй столбец)
            data_sorted = sorted(data[1:], key=lambda x: x[1])  # Сортируем только с 1-го индекса (пропускаем заголовок)

            # Обновление номеров учеников
            for index, row in enumerate(data_sorted, start=1):
                row[0] = str(index)  # Обновляем номер ученика

            # Объединяем заголовок с отсортированными данными
            data = [data[0]] + data_sorted

            return jsonify({'columns': column, 'data': data})
            
        else:
            if class_letter is None:
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    CASE 
                        WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                        WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                        WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                        WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                        WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                        WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                        WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                        WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                        WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                    END AS month,
                    EXTRACT(DAY FROM p.date) AS day,
                    p.present as lesson_grade,
                    COUNT(p.present) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)) AS present_count, p.count_grades
                FROM 
                    school.students s
                LEFT JOIN 
                    school.attendance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter is NULL AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.present IS NOT NULL AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, :start_month, 1) AND 
                        MAKE_DATE(:end_year, :end_month, 31)
                ORDER BY 
                    s.id_student, p.date;
                ''')
            else:
                query = text('''
                SELECT 
                    CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                    CASE 
                        WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                        WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                        WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                        WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                        WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                        WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                        WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                        WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                        WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                        WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                    END AS month,
                    EXTRACT(DAY FROM p.date) AS day,
                    p.present as lesson_grade,
                    COUNT(p.present) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)) AS present_count, p.count_grades
                FROM 
                    school.students s
                LEFT JOIN 
                    school.attendance p ON s.id_student = p.id_student
                JOIN 
                    school.teachers t ON p.id_teacher = t.id_teacher
                WHERE 
                    s.class_number = :class_select AND
                    s.class_letter = :class_letter AND
                    t.id_teacher = :teacher AND
                    t.id_subject = :subject AND
                    p.present IS NOT NULL AND
                    p.date BETWEEN 
                        MAKE_DATE(:start_year, :start_month, 1) AND 
                        MAKE_DATE(:end_year, :end_month, 31)
                ORDER BY 
                    s.id_student, p.date;
                ''')

            # Выполнение SQL-запроса
            result = db.session.execute(query, {
                'class_select': class_select,
                'class_letter': class_letter,
                'subject': subject_id,
                'teacher': teacher_id,
                'start_year': start_year,
                'end_year': end_year,
                'start_month': start_month,
                'end_month': end_month
            })

            # Разработка массива столбцов
            column = ["№", "Ученики"]

            # Инициализация пустого словаря для хранения дней по месяцам
            days_by_month = {}

            unique_row = set()
            avg_grades = []

            # Подсчет максимального количества повторений для каждого дня
            max_repeats_per_day = {}

            # Перебор результатов запроса
            for row in result:
                # Получаем месяц, день и оценку из результата запроса
                month_str = row[1]
                day = row[2]
                grade = row[3]
                full_name = row[0]  # Добавляем получение имени
                count_grades = row[5]

                if row[0] not in unique_row:
                    unique_row.add(row[0])
                    avg_grades.append(row[4])

                # Проверяем, существует ли уже список кортежей для этого месяца
                if month_str not in days_by_month:
                    days_by_month[month_str] = {}

                # Проверяем, существует ли уже этот день в текущем месяце
                if day not in days_by_month[month_str]:
                    days_by_month[month_str][day] = []

                # Добавляем оценку в список оценок для этого дня
                days_by_month[month_str][day].append((grade, full_name, count_grades))

                # Подсчет повторений для каждого дня
                if month_str not in max_repeats_per_day:
                    max_repeats_per_day[month_str] = {}

                if day not in max_repeats_per_day[month_str]:
                    max_repeats_per_day[month_str][day] = {}

                if full_name not in max_repeats_per_day[month_str][day]:
                    max_repeats_per_day[month_str][day][full_name] = 0

                max_repeats_per_day[month_str][day][full_name] += count_grades

            # Определяем максимальное количество повторений для каждого дня
            final_day_repeats = {}
            for month, days in max_repeats_per_day.items():
                final_day_repeats[month] = {}
                for day, students in days.items():
                    # Вычисляем максимальное количество повторений среди всех учеников
                    max_repeats = max(students.values())
                    final_day_repeats[month][day] = max_repeats

            # Сортировка месяцев по порядку
            sorted_months = sorted(days_by_month.keys(), key=lambda x: (
                1 if x == "Январь" else 2 if x == "Февраль" else 3 if x == "Март" else 4 if x == "Апрель" else 5 if x == "Май" else 6 if x == "Июнь" else 7 if x == "Июль" else 8 if x == "Август" else 9 if x == "Сентябрь" else 10 if x == "Октябрь" else 11 if x == "Ноябрь" else 12
            ))

            # Перебираем уникальные месяцы из словаря days_by_month
            for month in sorted_months:
                column.append(month)
                # Сортировка дней внутри каждого месяца
                sorted_days = sorted(days_by_month[month].keys())
                for day in sorted_days:
                    # Определяем количество повторений для текущего дня
                    repeats = final_day_repeats[month][day]
                    for _ in range(repeats):
                        column.append("")
                column = column[:-1]  # Убираем последнее значение, добавленное для разделителя
            column.append("Итог за период")

            data = [["", ""]]

            # Перебираем уникальные месяцы из словаря days_by_month
            for month in sorted_months:
                sorted_days = sorted(days_by_month[month].keys())
                for day in sorted_days:
                    repeats = final_day_repeats[month][day]
                    for _ in range(repeats):
                        data[0].append(day)
            data[0].append("")

            # Разработка массива других строк
            unique_names = list(unique_row)
            for i in range(1, len(unique_names) + 1):
                data.append([])
                data[i].append(str(i))
                data[i].append(unique_names[i - 1])
                
                for month in sorted_months:
                    sorted_days = sorted(days_by_month[month].keys())
                    for day in sorted_days:
                        repeats = final_day_repeats[month][day]
                        grades_added = []
                        count_end = False
                        for _ in range(repeats):
                            found = False
                            for grade, full_name, count_grades in days_by_month[month][day]:
                                if full_name == unique_names[i - 1]:
                                    if grade not in grades_added:
                                         # Если эта оценка еще не добавлена, добавляем её
                                        for _ in range(count_grades):
                                            data[i].append(grade)
                                        if count_grades > 1:
                                            count_end = True
                                        grades_added.append(grade)
                                        found = True
                                        break
                            if (not found) and (not count_end):
                                data[i].append("")
                data[i].append(avg_grades[i - 1])

            # Сортировка данных по имени ученика (второй столбец)
            data_sorted = sorted(data[1:], key=lambda x: x[1])  # Сортируем только с 1-го индекса (пропускаем заголовок)

            # Обновление номеров учеников
            for index, row in enumerate(data_sorted, start=1):
                row[0] = str(index)  # Обновляем номер ученика

            # Объединяем заголовок с отсортированными данными
            data = [data[0]] + data_sorted

            return jsonify({'columns': column, 'data': data})





            # Разработка массива столбцов
            column = ["№","Ученики"]

            # Инициализация пустого словаря для хранения дней по месяцам
            days_by_month = {}

            unique_row = set()
            avg_grades = []

            # Перебор результатов запроса
            for row in result:
                # Получаем месяц, день и оценку из результата запроса
                month_str = row[1]
                day = row[2]
                grade = row[3]
                full_name = row[0]  # Добавляем получение имени

                if row[0] not in unique_row:
                    unique_row.add(row[0])
                    avg_grades.append(row[4])
                
                # Проверяем, существует ли уже список кортежей для этого месяца
                if month_str not in days_by_month:
                    # Если нет, создаем новый список для этого месяца
                    days_by_month[month_str] = []
                
                # Добавляем кортеж в список для данного месяца
                if grade is None:
                    # Если оценка отсутствует, добавляем пустую строку вместо оценки
                    days_by_month[month_str].append((day, "", full_name))
                else:
                    # Иначе добавляем оценку
                    days_by_month[month_str].append((day, grade, full_name))

            # Сортировка месяцев по порядку
            sorted_months = sorted(days_by_month.keys(), key=lambda x: (
                1 if x == "Январь" else 2 if x == "Февраль" else 3 if x == "Март" else 4 if x == "Апрель" else 5 if x == "Май" else 6 if x == "Июнь" else 7 if x == "Июль" else 8 if x == "Август" else 9 if x == "Сентябрь" else 10 if x == "Октябрь" else 11 if x == "Ноябрь" else 12
            ))

            # Перебираем уникальные месяцы из словаря days_by_month
            for month in sorted_months:
                column.append(month)

                # Добавляем столько пустых значений, сколько дней в данном месяце
                days_in_month = len(days_by_month[month])-1
                for _ in range(days_in_month):
                    column.append("")
            column.append("Итог за период")

            data = [["",""]]

            # Перебираем уникальные месяцы из словаря days_by_month
            for month in sorted_months:
                # Сортировка дней внутри каждого месяца
                sorted_days = sorted(days_by_month[month], key=lambda x: x[0])
                for day, grade, full_name in sorted_days:
                    data[0].append(day)
            data[0].append("")
            data[0].append("")

            # Разработка массива других строк
            unique_names = list(unique_row)
            for i in range(1, len(unique_names) + 1):
                data.append([]) # Добавление нового пустого списка в data
                data[i].append(str(i))
                data[i].append(unique_names[i-1])
                for month in sorted_months:
                    sorted_days = sorted(days_by_month[month], key=lambda x: x[0])
                    for day, grade, full_name in sorted_days:
                        if full_name == unique_names[i-1]:
                            data[i].append(grade)
                        else:  # Если у ученика нет оценки за этот день
                            data[i].append("")
                data[i].append(avg_grades[i-1])

            return jsonify({'columns': column, 'data': data})

###############################################################################################

@app.route('/', methods=['GET', 'POST'])
def index():
    return redirect(url_for('dashboard'))

@app.route('/main')
def dashboard():
    authorized = 'user_id' in session
    subjects = Subject.query.all()  # Получаем все предметы
    return render_template('main.html', authorized=authorized, subjects=subjects)

@app.route('/abc')
def abc_page():
    if 'user_id' not in session:
        flash('Вы должны войти в систему, чтобы загружать фотографии.')
        return redirect(url_for('dashboard'))

    # Ищем пользователя в базе
    user = User.query.filter_by(id_user=session['user_id']).first()
    if not user or user.role != 'teacher':
        flash('Только учителя могут загружать фотографии.')
        return redirect(url_for('dashboard'))

    # Получаем информацию о текущем учителе
    teacher = Teacher.query.filter_by(user_id=user.id_user).first()
    if not teacher:
        flash('Учитель не найден.')
        return redirect(url_for('dashboard'))

    # Получаем предметы, которые ведет учитель
    subjects = db.session.query(Subject).join(Teacher, Teacher.id_subject == Subject.id_subject)\
                .filter(Teacher.user_id == user.id_user).all()
    
    # Получаем список всех классов
    classes = db.session.query(Student.class_number, Student.class_letter).distinct().all()

    return render_template(
        'abc.html',
        subjects=subjects,
        classes=classes,
        teacher_name=f"{teacher.surname} {teacher.first_name} {teacher.patronymic}"
    )

@app.route('/xyz')
def xyz_page():
    return render_template('xyz.html')

@app.route('/abcxyz')
def abcxyz_page():
    return render_template('abcxyz.html')

    
@app.route('/templates/<path:filename>')
def templates(filename):
    return send_from_directory('templates', filename)

###############ABC-анализ данных########################################

@app.route('/analyzeabc', methods=['POST'])
def analyzeABC():
    data = request.json

    thresholds = data.get('thresholds')
    thresholdA = thresholds.get('A')
    thresholdB = thresholds.get('B')
    thresholdC = thresholds.get('C')
    analysisMeasure = data.get('analysisMeasure')  # Получаем выбранную меру
    analysisType = data.get('analysisType')  # Получаем выбранный тип

    result = analyzeABC_data(data, thresholdA,thresholdB, analysisMeasure, analysisType)
    return jsonify(result)

########################################################################

###############XYZ-анализ данных########################################

@app.route('/analyzexyz', methods=['POST'])
def analyzeXYZ():
    data = request.json

    thresholds = data.get('thresholds')
    thresholdX = thresholds.get('X')
    thresholdY = thresholds.get('Y')
    thresholdZ = thresholds.get('Z')
    analysisMeasure1 = data.get('analysisMeasure1') # Получаем начальный период
    analysisMeasure2 = data.get('analysisMeasure2')  # Получаем конечный период

    result = analyzeXYZ_data(data, thresholdX,thresholdY,thresholdZ, analysisMeasure1, analysisMeasure2)
    return jsonify(result)

########################################################################

###############ЗАГРУЗКА ДАННЫХ ИЗ XLS В ТАБЛИЦУ##########################

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    df = pd.read_excel(file)

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
    df = pd.read_excel(file, skiprows=start_index)

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

    #######################Заполнение базы данных##################################
    # Получение идентификатора предмета
    # Проверяем, существует ли предмет уже в базе данных
    subject = Subject.query.filter_by(name=subject_val).first()
    
    # Если предмет уже существует, выводим сообщение об ошибке
    if subject is None:
        # Создаем новый объект предмета
        new_subject = Subject(name=subject_val)
        
        # Добавляем объект в сессию базы данных
        db.session.add(new_subject)
        
        # Сохраняем изменения в базе данных
        db.session.commit()

    subject_query = db.session.execute(
        text("SELECT id_subject FROM school.subjects WHERE name = :subject"),
        {'subject': subject_val}
    )
    subject_id = subject_query.fetchone()[0]  # Получение первого столбца первой строки

    # Разбиваем строку ФИО на отдельные компоненты
    name_parts = teacher_full_name_val.split()
    surname = name_parts[0]
    first_name = name_parts[1]
    patronymic = name_parts[2] if len(name_parts) > 2 else None
    
    # Проверяем, существует ли уже учитель с такими данными
    existing_teacher = Teacher.query.filter_by(surname=surname, first_name=first_name, patronymic=patronymic).first()
    
    # Если учитель не существует, то добавляем
    if existing_teacher is None:
        # Создаем нового учителя
        new_teacher = Teacher(surname=surname, first_name=first_name, patronymic=patronymic, id_subject=subject_id)
    
        # Добавляем нового учителя в сессию базы данных
        db.session.add(new_teacher)
    
        # Сохраняем изменения в базе данных
        db.session.commit()

    # Создаем список для хранения только ФИО учеников
    student_names = []

    # Пропускаем первую строку, так как это заголовки
    for row in data[1:]:
        full_name = row[1]
        student_names.append(full_name)

    for st in student_names:
        # Разбиваем строку ФИО на отдельные компоненты
        name_parts = st.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        
        # Проверяем, существует ли уже такой ученик
        existing_student = Student.query.filter_by(surname=surname, first_name=first_name, patronymic=patronymic, class_number=class_number, class_letter=letter).first()
        
        # Если ученик несуществует, добавляем
        if existing_student is None:
            # Создаем нового ученика
            new_student = Student(
                surname=surname,
                first_name=first_name,
                patronymic=patronymic,
                class_number=class_number,
                class_letter=letter
            )
        
            # Добавляем нового ученика в сессию базы данных
            db.session.add(new_student)
    
            # Сохраняем изменения в базе данных
            db.session.commit()
        
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

        # Получение идентификатора учителя по его имени
        name_parts = teacher_full_name_val.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        if patronymic is None:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
                {'surname': surname, 'first_name': first_name}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
        else:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
                {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки


        # Инициализация словаря для хранения оценок
        performance_counts = {}

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

                # Получение идентификатора ученика по имени
                name_parts = student.split()
                surname = name_parts[0]
                first_name = name_parts[1]
                patronymic = name_parts[2] if len(name_parts) > 2 else None

                # Определяем условия для запроса
                if letter is None and patronymic is None:
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic IS NULL AND class_number = :class_number AND class_letter IS NULL"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                    )
                elif letter is None:
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter IS NULL"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                    )
                elif patronymic is None:
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic IS NULL AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                    )
                else:
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                    )

                student_id = student_query.fetchone()[0]  # Получение идентификатора ученика

                # Формируем ключ для словаря
                key = (student_id, date, value)

                # Увеличиваем счетчик для найденного ключа
                if key in performance_counts:
                    performance_counts[key] += 1
                else:
                    performance_counts[key] = 1  # Начинаем новый подсчет

        # Вставка данных в базу данных
        for (student_id, date, value), count in performance_counts.items():
            if performance == 'Посещаемость':
                # Проверяем, существует ли такая запись
                existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=value, final_attendance=None, id_period=None, date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Attendance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        present=value, 
                        final_attendance=None,
                        id_period=None,
                        count_grades=count,  # Записываем количество
                        date=date
                    )
                    # Добавляем
                    db.session.add(new_performance)
                else:
                    # Если запись уже существует, увеличиваем значение поля count на количество
                    existing_performance.count_grades = count
            else:
                # Проверяем, существует ли такая запись
                existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=None, date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Performance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        grade=value, 
                        id_period=None,
                        count_grades=count,  # Записываем количество
                        date=date
                    )
                    # Добавляем
                    db.session.add(new_performance)
                else:
                    # Если запись уже существует, увеличиваем значение поля count на количество
                    existing_performance.count_grades = count

        # Сохраняем изменения в базе данных
        db.session.commit()

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

            # Получение идентификатора ученика по его имени
            name_parts = student.split()
            surname = name_parts[0]
            first_name = name_parts[1]
            patronymic = name_parts[2] if len(name_parts) > 2 else None
            if letter is None and patronymic is None:
                # Получение идентификатора ученика по его имени
                student_query = db.session.execute(
                    text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                    {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                )
                student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
            else:
                if letter is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                if patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                
                if letter is not None and patronymic is not None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

            date = date_array[len(date_array)-1]

            if performance == 'Посещаемость':
                # Проверяем, существует ли такая запись
                existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=None, final_attendance=value, id_period=last_period,date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Attendance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        present=None, 
                        final_attendance=value,
                        id_period=last_period,
                        count_grades=1,
                        date=date
                    )

                    # Добавляем
                    db.session.add(new_performance)
            
                    # Сохраняем изменения в базе данных
                    db.session.commit()
            else:
                # Проверяем, существует ли такая запись
                existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=last_period, date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Performance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        grade=value, 
                        id_period=last_period,
                        count_grades=1,
                        date=date
                    )
                
                    # Добавляем
                    db.session.add(new_performance)
            
                    # Сохраняем изменения в базе данных
                    db.session.commit()
    else:
        # Получение идентификатора учителя по его имени
        name_parts = teacher_full_name_val.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        if patronymic is None:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
                {'surname': surname, 'first_name': first_name}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
        else:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
                {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки


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

                # Получение идентификатора ученика по его имени
                name_parts = student.split()
                surname = name_parts[0]
                first_name = name_parts[1]
                patronymic = name_parts[2] if len(name_parts) > 2 else None
                if letter is None and patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                else:
                    if letter is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    if patronymic is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    
                    if letter is not None and patronymic is not None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

                date = date_arr[i-2]
                period = periods[i-2]
                if performance == 'Посещаемость':
                    # Проверяем, существует ли такая запись
                    existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=None, final_attendance=value, id_period=period,date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Attendance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            present=None, 
                            final_attendance=value,
                            id_period=period,
                            count_grades=1,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()
                else:
                    # Проверяем, существует ли такая запись
                    existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=period, date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Performance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            grade=value, 
                            id_period=period,
                            count_grades=1,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()
            

    return jsonify({'columns': columns, 'data': data})

    ######################ABC/XYZ-анализ##########################################

@app.route('/load_data_abcxyz', methods=['POST'])
def load_data_abcxyz():
    # Получение данных из запроса
    data = request.json
    class_select = data.get('classSelectValue')
    class_letter = data.get('classLetterSelectValue')
    subject = data.get('subjectSelectValue')
    teacher = data.get('teacherSelectValue')
    performance_type = data.get('performanceSelectValue')
    period_type = data.get('periodSelectValue')
    period_year = data.get('periodSelectYearValue')

    if class_letter == "Выберите букву класса":
        class_letter = None

    # Разделение period_year на начало и конец года
    start_year, end_year = period_year.split('-')

    # Получение идентификатора учителя по его имени
    name_parts = teacher.split()
    surname = name_parts[0]
    first_name = name_parts[1]
    patronymic = name_parts[2] if len(name_parts) > 2 else None
    if patronymic is None:
        # Получение идентификатора ученика по его имени
        teacher_query = db.session.execute(
            text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
            {'surname': surname, 'first_name': first_name}
        )
        teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
    else:
        # Получение идентификатора ученика по его имени
        teacher_query = db.session.execute(
            text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
        )
        teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки

    print(f"Teacher ID: {teacher_id}")  # Отладочный вывод

    # Получение идентификатора предмета
    subject_query = db.session.execute(
        text("SELECT id_subject FROM school.subjects WHERE name = :subject"),
        {'subject': subject}
    )
    subject_id = subject_query.fetchone()[0]  # Получение первого столбца первой строки

    if period_type in ('Год', 'Итог.'):
        if class_letter is None:
            # SQL-запрос для итоговых периодов
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                sp.period,
                MAX(p.grade) AS final_grade
            FROM 
                school.students s
            LEFT JOIN 
                school.performance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            JOIN 
                school.periods sp ON p.id_period = sp.id_period
            WHERE 
                s.class_number = :class_select AND
                s.class_letter is NULL AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, 9, 1) AND 
                    MAKE_DATE(:end_year, 5, 31) AND
                (sp.period = :period_type OR 
                (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
            GROUP BY s.id_student, sp.period
            ORDER BY 
                s.id_student, sp.period;
            ''')
        else:
            # SQL-запрос для итоговых периодов
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                sp.period,
                MAX(p.grade) AS final_grade
            FROM 
                school.students s
            LEFT JOIN 
                school.performance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            JOIN 
                school.periods sp ON p.id_period = sp.id_period
            WHERE 
                s.class_number = :class_select AND
                s.class_letter = :class_letter AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, 9, 1) AND 
                    MAKE_DATE(:end_year, 5, 31) AND
                (sp.period = :period_type OR 
                (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
            GROUP BY s.id_student, sp.period
            ORDER BY 
                s.id_student, sp.period;
            ''')
            
        # Выполнение SQL-запроса
        resultPerf = db.session.execute(query, {
            'class_select': class_select,
            'class_letter': class_letter,
            'subject': subject_id,
            'teacher': teacher_id,
            'period_type': period_type,
            'start_year': start_year,
            'end_year': end_year
        })
        if class_letter is None:
            # SQL-запрос для обычных периодов
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                sp.period,
                MAX(p.final_attendance) as final_grade
            FROM 
                school.students s
            LEFT JOIN 
                school.attendance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            JOIN 
                school.periods sp ON p.id_period = sp.id_period
            WHERE 
                s.class_number = :class_select AND
                s.class_letter is NULL AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, 9, 1) AND 
                    MAKE_DATE(:end_year, 5, 31) AND
                (sp.period = :period_type OR 
                (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
            GROUP BY s.id_student, sp.period
            ORDER BY 
                s.id_student, sp.period;
            ''')
        else:
            # SQL-запрос для обычных периодов
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                sp.period,
                MAX(p.final_attendance) as final_grade
            FROM 
                school.students s
            LEFT JOIN 
                school.attendance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            JOIN 
                school.periods sp ON p.id_period = sp.id_period
            WHERE 
                s.class_number = :class_select AND
                s.class_letter = :class_letter AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, 9, 1) AND 
                    MAKE_DATE(:end_year, 5, 31) AND
                (sp.period = :period_type OR 
                (:period_type IN ('Год', 'Итог.') AND sp.period IN ('1 четверть', '2 четверть', '3 четверть', '4 четверть', '1 полугодие', '2 полугодие')))
            GROUP BY s.id_student, sp.period
            ORDER BY 
                s.id_student, sp.period;
            ''')

        # Выполнение SQL-запроса
        resultAttend = db.session.execute(query, {
            'class_select': class_select,
            'class_letter': class_letter,
            'subject': subject_id,
            'teacher': teacher_id,
            'period_type': period_type,
            'start_year': start_year,
            'end_year': end_year
        })

        # Разработка массива столбцов
        # Инициализация множества для уникальных значений
        unique_periods = set()
        
        # Разработка массива других строк
        unique_row = set()
        grades = []

        column1 = ["№","Ученики", "Учебные периоды"]
        # Перебор результатов запроса
        for row in resultPerf:
            unique_periods.add(row[1])
            unique_row.add(row[0])
            grades.append(row[2])
        unique_per = sorted(list(unique_periods))
        for i in range(1, len(unique_per)):
            if (unique_per[i] in ["1 четверть", "2 четверть", "3 четверть", "4 четверть", "1 полугодие", "2 полугодие"]):
                column1.append("")           
        column1.append(period_type)

        # Разработка массива 1 строки
        data1 = [["", ""]]
        for i in range(0, len(unique_per)):
            if (unique_per[i] in ["1 четверть", "2 четверть", "3 четверть", "4 четверть", "1 полугодие", "2 полугодие"]):
                data1[0].append(unique_per[i])        
        data1[0].append("")

        unique_names = list(unique_row)
        count = 0
        for i in range(1, len(unique_names) + 1):
            data1.append([]) # Добавление нового пустого списка в data
            data1[i].append(str(i))
            data1[i].append(unique_names[i-1])
            for c in range(count, len(grades)):
                count += 1
                data1[i].append(grades[c])
                if (unique_per[c % len(unique_per)] == "Год" or unique_per[c % len(unique_per)] == "Итог."):
                    break

##########Посещение#######################
        # Разработка массива столбцов
        # Инициализация множества для уникальных значений
        unique_periods = set()
        
        # Разработка массива других строк
        unique_row = set()
        grades = []

        column2 = ["№","Ученики", "Учебные периоды"]
        # Перебор результатов запроса
        for row in resultAttend:
            unique_periods.add(row[1])
            unique_row.add(row[0])
            grades.append(row[2])
        unique_per = sorted(list(unique_periods))
        for i in range(1, len(unique_per)):
            if (unique_per[i] in ["1 четверть", "2 четверть", "3 четверть", "4 четверть", "1 полугодие", "2 полугодие"]):
                column2.append("")           
        column2.append(period_type)

        # Разработка массива 1 строки
        data2 = [["", ""]]
        for i in range(0, len(unique_per)):
            if (unique_per[i] in ["1 четверть", "2 четверть", "3 четверть", "4 четверть", "1 полугодие", "2 полугодие"]):
                data2[0].append(unique_per[i])        
        data2[0].append("")

        unique_names = list(unique_row)
        count = 0
        for i in range(1, len(unique_names) + 1):
            data2.append([]) # Добавление нового пустого списка в data
            data2[i].append(str(i))
            data2[i].append(unique_names[i-1])
            for c in range(count, len(grades)):
                count += 1
                data2[i].append(grades[c])
                if (unique_per[c % len(unique_per)] == "Год" or unique_per[c % len(unique_per)] == "Итог."):
                    break

        return jsonify({'columns1': column1, 'data1': data1, 'columns2':column2, 'data2':data2})

    else:
        start_month = '9'
        end_month = '6'
        if (period_type == '1 полугодие'):
            start_month = '9'
            end_month = '12'
        if (period_type == '2 полугодие'):
            start_month = '1'
            end_month = '5'
        if (period_type == '1 четверть'):
            start_month = '9'
            end_month = '10'
        if (period_type == '2 четверть'):
            start_month = '11'
            end_month = '12'
        if (period_type == '3 четверть'):
            start_month = '1'
            end_month = '3'
        if (period_type == '4 четверть'):
            start_month = '4'
            end_month = '5'

        # SQL-запрос для четвертей  и полугодий
        if class_letter is None:
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                CASE 
                    WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                    WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                    WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                    WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                    WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                    WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                    WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                    WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                    WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                END AS month,
                EXTRACT(DAY FROM p.date) AS day,
                p.grade AS lesson_grade,
                ROUND(AVG(p.grade) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)), 2) AS average_grade
            FROM 
                school.students s
            LEFT JOIN 
                school.performance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            WHERE 
                s.class_number = :class_select AND
                s.class_letter is NULL AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.id_period IS NULL AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, :start_month, 1) AND 
                    MAKE_DATE(:end_year, :end_month, 31)
            ORDER BY 
                s.id_student, p.date;
            ''')
        else:
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                CASE 
                    WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                    WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                    WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                    WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                    WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                    WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                    WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                    WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                    WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                END AS month,
                EXTRACT(DAY FROM p.date) AS day,
                p.grade AS lesson_grade,
                ROUND(AVG(p.grade) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)), 2) AS average_grade
            FROM 
                school.students s
            LEFT JOIN 
                school.performance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            WHERE 
                s.class_number = :class_select AND
                s.class_letter = :class_letter AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.id_period IS NULL AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, :start_month, 1) AND 
                    MAKE_DATE(:end_year, :end_month, 31)
            ORDER BY 
                s.id_student, p.date;
            ''')

        # Выполнение SQL-запроса
        resultPerf = db.session.execute(query, {
            'class_select': class_select,
            'class_letter': class_letter,
            'subject': subject_id,
            'teacher': teacher_id,
            'start_year': start_year,
            'end_year': end_year,
            'start_month': start_month,
            'end_month': end_month
        })

        # Разработка массива столбцов
        column1 = ["№","Ученики"]

        # Инициализация пустого словаря для хранения дней по месяцам
        days_by_month = {}

        unique_row = set()
        avg_grades = []
            
        # Перебор результатов запроса
        for row in resultPerf:
            # Получаем месяц, день и оценку из результата запроса
            month_str = row[1]
            day = row[2]
            grade = row[3]
            full_name = row[0]  # Добавляем получение имени

            if row[0] not in unique_row:
                unique_row.add(row[0])
                avg_grades.append(row[4])
            
            # Проверяем, существует ли уже список кортежей для этого месяца
            if month_str not in days_by_month:
                # Если нет, создаем новый список для этого месяца
                days_by_month[month_str] = []
            
            # Добавляем кортеж в список для данного месяца
            if grade is None:
                # Если оценка отсутствует, добавляем пустую строку вместо оценки
                days_by_month[month_str].append((day, "", full_name))
            else:
                # Иначе добавляем оценку
                days_by_month[month_str].append((day, grade, full_name))

        # Сортировка месяцев по порядку
        sorted_months = sorted(days_by_month.keys(), key=lambda x: (
            1 if x == "Январь" else 2 if x == "Февраль" else 3 if x == "Март" else 4 if x == "Апрель" else 5 if x == "Май" else 6 if x == "Июнь" else 7 if x == "Июль" else 8 if x == "Август" else 9 if x == "Сентябрь" else 10 if x == "Октябрь" else 11 if x == "Ноябрь" else 12
        ))

        # Перебираем уникальные месяцы из словаря days_by_month
        for month in sorted_months:
            column1.append(month)

            # Добавляем столько пустых значений, сколько дней в данном месяце
            days_in_month = len(days_by_month[month])-1
            for _ in range(days_in_month):
                column1.append("")
        column1.append("Средняя оценка")
        column1.append("Оценка за период")

        data1 = [["",""]]

        # Перебираем уникальные месяцы из словаря days_by_month
        for month in sorted_months:
            # Сортировка дней внутри каждого месяца
            sorted_days = sorted(days_by_month[month], key=lambda x: x[0])
            for day, grade, full_name in sorted_days:
                data1[0].append(day)
        data1[0].append("")
        data1[0].append("")

        # Разработка массива других строк
        unique_names = list(unique_row)
        for i in range(1, len(unique_names) + 1):
            data1.append([]) # Добавление нового пустого списка в data
            data1[i].append(str(i))
            data1[i].append(unique_names[i-1])
            for month in sorted_months:
                sorted_days = sorted(days_by_month[month], key=lambda x: x[0])
                for day, grade, full_name in sorted_days:
                    if full_name == unique_names[i-1]:
                        data1[i].append(grade)
                    else:  # Если у ученика нет оценки за этот день
                        data1[i].append("")
            data1[i].append(avg_grades[i-1])
            data1[i].append(str(round(float(avg_grades[i-1]))))
            
        if class_letter is None:
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                CASE 
                    WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                    WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                    WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                    WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                    WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                    WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                    WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                    WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                    WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                END AS month,
                EXTRACT(DAY FROM p.date) AS day,
                p.present as lesson_grade,
                COUNT(p.present) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)) AS present_count
            FROM 
                school.students s
            LEFT JOIN 
                school.attendance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            WHERE 
                s.class_number = :class_select AND
                s.class_letter is NULL AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.present IS NOT NULL AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, :start_month, 1) AND 
                    MAKE_DATE(:end_year, :end_month, 31)
            ORDER BY 
                s.id_student, p.date;
            ''')
        else:
            query = text('''
            SELECT 
                CONCAT(s.surname, ' ', s.first_name, ' ', COALESCE(s.patronymic, '')) AS full_name,
                CASE 
                    WHEN EXTRACT(MONTH FROM p.date) = 1 THEN 'Январь'
                    WHEN EXTRACT(MONTH FROM p.date) = 2 THEN 'Февраль'
                    WHEN EXTRACT(MONTH FROM p.date) = 3 THEN 'Март'
                    WHEN EXTRACT(MONTH FROM p.date) = 4 THEN 'Апрель'
                    WHEN EXTRACT(MONTH FROM p.date) = 5 THEN 'Май'
                    WHEN EXTRACT(MONTH FROM p.date) = 6 THEN 'Июнь'
                    WHEN EXTRACT(MONTH FROM p.date) = 7 THEN 'Июль'
                    WHEN EXTRACT(MONTH FROM p.date) = 8 THEN 'Август'
                    WHEN EXTRACT(MONTH FROM p.date) = 9 THEN 'Сентябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 10 THEN 'Октябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 11 THEN 'Ноябрь'
                    WHEN EXTRACT(MONTH FROM p.date) = 12 THEN 'Декабрь'
                END AS month,
                EXTRACT(DAY FROM p.date) AS day,
                p.present as lesson_grade,
                COUNT(p.present) OVER (PARTITION BY s.id_student, EXTRACT(YEAR FROM p.date)) AS present_count
            FROM 
                school.students s
            LEFT JOIN 
                school.attendance p ON s.id_student = p.id_student
            JOIN 
                school.teachers t ON p.id_teacher = t.id_teacher
            WHERE 
                s.class_number = :class_select AND
                s.class_letter = :class_letter AND
                t.id_teacher = :teacher AND
                t.id_subject = :subject AND
                p.present IS NOT NULL AND
                p.date BETWEEN 
                    MAKE_DATE(:start_year, :start_month, 1) AND 
                    MAKE_DATE(:end_year, :end_month, 31)
            ORDER BY 
                s.id_student, p.date;
            ''')

        # Выполнение SQL-запроса
        resultAttend = db.session.execute(query, {
            'class_select': class_select,
            'class_letter': class_letter,
            'subject': subject_id,
            'teacher': teacher_id,
            'start_year': start_year,
            'end_year': end_year,
            'start_month': start_month,
            'end_month': end_month
        })

        # Разработка массива столбцов
        column2 = ["№","Ученики"]

        # Инициализация пустого словаря для хранения дней по месяцам
        days_by_month = {}

        unique_row = set()
        avg_grades = []

        # Перебор результатов запроса
        for row in resultAttend:
            # Получаем месяц, день и оценку из результата запроса
            month_str = row[1]
            day = row[2]
            grade = row[3]
            full_name = row[0]  # Добавляем получение имени

            if row[0] not in unique_row:
                unique_row.add(row[0])
                avg_grades.append(row[4])
            
            # Проверяем, существует ли уже список кортежей для этого месяца
            if month_str not in days_by_month:
                # Если нет, создаем новый список для этого месяца
                days_by_month[month_str] = []
            
            # Добавляем кортеж в список для данного месяца
            if grade is None:
                # Если оценка отсутствует, добавляем пустую строку вместо оценки
                days_by_month[month_str].append((day, "", full_name))
            else:
                # Иначе добавляем оценку
                days_by_month[month_str].append((day, grade, full_name))

        # Сортировка месяцев по порядку
        sorted_months = sorted(days_by_month.keys(), key=lambda x: (
            1 if x == "Январь" else 2 if x == "Февраль" else 3 if x == "Март" else 4 if x == "Апрель" else 5 if x == "Май" else 6 if x == "Июнь" else 7 if x == "Июль" else 8 if x == "Август" else 9 if x == "Сентябрь" else 10 if x == "Октябрь" else 11 if x == "Ноябрь" else 12
        ))

        # Перебираем уникальные месяцы из словаря days_by_month
        for month in sorted_months:
            column2.append(month)

            # Добавляем столько пустых значений, сколько дней в данном месяце
            days_in_month = len(days_by_month[month])-1
            for _ in range(days_in_month):
                column2.append("")
        column2.append("Итог за период")

        data2 = [["",""]]

        # Перебираем уникальные месяцы из словаря days_by_month
        for month in sorted_months:
            # Сортировка дней внутри каждого месяца
            sorted_days = sorted(days_by_month[month], key=lambda x: x[0])
            for day, grade, full_name in sorted_days:
                data2[0].append(day)
        data2[0].append("")
        data2[0].append("")

        # Разработка массива других строк
        unique_names = list(unique_row)
        for i in range(1, len(unique_names) + 1):
            data2.append([]) # Добавление нового пустого списка в data
            data2[i].append(str(i))
            data2[i].append(unique_names[i-1])
            for month in sorted_months:
                sorted_days = sorted(days_by_month[month], key=lambda x: x[0])
                for day, grade, full_name in sorted_days:
                    if full_name == unique_names[i-1]:
                        data2[i].append(grade)
                    else:  # Если у ученика нет оценки за этот день
                        data2[i].append("")
            data2[i].append(avg_grades[i-1])

        return jsonify({'columns1': column1, 'data1': data1,'columns2': column2, 'data2': data2})        


@app.route('/uploadabcxyz', methods=['POST'])
def uploadabcxyz():
    file = request.files['file']
    # Чтение двух листов из файла Excel
    sheets = pd.read_excel(file, sheet_name=[0, 1])

    df1 = sheets[0]
    
    df2 = sheets[1]

    # Работа с данными
    if 'Учебный год' not in df1.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Учебный год' не найдена в загруженном файле")
    
    if 'Класс' not in df1.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Класс' не найдена в загруженном файле")

    if 'Учитель' not in df1.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Учитель' не найдена в загруженном файле")

    if 'Предмет' not in df1.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Предмет' не найдена в загруженном файле")
    
    if 'Тип учета' not in df1.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Тип учета' не найдена в загруженном файле")

    # Проверка наличия столбца 'Ученики'
    if 'Ученики' not in df1.iloc[:, 0].values:
        raise ValueError("Ошибка: Столбец 'Ученики' не найден в загруженном файле")
    
    indexYear = df1[df1.iloc[:, 0] == 'Учебный год'].index[0]
    indexClass = df1[df1.iloc[:, 0] == 'Класс'].index[0]
    indexTeacher = df1[df1.iloc[:, 0] == 'Учитель'].index[0]
    indexSubject = df1[df1.iloc[:, 0] == 'Предмет'].index[0]
    indexPerAt = df1[df1.iloc[:, 0] == 'Тип учета'].index[0]

    year_val = df1.iloc[indexYear, 1]
    class_val = str(df1.iloc[indexClass, 1])
    teacher_full_name_val = df1.iloc[indexTeacher, 1]
    subject_val = df1.iloc[indexSubject, 1]
    performance = df1.iloc[indexPerAt, 1]

    start_year, end_year = year_val.split('/')

    if any(char.isalpha() for char in class_val):
        class_number, letter = ''.join(filter(str.isdigit, class_val)), ''.join(filter(str.isalpha, class_val))
    else:
        class_number = class_val
        letter = None

    ##################Получение Data и Columns###############################
    
    # Найдем индекс строки, где начинается таблица с учениками
    start_index = df1[df1.iloc[:, 0] == 'Ученики'].index[0]

    # Чтение данных из файла Excel, начиная с строки, где найдено значение "Ученики"
    df1 = pd.read_excel(file,sheet_name=0, skiprows=start_index)

    # Задаем правильные имена столбцов
    # Заменяем 'nan' на пустые строки в именах столбцов
    df1.columns = df1.iloc[0].astype(str).str.replace('nan', '')
    
    # Заменяем 'nan' на пустые строки в строках DataFrame
    df1 = df1.apply(lambda x: x.map(lambda x: '' if pd.isna(x) else x))
    
    df1 = df1[1:]

    # Находим индекс последней строки с данными ученика
    last_student_index = df1[df1.iloc[:, 0].astype(str).str.match(r'\d+\..*')].index[-1]

    # Удаляем строки после последней строки с данными ученика
    df1 = df1.iloc[:last_student_index]

    # Преобразуем значения столбца в строки перед использованием .str
    df1.iloc[:, 0] = df1.iloc[:, 0].astype(str)

    data1 = pd.DataFrame(df1)

    if 'Средняя оценка' in data1.columns:
        # Применение форматирования к столбцу Средняя оценка
        data1['Средняя оценка'] = data1['Средняя оценка'].apply(format_value)

    # Удаление столбцов, содержащих только NaN значения
    data1 = data1.dropna(axis=1, how="all")

    # Создаем столбец '№' с номерами строк
    data1.insert(0, '№', range(1, len(data1) + 1))

    # Удаляем первую цифру из столбца 'Ученики' с помощью регулярного выражения
    data1['Ученики'] = data1['Ученики'].str.replace(r'^\d+\.\s', '', regex=True)

    # Конец работы с данными

    column1 = data1.columns.tolist()

    # Заполнение NaN значений пустыми строками
    data1 = data1.where(pd.notnull(data1), "")
    
    # Преобразование данных в формат JSON
    # data1 = data1.to_dict(orient ='split') 
    data1 = data1.values.tolist()

    # Преобразование списка списков
    for i, row in enumerate(data1):
        if i == 0:
            row[0] =  ''  # Добавление пустого элемента в начало первого вложенного списка
        else:
            row[0] = i   # Добавление номера строки в начало каждого вложенного списка

    #######################Заполнение базы данных##################################
    # Получение идентификатора предмета
    # Проверяем, существует ли предмет уже в базе данных
    subject = Subject.query.filter_by(name=subject_val).first()
    
    # Если предмет уже существует, выводим сообщение об ошибке
    if subject is None:
        # Создаем новый объект предмета
        new_subject = Subject(name=subject_val)
        
        # Добавляем объект в сессию базы данных
        db.session.add(new_subject)
        
        # Сохраняем изменения в базе данных
        db.session.commit()

    subject_query = db.session.execute(
        text("SELECT id_subject FROM school.subjects WHERE name = :subject"),
        {'subject': subject_val}
    )
    subject_id = subject_query.fetchone()[0]  # Получение первого столбца первой строки

    # Разбиваем строку ФИО на отдельные компоненты
    name_parts = teacher_full_name_val.split()
    surname = name_parts[0]
    first_name = name_parts[1]
    patronymic = name_parts[2] if len(name_parts) > 2 else None
    
    # Проверяем, существует ли уже учитель с такими данными
    existing_teacher = Teacher.query.filter_by(surname=surname, first_name=first_name, patronymic=patronymic).first()
    
    # Если учитель уже существует, выводим сообщение об ошибке
    if existing_teacher is None:
        # Создаем нового учителя
        new_teacher = Teacher(surname=surname, first_name=first_name, patronymic=patronymic, id_subject=subject_id)
    
        # Добавляем нового учителя в сессию базы данных
        db.session.add(new_teacher)
    
        # Сохраняем изменения в базе данных
        db.session.commit()

    # Создаем список для хранения только ФИО учеников
    student_names = []

    # Пропускаем первую строку, так как это заголовки
    for row in data1[1:]:
        full_name = row[1]
        student_names.append(full_name)

    for st in student_names:
        # Разбиваем строку ФИО на отдельные компоненты
        name_parts = st.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        
        # Проверяем, существует ли уже такой ученик
        existing_student = Student.query.filter_by(surname=surname, first_name=first_name, patronymic=patronymic, class_number=class_number, class_letter=letter).first()
        
        # Если ученик уже несуществует, добавляем
        if existing_student is None:
            # Создаем нового ученика
            new_student = Student(
                surname=surname,
                first_name=first_name,
                patronymic=patronymic,
                class_number=class_number,
                class_letter=letter
            )
        
            # Добавляем нового ученика в сессию базы данных
            db.session.add(new_student)
    
            # Сохраняем изменения в базе данных
            db.session.commit()
        
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

    if any(col in months for col in column1):
        month_indices = []
        for col in column1:
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
        
        # Найти индексы всех месяцев в column1
        month_ind = [i for i, col in enumerate(column1) if col in months]

        # Список для хранения числовых значений каждого месяца
        all_month_numbers = []

        # Обработка каждого месяца
        for i in range(len(month_ind)):
            start_index = month_ind[i]
            end_index = month_ind[i + 1] if i + 1 < len(month_ind) else len(column1)
            
            # Найти последний пустой индекс перед следующим месяцем
            last_empty_index = end_index - 1
            while last_empty_index > start_index and column1[last_empty_index] != '':
                last_empty_index -= 1

            # Извлечь числа из первой строки для текущего диапазона
            numbers = data1[0][start_index:last_empty_index + 1]
            all_month_numbers.append(str(numbers))

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

        # Получение идентификатора учителя по его имени
        name_parts = teacher_full_name_val.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        if patronymic is None:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
                {'surname': surname, 'first_name': first_name}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
        else:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
                {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки

        for row in data1[1:]:  # Начинаем считывание с data1[1]
            # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
            for i in range(2, 2+len(date_array)):
                value = row[i]
                if value == '':
                    continue
                student = row[1]

                # Получение идентификатора ученика по его имени
                name_parts = student.split()
                surname = name_parts[0]
                first_name = name_parts[1]
                patronymic = name_parts[2] if len(name_parts) > 2 else None
                if letter is None and patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                else:
                    if letter is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    if patronymic is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    
                    if letter is not None and patronymic is not None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

                date = date_array[i-2]

                if performance == 'Посещаемость':
                    # Проверяем, существует ли такая запись
                    existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=value, final_attendance=None, id_period=None,date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Attendance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            present=value, 
                            final_attendance=None,
                            id_period=None,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()
                else:
                    # Проверяем, существует ли такая запись
                    existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=None, date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Performance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            grade=value, 
                            id_period=None,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()

        year, month = month_indices[0].split('-')  # Разбиваем строку на год и месяц

        if int(month) == 9 or int(month) == 10:
            last_period = 1
        if int(month) == 11 or int(month) == 12:
            last_period = 2
        if int(month) == 1 or int(month) == 3 or int(month) == 2:
            last_period = 3
        if int(month) == 4 or int(month) == 5:
            last_period = 4

        for row in data1[1:]:  # Начинаем считывание с data1[1]
            # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
            value = row[len(row)-1]
            if value == '':
                continue
            student = row[1]

            # Получение идентификатора ученика по его имени
            name_parts = student.split()
            surname = name_parts[0]
            first_name = name_parts[1]
            patronymic = name_parts[2] if len(name_parts) > 2 else None
            if letter is None and patronymic is None:
                # Получение идентификатора ученика по его имени
                student_query = db.session.execute(
                    text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                    {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                )
                student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
            else:
                if letter is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                if patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                
                if letter is not None and patronymic is not None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

            date = date_array[len(date_array)-1]

            if performance == 'Посещаемость':
                # Проверяем, существует ли такая запись
                existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=None, final_attendance=value, id_period=last_period,date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Attendance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        present=None, 
                        final_attendance=value,
                        id_period=last_period,
                        date=date
                    )
                
                    # Добавляем
                    db.session.add(new_performance)
            
                    # Сохраняем изменения в базе данных
                    db.session.commit()
            else:
                # Проверяем, существует ли такая запись
                existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=last_period, date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Performance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        grade=value, 
                        id_period=last_period,
                        date=date
                    )
                
                    # Добавляем
                    db.session.add(new_performance)
            
                    # Сохраняем изменения в базе данных
                    db.session.commit()
    else:
        # Получение идентификатора учителя по его имени
        name_parts = teacher_full_name_val.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        if patronymic is None:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
                {'surname': surname, 'first_name': first_name}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
        else:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
                {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки


        periods = []
        date_arr = []

        for item in data1[0][2:]:  # Начинаем считывание с элемента с индексом 2
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

        for item in column1:  # Начинаем считывание с элемента с индексом 2
            if item == 'Год':
                date_arr.append(str(end_year + '-05-31'))
                periods.append(5)
            elif item == 'Итог.':
                date_arr.append(str(end_year + '-05-31'))
                periods.append(6)
        
        for row in data1[1:]:  # Начинаем считывание с data1[1]
            for i in range(2, len(row)):
                # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
                value = row[i]
                student = row[1]

                # Получение идентификатора ученика по его имени
                name_parts = student.split()
                surname = name_parts[0]
                first_name = name_parts[1]
                patronymic = name_parts[2] if len(name_parts) > 2 else None
                if letter is None and patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                else:
                    if letter is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    if patronymic is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    
                    if letter is not None and patronymic is not None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

                date = date_arr[i-2]
                period = periods[i-2]
                if performance == 'Посещаемость':
                    # Проверяем, существует ли такая запись
                    existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=None, final_attendance=value, id_period=period,date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Attendance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            present=None, 
                            final_attendance=value,
                            id_period=period,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()
                else:
                    # Проверяем, существует ли такая запись
                    existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=period, date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Performance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            grade=value, 
                            id_period=period,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()

    #################Посещение или успеваемость##########################

        # Работа с данными
    if 'Учебный год' not in df2.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Учебный год' не найдена в загруженном файле")
    
    if 'Класс' not in df2.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Класс' не найдена в загруженном файле")

    if 'Учитель' not in df2.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Учитель' не найдена в загруженном файле")

    if 'Предмет' not in df2.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Предмет' не найдена в загруженном файле")
    
    if 'Тип учета' not in df2.iloc[:,0].values:
        raise ValueError("Ошибка: Строка 'Тип учета' не найдена в загруженном файле")

    # Проверка наличия столбца 'Ученики'
    if 'Ученики' not in df2.iloc[:, 0].values:
        raise ValueError("Ошибка: Столбец 'Ученики' не найден в загруженном файле")
    
    indexYear = df2[df2.iloc[:, 0] == 'Учебный год'].index[0]
    indexClass = df2[df2.iloc[:, 0] == 'Класс'].index[0]
    indexTeacher = df2[df2.iloc[:, 0] == 'Учитель'].index[0]
    indexSubject = df2[df2.iloc[:, 0] == 'Предмет'].index[0]
    indexPerAt = df2[df2.iloc[:, 0] == 'Тип учета'].index[0]

    year_val = df2.iloc[indexYear, 1]
    class_val = str(df2.iloc[indexClass, 1])
    teacher_full_name_val = df2.iloc[indexTeacher, 1]
    subject_val = df2.iloc[indexSubject, 1]
    performance = df2.iloc[indexPerAt, 1]

    start_year, end_year = year_val.split('/')

    if any(char.isalpha() for char in class_val):
        class_number, letter = ''.join(filter(str.isdigit, class_val)), ''.join(filter(str.isalpha, class_val))
    else:
        class_number = class_val
        letter = None

    ##################Получение Data и Columns###############################
    
    # Найдем индекс строки, где начинается таблица с учениками
    start_index = df2[df2.iloc[:, 0] == 'Ученики'].index[0]

    # Чтение данных из файла Excel, начиная с строки, где найдено значение "Ученики"
    df2 = pd.read_excel(file,sheet_name=1, skiprows=start_index)

    # Задаем правильные имена столбцов
    # Заменяем 'nan' на пустые строки в именах столбцов
    df2.columns = df2.iloc[0].astype(str).str.replace('nan', '')
    
    # Заменяем 'nan' на пустые строки в строках DataFrame
    df2 = df2.apply(lambda x: x.map(lambda x: '' if pd.isna(x) else x))
    
    df2 = df2[1:]

    # Находим индекс последней строки с данными ученика
    last_student_index = df2[df2.iloc[:, 0].astype(str).str.match(r'\d+\..*')].index[-1]

    # Удаляем строки после последней строки с данными ученика
    df2 = df2.iloc[:last_student_index]

    # Преобразуем значения столбца в строки перед использованием .str
    df2.iloc[:, 0] = df2.iloc[:, 0].astype(str)

    data2 = pd.DataFrame(df2)

    if 'Средняя оценка' in data2.columns:
        # Применение форматирования к столбцу Средняя оценка
        data2['Средняя оценка'] = data2['Средняя оценка'].apply(format_value)

    # Удаление столбцов, содержащих только NaN значения
    data2 = data2.dropna(axis=1, how="all")

    # Создаем столбец '№' с номерами строк
    data2.insert(0, '№', range(1, len(data2) + 1))

    # Удаляем первую цифру из столбца 'Ученики' с помощью регулярного выражения
    data2['Ученики'] = data2['Ученики'].str.replace(r'^\d+\.\s', '', regex=True)

    # Конец работы с данными

    column2 = data2.columns.tolist()

    # Заполнение NaN значений пустыми строками
    data2 = data2.where(pd.notnull(data2), "")
    
    # Преобразование данных в формат JSON
    # data2 = data2.to_dict(orient ='split') 
    data2 = data2.values.tolist()

    # Преобразование списка списков
    for i, row in enumerate(data2):
        if i == 0:
            row[0] =  ''  # Добавление пустого элемента в начало первого вложенного списка
        else:
            row[0] = i   # Добавление номера строки в начало каждого вложенного списка

    #######################Заполнение базы данных##################################
    # Получение идентификатора предмета
    # Проверяем, существует ли предмет уже в базе данных
    subject = Subject.query.filter_by(name=subject_val).first()
    
    # Если предмет уже существует, выводим сообщение об ошибке
    if subject is None:
        # Создаем новый объект предмета
        new_subject = Subject(name=subject_val)
        
        # Добавляем объект в сессию базы данных
        db.session.add(new_subject)
        
        # Сохраняем изменения в базе данных
        db.session.commit()

    subject_query = db.session.execute(
        text("SELECT id_subject FROM school.subjects WHERE name = :subject"),
        {'subject': subject_val}
    )
    subject_id = subject_query.fetchone()[0]  # Получение первого столбца первой строки

    # Разбиваем строку ФИО на отдельные компоненты
    name_parts = teacher_full_name_val.split()
    surname = name_parts[0]
    first_name = name_parts[1]
    patronymic = name_parts[2] if len(name_parts) > 2 else None
    
    # Проверяем, существует ли уже учитель с такими данными
    existing_teacher = Teacher.query.filter_by(surname=surname, first_name=first_name, patronymic=patronymic).first()
    
    # Если учитель уже существует, выводим сообщение об ошибке
    if existing_teacher is None:
        # Создаем нового учителя
        new_teacher = Teacher(surname=surname, first_name=first_name, patronymic=patronymic, id_subject=subject_id)
    
        # Добавляем нового учителя в сессию базы данных
        db.session.add(new_teacher)
    
        # Сохраняем изменения в базе данных
        db.session.commit()

    # Создаем список для хранения только ФИО учеников
    student_names = []

    # Пропускаем первую строку, так как это заголовки
    for row in data2[1:]:
        full_name = row[1]
        student_names.append(full_name)

    for st in student_names:
        # Разбиваем строку ФИО на отдельные компоненты
        name_parts = st.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        
        # Проверяем, существует ли уже такой ученик
        existing_student = Student.query.filter_by(surname=surname, first_name=first_name, patronymic=patronymic, class_number=class_number, class_letter=letter).first()
        
        # Если ученик уже несуществует, добавляем
        if existing_student is None:
            # Создаем нового ученика
            new_student = Student(
                surname=surname,
                first_name=first_name,
                patronymic=patronymic,
                class_number=class_number,
                class_letter=letter
            )
        
            # Добавляем нового ученика в сессию базы данных
            db.session.add(new_student)
    
            # Сохраняем изменения в базе данных
            db.session.commit()
        
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

    if any(col in months for col in column2):
        month_indices = []
        for col in column2:
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
        
        # Найти индексы всех месяцев в column2
        month_ind = [i for i, col in enumerate(column2) if col in months]

        # Список для хранения числовых значений каждого месяца
        all_month_numbers = []

        # Обработка каждого месяца
        for i in range(len(month_ind)):
            start_index = month_ind[i]
            end_index = month_ind[i + 1] if i + 1 < len(month_ind) else len(column2)
            
            # Найти последний пустой индекс перед следующим месяцем
            last_empty_index = end_index - 1
            while last_empty_index > start_index and column2[last_empty_index] != '':
                last_empty_index -= 1

            # Извлечь числа из первой строки для текущего диапазона
            numbers = data2[0][start_index:last_empty_index + 1]
            all_month_numbers.append(str(numbers))

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

        # Получение идентификатора учителя по его имени
        name_parts = teacher_full_name_val.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        if patronymic is None:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
                {'surname': surname, 'first_name': first_name}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
        else:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
                {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки

        for row in data2[1:]:  # Начинаем считывание с data2[1]
            # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
            for i in range(2, 2+len(date_array)):
                value = row[i]
                if value == '':
                    continue
                student = row[1]

                # Получение идентификатора ученика по его имени
                name_parts = student.split()
                surname = name_parts[0]
                first_name = name_parts[1]
                patronymic = name_parts[2] if len(name_parts) > 2 else None
                if letter is None and patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                else:
                    if letter is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    if patronymic is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    
                    if letter is not None and patronymic is not None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

                date = date_array[i-2]

                if performance == 'Посещаемость':
                    # Проверяем, существует ли такая запись
                    existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=value, final_attendance=None, id_period=None,date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Attendance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            present=value, 
                            final_attendance=None,
                            id_period=None,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()
                else:
                    # Проверяем, существует ли такая запись
                    existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=None, date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Performance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            grade=value, 
                            id_period=None,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()

        year, month = month_indices[0].split('-')  # Разбиваем строку на год и месяц

        if int(month) == 9 or int(month) == 10:
            last_period = 1
        if int(month) == 11 or int(month) == 12:
            last_period = 2
        if int(month) == 1 or int(month) == 3 or int(month) == 2:
            last_period = 3
        if int(month) == 4 or int(month) == 5:
            last_period = 4

        for row in data2[1:]:  # Начинаем считывание с data2[1]
            # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
            value = row[len(row)-1]
            if value == '':
                continue
            student = row[1]

            # Получение идентификатора ученика по его имени
            name_parts = student.split()
            surname = name_parts[0]
            first_name = name_parts[1]
            patronymic = name_parts[2] if len(name_parts) > 2 else None
            if letter is None and patronymic is None:
                # Получение идентификатора ученика по его имени
                student_query = db.session.execute(
                    text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                    {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                )
                student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
            else:
                if letter is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                if patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                
                if letter is not None and patronymic is not None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                        {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

            date = date_array[len(date_array)-1]

            if performance == 'Посещаемость':
                # Проверяем, существует ли такая запись
                existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=None, final_attendance=value, id_period=last_period,date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Attendance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        present=None, 
                        final_attendance=value,
                        id_period=last_period,
                        date=date
                    )
                
                    # Добавляем
                    db.session.add(new_performance)
            
                    # Сохраняем изменения в базе данных
                    db.session.commit()
            else:
                # Проверяем, существует ли такая запись
                existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=last_period, date=date).first()
                if existing_performance is None:
                    # Создаем новую запись
                    new_performance = Performance(
                        id_student=student_id, 
                        id_teacher=teacher_id, 
                        grade=value, 
                        id_period=last_period,
                        date=date
                    )
                
                    # Добавляем
                    db.session.add(new_performance)
            
                    # Сохраняем изменения в базе данных
                    db.session.commit()
    else:
        # Получение идентификатора учителя по его имени
        name_parts = teacher_full_name_val.split()
        surname = name_parts[0]
        first_name = name_parts[1]
        patronymic = name_parts[2] if len(name_parts) > 2 else None
        if patronymic is None:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL"),
                {'surname': surname, 'first_name': first_name}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки
        else:
            # Получение идентификатора ученика по его имени
            teacher_query = db.session.execute(
                text("SELECT id_teacher FROM school.teachers WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic"),
                {'surname': surname, 'first_name': first_name, 'patronymic': patronymic}
            )
            teacher_id = teacher_query.fetchone()[0]  # Получение первого столбца первой строки


        periods = []
        date_arr = []

        for item in data2[0][2:]:  # Начинаем считывание с элемента с индексом 2
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

        for item in column2:  # Начинаем считывание с элемента с индексом 2
            if item == 'Год':
                date_arr.append(str(end_year + '-05-31'))
                periods.append(5)
            elif item == 'Итог.':
                date_arr.append(str(end_year + '-05-31'))
                periods.append(6)
        
        for row in data2[1:]:  # Начинаем считывание с data2[1]
            for i in range(2, len(row)):
                # Получение значений от индекса 2 до 2+len(date_array) для текущей строки
                value = row[i]
                student = row[1]

                # Получение идентификатора ученика по его имени
                name_parts = student.split()
                surname = name_parts[0]
                first_name = name_parts[1]
                patronymic = name_parts[2] if len(name_parts) > 2 else None
                if letter is None and patronymic is None:
                    # Получение идентификатора ученика по его имени
                    student_query = db.session.execute(
                        text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter is NULL"),
                        {'surname': surname, 'first_name': first_name, 'class_number': class_number}
                    )
                    student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                else:
                    if letter is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter is NULL"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    if patronymic is None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic is NULL AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки
                    
                    if letter is not None and patronymic is not None:
                        # Получение идентификатора ученика по его имени
                        student_query = db.session.execute(
                            text("SELECT id_student FROM school.students WHERE surname = :surname AND first_name = :first_name AND patronymic = :patronymic AND class_number = :class_number AND class_letter = :class_letter"),
                            {'surname': surname, 'first_name': first_name, 'patronymic': patronymic, 'class_number': class_number, 'class_letter': letter}
                        )
                        student_id = student_query.fetchone()[0]  # Получение первого столбца первой строки]

                date = date_arr[i-2]
                period = periods[i-2]
                if performance == 'Посещаемость':
                    # Проверяем, существует ли такая запись
                    existing_performance = Attendance.query.filter_by(id_student=student_id, id_teacher=teacher_id, present=None, final_attendance=value, id_period=period,date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Attendance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            present=None, 
                            final_attendance=value,
                            id_period=period,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()
                else:
                    # Проверяем, существует ли такая запись
                    existing_performance = Performance.query.filter_by(id_student=student_id, id_teacher=teacher_id, grade=value, id_period=period, date=date).first()
                    if existing_performance is None:
                        # Создаем новую запись
                        new_performance = Performance(
                            id_student=student_id, 
                            id_teacher=teacher_id, 
                            grade=value, 
                            id_period=period,
                            date=date
                        )
                    
                        # Добавляем
                        db.session.add(new_performance)
                
                        # Сохраняем изменения в базе данных
                        db.session.commit()        

    return jsonify({'columns1': column1, 'data1': data1,'columns2': column2, 'data2': data2})



@app.route('/analyzeabcxyz', methods=['POST'])
def analyzeABCXYZData():
    data = request.json

    thresholds = data.get('thresholds')
    thresholdA = thresholds.get('A')
    thresholdB = thresholds.get('B')
    thresholdC = thresholds.get('C')
    thresholdX = thresholds.get('X')
    thresholdY = thresholds.get('Y')
    thresholdZ = thresholds.get('Z')
    analysisMeasure = data.get('analysisMeasure')  # Получаем выбранную меру
    analysisMeasure1 = data.get('analysisMeasure1')  # Получаем выбранную меру
    analysisMeasure2 = data.get('analysisMeasure2')  # Получаем выбранную меру

    result = analyze_ABC_XYZ(data, thresholdA,thresholdB, thresholdX, thresholdY,  analysisMeasure, analysisMeasure1, analysisMeasure2)
    return jsonify(result)
    
    ###############################################################################



####################################################################

@app.after_request
def remove_header(response):
    response.headers.pop('Date', None)
    return response

# @app.route('/main')
# def main():
#    return render_template('main.html')



#####################РЕГИСТРАЦИЯ И АВТОРИЗАЦИЯ/ПРОФИЛЬ/ВЫХОД##########################
# Проверка пароля при входе
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(user_login=username).first()
        if user and bcrypt.checkpw(password.encode('utf-8'), user.user_password.encode('utf-8')):
            session['user_id'] = user.id_user  # Сохраняем ID пользователя в сессии
            return redirect(url_for('profile'))
        flash('Неверный логин или пароль.')
    return redirect(url_for('dashboard'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Код обработки POST-запроса для регистрации
        role = request.form.get('role')
        surname = request.form.get('surname')
        first_name = request.form.get('name')
        patronymic = request.form.get('patronymic')
        username = request.form.get('username')
        password = request.form.get('password')
        class_full = request.form.get('class')  # Поле для полного значения класса (например, "7A")
        photo = request.files.get('photo')

        # Проверка существующего логина в таблице Users
        existing_user = User.query.filter_by(user_login=username).first()
        if existing_user:
            flash(f'Логин "{username}" уже занят другим пользователем!')
            return redirect(url_for('register'))

        # Проверка для ученика (по ФИО и классу)
        if role == 'student':
            class_number = ''.join(filter(str.isdigit, class_full))  # Извлекаем цифры
            class_letter = ''.join(filter(str.isalpha, class_full))  # Извлекаем буквы

            if class_letter:
                class_letter = class_letter.upper()
            else:
                class_letter = None

            existing_student = Student.query.filter_by(
                surname=surname,
                first_name=first_name,
                patronymic=patronymic,
                class_number=class_number,
                class_letter=class_letter
            ).first()
            if existing_student:
                flash(f'Ученик с таким ФИО и классом "{surname} {first_name} {class_number}{class_letter}" уже существует!')
                return redirect(url_for('register'))

        # Проверка для учителя (по ФИО)
        elif role == 'teacher':
            existing_teacher = Teacher.query.filter_by(
                surname=surname,
                first_name=first_name,
                patronymic=patronymic
            ).first()
            if existing_teacher:
                flash(f'Учитель с таким ФИО "{surname} {first_name}" уже существует!')
                return redirect(url_for('register'))

        # Проверка и обработка фото
        if photo:
            photo_data = photo.read()
        else:
            photo_data = None

        # Хешируем пароль перед сохранением
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Создаем запись пользователя
        user = User(user_login=username, user_password=hashed_password, role=role, photo=photo_data)
        db.session.add(user)
        db.session.commit()

        if role == 'student':
            if photo_data == None:
                flash("Необходимо загрузить фото")
                return redirect(url_for('register'))

            # Разделение поля class на номер и букву
            class_number = ''.join(filter(str.isdigit, class_full))  # Извлекаем цифры
            class_letter = ''.join(filter(str.isalpha, class_full))  # Извлекаем буквы

            student = Student(
                surname=surname,
                first_name=first_name,
                patronymic=patronymic,
                class_number=class_number,
                class_letter=class_letter,
                user_id=user.id_user
            )
            db.session.add(student)
        elif role == 'teacher':
            if photo_data == None:
                with open(os.path.join(app.root_path, 'static', 'profile.png'), "rb") as default_photo:
                    photo_data = default_photo.read()
                    
            # Поля для учителя
            selected_subjects = request.form.getlist('subjects')

            if not selected_subjects:  # Если список пустой
                flash("Необходимо выбрать хотя бы один предмет")
                return redirect(url_for('register'))

            for subject_id in selected_subjects:
                teacher = Teacher(
                    surname=surname,
                    first_name=first_name,
                    patronymic=patronymic,
                    id_subject=subject_id,
                    user_id=user.id_user
                )
                db.session.add(teacher)
        
        db.session.commit()
        flash('Пользователь успешно зарегистрирован!')
        user = User.query.filter_by(user_login=username).first()
        session['user_id'] = user.id_user
        return redirect(url_for('profile'))
    
    # Для GET-запроса, отобразим главную страницу
    return redirect(url_for('dashboard'))



@app.route('/profile', methods=['GET'])
def profile():
    if 'user_id' not in session:
        return redirect(url_for('dashboard'))
    
    user = User.query.filter_by(id_user=session['user_id']).first()
    
    # Определяем, является ли пользователь учителем или учеником и передаем его ФИО
    if user.role == 'teacher':
        teacher = Teacher.query.filter_by(user_id=user.id_user).first()
        return render_template(
            'profile.html',
            user_last_name=teacher.surname,
            user_first_name=teacher.first_name,
            user_middle_name=teacher.patronymic,
            user_role=user.role
        )
    elif user.role == 'student':
        student = Student.query.filter_by(user_id=user.id_user).first()
        return render_template(
            'profile.html',
            user_last_name=student.surname,
            user_first_name=student.first_name,
            user_middle_name=student.patronymic,
            user_role=user.role
        )
    
    return redirect(url_for('dashboard'))  # На случай, если роль не определена


@app.route('/logout')
def logout():
    session.pop('user_id', None)  # Удаляем user_id из сессии
    flash('Вы вышли из системы.')
    return redirect(url_for('dashboard'))  # Перенаправляем на главную страницу

@app.route('/get_user_photo', methods=['GET'])
def get_user_photo():
    if 'user_id' not in session:
        return jsonify({'user_photo': None})
    
    user = User.query.filter_by(id_user=session['user_id']).first()
    
    if user and user.photo:
        # Преобразуем фото в Base64 строку
        photo_base64 = base64.b64encode(user.photo).decode('utf-8')
        return jsonify({'user_photo': photo_base64})
    else:
        return jsonify({'user_photo': None})


#################РАСПОЗНАВАНИЕ ФОТО####################################################

@app.route('/analyze_photos', methods=['POST'])
def analyze_photos():
    # Проверка авторизации
    if 'user_id' not in session:
        return jsonify({'error': 'Пользователь не авторизован'}), 401

    user_id = session['user_id']
    teacher = (
        db.session.query(Teacher)
        .join(User, Teacher.user_id == User.id_user)
        .filter(User.id_user == user_id)
        .first()
    )

    if not teacher:
        return jsonify({'error': 'Учитель не найден'}), 404

    teacher_id = teacher.id_teacher

    # Получение данных из запроса
    subject = request.form.get('subject')
    class_name = request.form.get('class_name')
    dates = request.form.get('dates')
    photos = request.files.getlist('photos')

    if not subject or not class_name or not dates or not photos:
        return jsonify({'error': 'Не все данные были переданы. Проверьте форму.'}), 400

    # Преобразуем даты обратно из JSON
    try:
        # Преобразуем строку в Python объект (список строк)
        nonFormattedDates = json.loads(dates)

        # Преобразуем даты в нужный формат
        dates = []

        for date_str in nonFormattedDates:
            # Разделяем строку по ': ', чтобы извлечь только дату
            index, date = date_str.split(": ")
            
            # Преобразуем дату в формат "%Y-%m-%d"
            date_obj = datetime.strptime(date, "%d-%m-%Y")  # Исходный формат
            formatted_date = date_obj.strftime("%Y-%m-%d")  # Новый формат "%Y-%m-%d"
            
            # Формируем строку в формате "index: YYYY-MM-DD"
            dates.append(f"{index}: {formatted_date}")
    except Exception:
        return jsonify({'error': 'Неверный формат данных для дат.'}), 400

    # Проверка количества фото и дат
    if len(dates) != len(photos):
        return jsonify({'error': 'Количество фотографий и дат не совпадает.'}), 400

    # Получение известных лиц
    known_faces, student_ids = get_known_faces_and_ids()

    i = 0
    for photo_path in photos:
        recognized_students = process_class_photo(photo_path, known_faces, student_ids)

        date_str = dates[i].split(": ")[-1]  # Извлекаем часть после ": "
        date = datetime.strptime(date_str, '%Y-%m-%d')
        record_attendance(class_name, subject, teacher_id, date, recognized_students)

        i+=1

    # Генерация таблицы
    table = generate_attendance_table(class_name, teacher_id, dates)

    return jsonify(table)


def generate_attendance_table(class_name, teacher_id, dates):
    """
    Формирует таблицу посещаемости для заданного класса, учителя и списка дат.
    """
    # Извлекаем номер класса и букву
    class_number, class_letter = class_name.split()

    # Получаем список учеников
    students = Student.query.filter_by(class_number=class_number, class_letter=class_letter).all()

    # Словарь для преобразования родительного падежа в именительный
    MONTHS_NOMINATIVE = {
        "января": "Январь",
        "февраля": "Февраль",
        "марта": "Март",
        "апреля": "Апрель",
        "мая": "Май",
        "июня": "Июнь",
        "июля": "Июль",
        "августа": "Август",
        "сентября": "Сентябрь",
        "октября": "Октябрь",
        "ноября": "Ноябрь",
        "декабря": "Декабрь"
    }

    # Получаем даты в формате {месяц: [даты]}
    date_months = {}
    for date_str in dates:
        date = datetime.strptime(date_str.split(": ")[-1], '%Y-%m-%d')
        month_name = date.strftime('%B')  # Название месяца в родительном падеже
        if month_name not in date_months:
            date_months[month_name] = []
        date_months[month_name].append(date.day)

    # Формируем заголовки таблицы
    columns = ["№", "Ученики"]
    header_row = ["", ""]
    
    for month, days in date_months.items():
        columns.append(MONTHS_NOMINATIVE.get(month, month.capitalize()))  # Преобразуем в именительный падеж  # Столбец с названием месяца
        columns.extend([""] * (len(days) - 1))  # Пустые колонки для остальных дней
        header_row.extend(days)  # Числа дней для заголовков


    columns.append("Итог за период")  # Итоговый столбец
    header_row.append("")  # Пустая колонка-разделитель

    # Получаем записи посещаемости
    attendance_records = Attendance.query.filter(
        Attendance.id_teacher == teacher_id,
        Attendance.date.in_([datetime.strptime(date.split(": ")[-1], '%Y-%m-%d') for date in dates])
    ).all()

    # Карта посещаемости: (id_student, date) -> present
    attendance_map = {
        (record.id_student, record.date): record.present for record in attendance_records
    }
    

    # Формируем строки для каждого ученика
    data = [header_row]
    for i, student in enumerate(students, start=1):
        student_row = [i, f"{student.surname} {student.first_name}"]
        total_absent = 0

        for month, days in date_months.items():
            for day in days:
                # Формируем дату для поиска
                date = datetime.strptime(f"{day:02d} {month} {datetime.now().year}", "%d %B %Y").date()
                present_status = attendance_map.get((student.id_student, date), "")
                student_row.append(present_status)

                # Считаем пропуски
                if present_status in ("ОТ", "Б"):
                    total_absent += 1

        # Итоговая колонка с общим количеством пропусков
        student_row.append(total_absent)
        data.append(student_row)

    return {"columns": columns, "data": data}




def record_attendance(class_name, subject, teacher_id, date, recognized_students):
    """
    Записывает посещаемость учеников.
    """
    # Извлекаем номер класса и букву
    class_number, class_letter = class_name.split()

    students = Student.query.filter_by(class_number=class_number, class_letter=class_letter).all()
    all_student_ids = [student.id_student for student in students]

    # Определяем отсутствующих
    absent_students = set(all_student_ids) - set(recognized_students)

    # Добавляем записи о посещаемости
    for student_id in absent_students:
        attendance = Attendance(
            id_student=student_id,
            id_teacher=teacher_id,
            present='ОТ',  # Отсутствует
            date=date
        )
        db.session.add(attendance)
    db.session.commit()




#################НЕЛЬЗЯ#ИЗМЕНЯТЬ#######################################################



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

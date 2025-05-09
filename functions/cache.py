import face_recognition
from flask import current_app
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from io import BytesIO
from functions.models import db, Student, User
import cv2
import base64
import logging
import locale
from concurrent.futures import ThreadPoolExecutor
import os
from functions.socketio_helpers import socketio

locale.setlocale(locale.LC_TIME, 'ru_RU.UTF-8')

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Настройка обработчика (например, вывод в консоль)
console_handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

def convert_image_to_rgb(photo_bytes):
    """
    Конвертирует изображение из байтов в формат RGB и массив numpy.
    """
    try:
        # Загружаем изображение из байтов
        img = Image.open(BytesIO(photo_bytes))

        # Логируем базовую информацию об изображении
        logger.info(f"Формат изображения: {img.format}, размер: {img.size}, режим: {img.mode}")

        # Приводим изображение к RGB, если оно не в нужном формате
        if img.mode != 'RGB':
            logger.info(f"Конвертация изображения из {img.mode} в RGB")
            img = img.convert('RGB')

        # Преобразуем изображение в numpy-массив
        img_array = np.array(img)

        # Проверяем тип данных массива
        if img_array.dtype != 'uint8':
            raise ValueError(f"Тип данных изображения некорректен: {img_array.dtype}. Требуется uint8.")

        return img_array

    except Exception as e:
        logger.error(f"Ошибка обработки изображения: {e}", exc_info=True)
        return None

def get_known_faces_and_ids(class_num, class_let):
    """
    Получает эмбеддинги лиц учеников и их идентификаторы.
    """
    with current_app.app_context():  # Обеспечиваем контекст приложения в потоке
        students = Student.query.filter_by(
            class_number=class_num,
            class_letter=class_let
        ).all()

        known_face_encodings = []
        student_ids = []

        for student in students:
            user = User.query.filter_by(id_user=student.user_id).first()
            if user and user.photo and user.photo_embeddings:
                try:
                    # Преобразование JSON в массив NumPy
                    encoding = np.array(user.photo_embeddings)
                    known_face_encodings.append(encoding)
                    student_ids.append(student.id_student)
                except Exception as e:
                    # Логируем ошибку, если JSON некорректен
                    logger.error(f"Ошибка преобразования эмбеддинга для пользователя {user.id_user}: {e}", exc_info=True)

        return known_face_encodings, student_ids


def get_student_info_by_user_id(student_id):
    """
    Получает информацию о студенте (id_student и ФИО) по ID пользователя (id_user).
    """
    with current_app.app_context():  # Обеспечиваем контекст приложения в потоке
        student = Student.query.filter_by(id_student=student_id).first()
        if student:
            full_name = f"{student.surname} {student.first_name} {student.patronymic or ''}".strip()
            full_name = full_name.encode('utf-8').decode('utf-8')
            return student.id_student, full_name
        logger.warning(f"Student not found for user_id: {student_id}")
        return None, "Unknown Student"


def process_face(known_face_encodings, unknown_encoding, tolerance=0.6):
    # Используем расстояния вместо индекса первого совпадения
    distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
    min_distance_index = np.argmin(distances)
    if distances[min_distance_index] <= tolerance:
        return min_distance_index
    return None

def process_face_in_parallel(face_data, app):
    """Обрабатывает одно лицо: сопоставляет его с известными и рисует рамку."""
    (top, right, bottom, left), unknown_encoding, known_face_encodings, user_ids, font = face_data
    
    result = {
        'bounding_box': (top, right, bottom, left),
        'label': "Неизвестный",
        'color': "red",
        'student_id': None
    }

    try:
        # Обеспечиваем контекст приложения в потоке
        with app.app_context():
            match_index = process_face(known_face_encodings, unknown_encoding)
            logger.info(f"Индекс совпадения: {match_index}")
            if match_index is not None:
                user_id = user_ids[match_index]
                logger.info(f"Идентификатор пользователя: {user_id}")
                
                student_id, full_name = get_student_info_by_user_id(user_id)
                logger.info(f"student_id, full_name: {student_id}, имя: {full_name}")
                
                if student_id:
                    result['student_id'] = student_id

                result['label'] = full_name
                result['color'] = "green"

    except Exception as e:
        logger.error(f"Ошибка обработки лица: {e}")
    
    return result

def process_class_photo(photo_file, known_face_encodings, user_ids, app):
    """
    Обрабатывает фото с урока, возвращая список распознанных учеников.
    """
    recognized_students = []
    try:
        with app.app_context():  # Устанавливаем контекст приложения
            img_bytes = photo_file.read()  # Считываем все байты файла в память
            photo_file = BytesIO(img_bytes)  # Создаем новый объект BytesIO для работы с изображением
            img = Image.open(photo_file).convert('RGB')  # Теперь работаем с этим объектом, и он не закроется
            img_array = np.array(img)

            face_locations = face_recognition.face_locations(img_array)
            unknown_face_encodings = face_recognition.face_encodings(img_array)

            if not face_locations:
                # Конвертируем изображение обратно в массив NumPy для отправки
                img_array = np.array(img)
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)        

                # Конвертируем изображение обратно для показа
                _, buffer = cv2.imencode('.jpg', img_array)
                encoded_image = base64.b64encode(buffer).decode('utf-8')

                socketio.emit('photo_preview', {'image': encoded_image})
                logger.warning("Лица на фотографии не обнаружены.")
                return recognized_students

            # Загрузим шрифт, который поддерживает кириллицу
            try:
                font = ImageFont.truetype("/app/fonts/ArialRegular.ttf", 20)  # Убедитесь, что шрифт поддерживает кириллицу
            except IOError:
                font = ImageFont.load_default()

            # Создаем объект для рисования на изображении
            draw = ImageDraw.Draw(img)
            
            # Подготовка данных для параллельной обработки
            face_data_list = [
                ((top, right, bottom, left), unknown_encoding, known_face_encodings, user_ids, font)
                for (top, right, bottom, left), unknown_encoding in zip(face_locations, unknown_face_encodings)
            ]

            # Определяем число доступных CPU
            num_cpus = os.cpu_count()  # Или задайте вручную, например, num_cpus = 8
            logger.info(f"Число доступных потоков: {num_cpus}")
            # Параллельная обработка лиц
            with ThreadPoolExecutor(max_workers=num_cpus * 2) as executor:
                # Используем лямбда-функцию для передачи как face_data, так и app
                results = list(executor.map(lambda face_data: process_face_in_parallel(face_data, app), face_data_list))
            
            # Отрисовка результатов
            for result in results:
                top, right, bottom, left = result['bounding_box']
                draw.rectangle([left, top, right, bottom], outline=result['color'], width=2)
                text_position = (left, top - 30)
                draw.text(text_position, result['label'], font=font, fill=result['color'])

                if result['student_id']:
                    recognized_students.append(result['student_id'])

            # Конвертируем изображение обратно в массив NumPy для отправки
            img_array = np.array(img)
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)        

            # Конвертируем изображение обратно для показа
            _, buffer = cv2.imencode('.jpg', img_array)
            encoded_image = base64.b64encode(buffer).decode('utf-8')

            socketio.emit('photo_preview', {'image': encoded_image})

    except Exception as e:
        logger.error(f"Ошибка обработки фотографии класса: {e}")

    return recognized_students


# Опциональные функции

def check_photo_once(photo_bytes):
    '''Проверка наличия лица на фото'''
    img_array = convert_image_to_rgb(photo_bytes)

    if img_array is None:
        return False, None
    
    face_encodings = face_recognition.face_encodings(img_array)
    if not face_encodings:
        return False, None

    return True, face_encodings


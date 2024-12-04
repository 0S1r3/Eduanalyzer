import face_recognition
from PIL import Image
import numpy as np
from io import BytesIO
from functions.models import db, Student, User
import logging

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

def get_known_faces_and_ids():
    """
    Получает эмбеддинги лиц учеников и их идентификаторы.
    """
    students = Student.query.all()
    known_face_encodings = []
    student_ids = []

    for student in students:
        user = User.query.filter_by(id_user=student.user_id).first()
        if user and user.photo:
            img_array = convert_image_to_rgb(user.photo)
            if img_array is None:
                logger.warning(f"Изображение пользователя {user.id_user} не обработано.")
                continue  # Пропускаем, если изображение не удалось обработать

            try:
                # Генерация эмбеддингов лица
                encodings = face_recognition.face_encodings(img_array)
                if encodings:
                    known_face_encodings.append(encodings[0])
                    student_ids.append(student.id_student)
                else:
                    logger.warning(f"Лицо не обнаружено на фото пользователя {user.id_user}")
            except Exception as e:
                logger.error(f"Ошибка при обработке фото пользователя {user.id_user}: {e}", exc_info=True)

    return known_face_encodings, student_ids




def process_class_photo(photo_file, known_face_encodings, student_ids):
    """
    Обрабатывает фото с урока, возвращая список распознанных учеников.
    """
    recognized_students = []
    try:
        img = Image.open(photo_file)
        img = img.convert('RGB')  # Приведение изображения к формату RGB
        img_array = np.array(img)

        unknown_face_encodings = face_recognition.face_encodings(img_array)
        for unknown_encoding in unknown_face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, unknown_encoding)
            if True in matches:
                index = matches.index(True)
                recognized_students.append(student_ids[index])
    except Exception as e:
        logger.error(f"Ошибка обработки фотографии класса: {e}")

    return recognized_students

# Опциональные функции

def check_photo_once(photo_bytes):
    '''Проверка наличия лица на фото'''
    img_array = convert_image_to_rgb(photo_bytes)

    if img_array is None:
        return False
    
    face_encodings = face_recognition.face_encodings(img_array)
    if not face_encodings:
        return False
    
    return True

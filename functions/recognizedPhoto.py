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
    
def check_image_sharpness(img_array, threshold=50):
    try:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return laplacian_var < threshold
    except Exception as e:
        logger.error(f"Ошибка проверки резкости: {e}")
        return True


def check_color_balance(img_array, threshold=0.3):
    try:
        mean_colors = img_array.mean(axis=(0, 1)) / 255.0
        diff_rb = abs(mean_colors[0] - mean_colors[2])
        diff_rg = abs(mean_colors[0] - mean_colors[1])
        return diff_rb > threshold or diff_rg > threshold
    except Exception as e:
        logger.error(f"Ошибка проверки цветового баланса: {e}")
        return True


def check_lighting(img_array, min_brightness=30, max_brightness=220):
    try:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        mean_brightness = np.mean(gray)
        return mean_brightness < min_brightness or mean_brightness > max_brightness
    except Exception as e:
        logger.error(f"Ошибка проверки освещенности: {e}")
        return True


def analyze_frequency_components(img_array, high_freq_ratio_limit=0.35, offset=0.15):
    """
    Анализ частотных компонентов изображения с использованием адаптивного порога.
    
    :param img_array: Входное изображение в формате NumPy массива.
    :param high_freq_ratio_limit: Лимит доли высокочастотных компонентов.
    :param offset: Сдвиг для увеличения адаптивного порога.
    :return: True, если изображение подозрительное, иначе False.
    """
    try:
        # Конвертируем изображение в градации серого
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Преобразование Фурье
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude_spectrum = np.log(np.abs(f_shift) + 1)
        magnitude_spectrum_normalized = magnitude_spectrum / np.max(magnitude_spectrum)
        
        # Вычисляем адаптивный порог
        mean_value = np.mean(magnitude_spectrum_normalized)
        std_dev = np.std(magnitude_spectrum_normalized)
        adaptive_threshold = mean_value + offset * std_dev
        
        # Рассчитываем долю высокочастотных компонентов
        high_freq_ratio = np.sum(magnitude_spectrum_normalized > adaptive_threshold) / magnitude_spectrum_normalized.size

        # Логируем значения для диагностики
        logger.info(f"High frequency ratio: {high_freq_ratio}, Adaptive threshold: {adaptive_threshold}, Mean: {mean_value}, Std Dev: {std_dev}")
        
        # Сравниваем с лимитом
        return high_freq_ratio > high_freq_ratio_limit
    except Exception as e:
        logger.error(f"Ошибка анализа частотных компонентов: {e}", exc_info=True)
        return True



def check_shadows(face_locations, img_array, base_threshold=10, dynamic_factor=0.5):
    """
    Проверяет наличие подозрительных теней на лице.
    
    :param face_locations: Список координат лиц (top, right, bottom, left).
    :param img_array: Массив изображения.
    :param base_threshold: Базовый порог для определения наличия теней.
    :param dynamic_factor: Множитель для адаптивного порога.
    :return: True, если обнаружены подозрительные тени, иначе False.
    """
    try:
        shadow_detected = False

        # Рассчитываем среднюю яркость всего изображения
        gray_image = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        global_brightness = np.mean(gray_image)
        logger.info(f"Средняя яркость изображения: {global_brightness}")

        # Устанавливаем адаптивный порог
        shadow_gradient = base_threshold + dynamic_factor * global_brightness
        logger.info(f"Адаптивный порог для градиента теней: {shadow_gradient}")

        for (top, right, bottom, left) in face_locations:
            face_region = img_array[top:bottom, left:right]
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)

            # Рассчитываем градиенты
            gradient_x = cv2.Sobel(gray_face, cv2.CV_64F, 1, 0, ksize=5)
            gradient_y = cv2.Sobel(gray_face, cv2.CV_64F, 0, 1, ksize=5)
            magnitude = np.sqrt(gradient_x**2 + gradient_y**2)

            # Рассчитываем текстурность лица (вариацию яркости)
            brightness_variation = np.std(gray_face)
            logger.info(f"Вариация яркости для области лица: {brightness_variation}")

            # Проверка условий теней
            if np.mean(magnitude) < shadow_gradient and brightness_variation < 15:
                shadow_detected = True
                logger.warning(f"Подозрение на тени в области лица: {top, right, bottom, left}")
                break  # Достаточно одного срабатывания для возврата True

        return shadow_detected

    except Exception as e:
        logger.error(f"Ошибка проверки теней: {e}")
        return True

    
def determine_quality_level(img_array):
    """
    Определяет уровень качества изображения на основе его разрешения.
    """
    height, width = img_array.shape[:2]
    if width >= 1920 and height >= 1080:
        return "high"
    elif width >= 1280 and height >= 720:
        return "medium"
    else:
        return "low"

def get_adaptive_thresholds(quality_level):
    """
    Возвращает пороги на основе уровня качества изображения.
    """
    thresholds = {
        "high": {
            "sharpness": 100,
            "color_balance": 0.2,
            "lighting": (60, 180),
            "frequency": 0.1,
            "shadow_gradient": 15
        },
        "medium": {
            "sharpness": 75,
            "color_balance": 0.25,
            "lighting": (50, 200),
            "frequency": 0.3,
            "shadow_gradient": 12
        },
        "low": {
            "sharpness": 60,
            "color_balance": 0.3,
            "lighting": (40, 220),
            "frequency": 0.48,
            "shadow_gradient": 10
        }
    }
    return thresholds.get(quality_level, thresholds["low"])

def check_face_spoofing(face_locations, face_img, img_array):
    '''
    Функция проверки лиц на спуфинг
    '''
    quality_level = determine_quality_level(img_array)
    logger.warning(f"{quality_level}")
    thresholds = get_adaptive_thresholds(quality_level)

    if check_image_sharpness(face_img, thresholds["sharpness"]):
        logger.warning("Низкая резкость для лица.")
        return True

    if check_color_balance(face_img, thresholds["color_balance"]):
        logger.warning("Неправильный цветовой баланс для лица.")
        return True

    if check_lighting(face_img, *thresholds["lighting"]):
        logger.warning("Плохое освещение для лица.")
        return True

    if analyze_frequency_components(face_img, thresholds["frequency"]):
        logger.warning("Частотные компоненты для лица подозрительны.")
        return True
    
    if check_shadows([face_locations], img_array, thresholds["shadow_gradient"]):
        logger.warning("Наложение теней подозрительно.")
        return True

    return False


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


# def process_face(known_face_encodings, unknown_encoding, tolerance=0.45):
#     # Используем расстояния вместо индекса первого совпадения
#     distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
#     min_distance_index = np.argmin(distances)
#     if distances[min_distance_index] <= tolerance:
#         return min_distance_index
#     return None

def process_face(known_face_encodings, unknown_encoding, initial_tolerance=0.6, step=0.001, min_tolerance=0.1):
    """
    Cопоставления лиц с итеративным уменьшением порога.

    :param known_face_encodings: список кодировок известных лиц
    :param unknown_encoding: кодировка неизвестного лица
    :param initial_tolerance: начальный порог для совпадения
    :param step: шаг уменьшения порога
    :param min_tolerance: минимально допустимый порог
    :return: индекс ближайшего лица или None, если совпадений нет
    """
    tolerance = initial_tolerance

    while tolerance >= min_tolerance:
        # Вычисляем расстояния
        distances = face_recognition.face_distance(known_face_encodings, unknown_encoding)
        
        # Находим все совпадения при текущем пороге
        matches = np.where(distances <= tolerance)[0]
        
        if len(matches) == 1:
            # Если совпадение только одно, возвращаем его индекс
            return matches[0]
        elif len(matches) == 0:
            # Если совпадений нет, выходим из цикла
            break
        
        # Уменьшаем порог
        tolerance -= step

    # Если несколько совпадений остаются даже при минимальном пороге,
    # возвращаем индекс самого ближайшего лица
    if len(matches) > 0:
        closest_match_index = matches[np.argmin(distances[matches])]
        return closest_match_index
    
    # Если совпадений нет вообще, возвращаем None
    return None

def process_face_in_parallel(face_data, app):
    """Обрабатывает одно лицо: сопоставляет его с известными и рисует рамку."""
    (top, right, bottom, left), unknown_encoding, known_face_encodings, user_ids, font, img_array = face_data
    
    result = {
        'bounding_box': (top, right, bottom, left),
        'label': "Неизвестный",
        'color': "red",
        'student_id': None
    }

    try:
        # Обеспечиваем контекст приложения в потоке
        with app.app_context():
            face_img = img_array[top:bottom, left:right]

            if check_face_spoofing((top, right, bottom, left), face_img, img_array):
                result['label'] = 'Подделка'
                return result
            
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
                ((top, right, bottom, left), unknown_encoding, known_face_encodings, user_ids, font, img_array)
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

# def check_photo_once(photo_bytes):
#     '''Проверка наличия лица на фото'''
#     img_array = convert_image_to_rgb(photo_bytes)

#     if img_array is None:
#         return False, None
    
#     face_encodings = face_recognition.face_encodings(img_array)
#     if not face_encodings:
#         return False, None

#     return True, face_encodings

def check_photo_once(photo_bytes):
    '''Проверка наличия лица на фото'''
    img_array = convert_image_to_rgb(photo_bytes)

    if img_array is None:
        return False, None
    
    face_encodings = face_recognition.face_encodings(img_array)
    if not face_encodings:
        return False, None

    return True, face_encodings

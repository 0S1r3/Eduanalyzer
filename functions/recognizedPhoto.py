import face_recognition
from PIL import Image
import numpy as np
from functions.models import db, Student, User

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
            # Загружаем фото ученика из бинарных данных
            img_array = face_recognition.load_image_file(user.photo)
            encoding = face_recognition.face_encodings(img_array)
            if encoding:
                known_face_encodings.append(encoding[0])
                student_ids.append(student.id_student)
    return known_face_encodings, student_ids


def process_class_photo(photo_path, known_face_encodings, student_ids):
    """
    Обрабатывает фото с урока, возвращая список распознанных учеников.
    """
    unknown_image = face_recognition.load_image_file(photo_path)
    unknown_face_encodings = face_recognition.face_encodings(unknown_image)

    recognized_students = []
    for unknown_encoding in unknown_face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, unknown_encoding)
        if True in matches:
            index = matches.index(True)
            recognized_students.append(student_ids[index])
    return recognized_students

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError

db = SQLAlchemy()

################################ Таблицы БД ################################
class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'school'}
    id_user = db.Column(db.Integer, primary_key=True)
    user_login = db.Column(db.String(50), unique=True, nullable=False)
    user_password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False)
    photo = db.Column(db.LargeBinary, nullable=True)

class Student(db.Model):
    __tablename__ = 'students'
    __table_args__ = {'schema': 'school'}
    id_student = db.Column(db.Integer, primary_key=True)
    surname = db.Column(db.String(50), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    patronymic = db.Column(db.String(50))
    class_number = db.Column(db.Integer, nullable=False)
    class_letter = db.Column(db.String(1), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('school.users.id_user'), unique=True, nullable=False)

    user = db.relationship('User', backref=db.backref('student', lazy=True))

class Subject(db.Model):
    __tablename__ = 'subjects'
    __table_args__ = {'schema': 'school'}
    id_subject = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id_subject': self.id_subject,
            'name': self.name
        }

class Teacher(db.Model):
    __tablename__ = 'teachers'
    __table_args__ = {'schema': 'school'}
    id_teacher = db.Column(db.Integer, primary_key=True)
    surname = db.Column(db.String(50), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    patronymic = db.Column(db.String(50))
    id_subject = db.Column(db.Integer, db.ForeignKey('school.subjects.id_subject'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('school.users.id_user'), unique=True, nullable=False)

    user = db.relationship('User', backref=db.backref('teacher', lazy=True))

    def to_dict(self):
        return {
            'id_teacher': self.id_teacher,
            'full_name': self.surname + ' ' + self.first_name + ' ' + self.patronymic
        }

class Period(db.Model):
    __tablename__ = 'periods'
    __table_args__ = {'schema': 'school'}
    id_period = db.Column(db.Integer, primary_key=True)
    period = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            'id_period': self.id_period,
            'period': self.period
        }

class Attendance(db.Model):
    __tablename__ = 'attendance'
    __table_args__ = {'schema': 'school'}
    id_attendance = db.Column(db.Integer, primary_key=True)
    id_student = db.Column(db.Integer, db.ForeignKey('school.students.id_student'), nullable=False)
    id_teacher = db.Column(db.Integer, db.ForeignKey('school.teachers.id_teacher'), nullable=False)
    present = db.Column(db.String(2), nullable=True)
    final_attendance = db.Column(db.Integer, nullable=True)
    id_period = db.Column(db.Integer, db.ForeignKey('school.periods.id_period'), nullable=True)
    count_grades=db.Column(db.Integer, default=1, nullable=False)
    date = db.Column(db.Date, nullable=False)

    student = db.relationship('Student', backref=db.backref('attendances', lazy=True))
    teacher = db.relationship('Teacher', backref=db.backref('attendances', lazy=True))
    period = db.relationship('Period', backref=db.backref('attendances', lazy=True))

class Performance(db.Model):
    __tablename__ = 'performance'
    __table_args__ = {'schema': 'school'}
    id_performance = db.Column(db.Integer, primary_key=True)
    id_student = db.Column(db.Integer, db.ForeignKey('school.students.id_student'), nullable=False)
    id_teacher = db.Column(db.Integer, db.ForeignKey('school.teachers.id_teacher'), nullable=False)
    grade = db.Column(db.Integer, nullable=False)
    id_period = db.Column(db.Integer, db.ForeignKey('school.periods.id_period'), nullable=True)
    count_grades=db.Column(db.Integer, default=1, nullable=False)
    date = db.Column(db.Date, nullable=False)

    student = db.relationship('Student', backref=db.backref('performances', lazy=True))
    teacher = db.relationship('Teacher', backref=db.backref('performances', lazy=True))
    period = db.relationship('Period', backref=db.backref('performances', lazy=True))

###############################################################################################
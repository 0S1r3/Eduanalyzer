# Используем базовый образ с Python
FROM python:3.10-slim-bookworm

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Устанавливаем системные библиотеки и генерируем локаль
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3-dev \            
      libglib2.0-0 \
      libgtk-3-dev \      
      locales \
  && echo "ru_RU.UTF-8 UTF-8" >> /etc/locale.gen \
  && locale-gen \
  && echo "LANG=ru_RU.UTF-8" > /etc/default/locale \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Устанавливаем переменные окружения для локали
ENV LANG=ru_RU.UTF-8 \
    LANGUAGE=ru_RU:ru \
    LC_ALL=ru_RU.UTF-8

# Копируем зависимости
COPY requirements.txt .

# # Устанавливаем Python-зависимости
# RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

RUN pip install --upgrade pip && \
    pip install --no-cache-dir --no-deps face_recognition==1.3.0 && \
    pip install --no-cache-dir -r requirements.txt

# Копируем зависимости для моделей
COPY requirements_models.txt .

# Устанавливаем остальное
RUN pip install --upgrade pip \
 && pip install --no-cache-dir --timeout 120 --retries 5 face_recognition_models==0.3.0 \
 && pip install --no-cache-dir -r requirements_models.txt

# Копируем файлы проекта
COPY . .

# Указываем команду для запуска приложения
CMD ["python", "app.py"]

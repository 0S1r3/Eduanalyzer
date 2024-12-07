# Используем базовый образ с Python
FROM python:3.10-bookworm

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Устанавливаем системные библиотеки и генерируем локаль
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    locales \
    && echo "ru_RU.UTF-8 UTF-8" >> /etc/locale.gen \
    && locale-gen \
    && echo "LANG=ru_RU.UTF-8" > /etc/default/locale \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем переменные окружения для локали
ENV LANG=ru_RU.UTF-8 \
    LANGUAGE=ru_RU:ru \
    LC_ALL=ru_RU.UTF-8

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем Python-зависимости
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Копируем файлы проекта
COPY . .

# Указываем команду для запуска приложения
CMD ["python", "app.py"]

# FPV Frequency Map - Elite Edition

Карта для FPV-пилотов с полными частотными сетками (аналоговые и цифровые) и детектором конфликтов между пилотами.

## Что нового

✅ **14 аналоговых сеток**: A, B, E, F, Raceband, LowRace, U, O, Lowband, H, X, J, K, Z  
✅ **13 цифровых систем**: DJI V1/O3/O4, Walksnail, HDZero (все режимы и пропускные способности)  
✅ **Детектор конфликтов**: Маркеры с расстояниями <40 МГц подсвечиваются красным  
✅ **Умный выбор частоты**: Band → Channel → Frequency (автоматически)  
✅ **Безопасность**: Пароли хешируются bcrypt, эндпоинты с проверкой  

---

## 🚀 Быстрый запуск (2 терминала)

### Терминал 1: Фронтенд (Vite + React + Leaflet)

```bash
# Установить зависимости (если ещё не установлены)
pnpm install

# Запустить dev-сервер
pnpm dev
```

Откроется на **http://localhost:5173** (или похожий порт)

### Терминал 2: Бэкенд (FastAPI + MongoDB)

```bash
# 1. Установить Python-зависимости
pip install -r requirements.txt

# 2. Убедиться, что MongoDB запущена
#    На локальной машине обычно:
#    mongod  (или в Docker: docker run -d -p 27017:27017 mongo)

# 3. Запустить FastAPI сервер
python main.py
```

API стартует на **http://localhost:8000**

Swagger UI: **http://localhost:8000/docs**

---

## 📡 Структура проекта

```
/vercel/share/v0-project/
├── src/
│   ├── App.jsx                    # Основное приложение (Leaflet карта)
│   ├── data/
│   │   └── frequencies.js         # Все частотные сетки + детектор конфликтов
│   ├── components/
│   │   ├── FrequencySelector.jsx  # Умный выбор Band/Channel/Frequency
│   │   ├── DroneCard.jsx          # Карточка дрона на маркере
│   │   └── ConflictAlert.jsx      # Предупреждение о конфликтах
│   ├── index.css                  # Стили (Leaflet + компоненты)
│   └── main.jsx                   # Точка входа React
├── main.py                        # FastAPI бэкенд
├── requirements.txt               # Python зависимости
├── vite.config.js                 # Vite конфиг
└── package.json                   # Node зависимости
```

---

## 🔧 Использование

### Добавить дрона на карту

1. **Заполнить форму**:
   - Имя пилота
   - Выбрать Analog или Digital
   - Выбрать Band/систему (A, B, DJI O3, и т.д.)
   - Выбрать Channel (только доступные)
   - Размер дрона (граммы)

2. **Частота подставляется автоматически** из таблицы

3. **Поставить маркер** на карту (клик по кнопке на форме)

### Проверка конфликтов

- **Красные маркеры** = конфликт (<40 МГц друг от друга)
- **Иконка Settings** получает **красный счётчик**, если есть конфликты
- **Клик на маркер** → информация о пилоте и список конфликтующих

---

## 🔐 API Эндпоинты

### Пилоты

```
GET    /api/pilots                 # Список всех пилотов
POST   /api/pilots                 # Создать пилота (логин, пароль)
GET    /api/pilots/{id}            # Профиль пилота
PUT    /api/pilots/{id}            # Обновить профиль
DELETE /api/pilots/{id}            # Удалить пилота
```

### Дроны пилота

```
GET    /api/pilots/{id}/drones     # Список дронов пилота
POST   /api/pilots/{id}/drones     # Добавить дрон
PUT    /api/pilots/{id}/drones/{id} # Обновить дрон
DELETE /api/pilots/{id}/drones/{id} # Удалить дрон
```

### Аутентификация

```
POST   /api/auth/login              # Логин (username, password)
POST   /api/auth/logout             # Логаут
```

---

## 📊 Структура данных (MongoDB)

### DroneProfile

```json
{
  "id": "uuid",
  "username": "Иван",
  "latitude": 55.751244,
  "longitude": 37.618423,
  "drones": [
    {
      "name": "Fpv Quad 5\"",
      "band": "E",           // или "DJI_O3", "Walksnail_Race", и т.д.
      "channel": 1,          // 1-8 для аналога, 1-16 для цифры
      "frequency": 5705,     // МГц (подставляется автоматически)
      "weight_g": 250
    }
  ],
  "password_hash": "bcrypt_hash",
  "created_at": "2024-07-03T16:00:00"
}
```

---

## 🐛 Отладка

### Если фронтенд не видит API

- Проверить, что FastAPI запущен на **http://localhost:8000**
- Проверить CORS в `main.py` (должен быть `origins=["*"]`)
- В консоли браузера (F12) посмотреть ошибки сети

### Если MongoDB не подключается

```bash
# Проверить, что MongoDB слушает на localhost:27017
mongosh  # или mongo

# Или через Docker:
docker ps | grep mongo
docker logs <container_id>
```

### Если нужны тестовые данные

В `main.py` есть эндпоинт `GET /api/test-data`, он создаёт несколько тестовых пилотов с дронами и конфликтующими частотами.

---

## 📝 Лицензия

MIT — используй свободно!

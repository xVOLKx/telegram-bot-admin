# <img src="images/bot.svg" width="32"> Telegram-бот с ИИ и админ-панелью

Telegram-бот с искусственным интеллектом (Yandex GPT), админ-панелью, системой заявок, статистикой и рассылкой.

[![Node.js](https://img.shields.io/badge/Node.js-18-green)](#)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.x-blue)](#)
[![Yandex GPT](https://img.shields.io/badge/Yandex%20GPT-API-blueviolet)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

## <img src="images/link.svg" width="24"> Живой пример

_Скоро здесь будет ссылка на работающего бота_

## <img src="images/features.svg" width="24"> Функции

- <img src="images/chat.svg" width="20"> Приём заявок через команду /order
- <img src="images/ai.svg" width="20"> ИИ-ответы на заявки (Yandex GPT)
- <img src="images/contacts.svg" width="20"> Админ-панель с кнопками и командами
- <img src="images/contacts.svg" width="20"> Список заявок с кнопками для просмотра
- <img src="images/database.svg" width="20"> Статистика (количество заявок и пользователей)
- <img src="images/contacts.svg" width="20"> Рассылка всем пользователям (`/broadcast`)
- <img src="images/shield.svg" width="20"> Защита от спама, коротких сообщений и мата
- <img src="images/contacts.svg" width="20"> Уведомления админу о новых заявках
- <img src="images/contacts.svg" width="20"> Подсказки для пользователей

## <img src="images/install.svg" width="24"> Как запустить локально

1. Клонируй репозиторий:
   ```bash
   git clone https://github.com/xVOLKx/telegram-bot-admin.git
   cd telegram-bot-admin
   ```
2. Установи зависимости:
    ```bash
    npm install
    ```
3. Создай файл .env и добавь:
    ```bash
    BOT_TOKEN=твой_токен
    YANDEX_API_KEY=твой_ключ
    YANDEX_FOLDER_ID=твой_folder_id
    ```
4. Запусти:
    ```bash
    node bot.js
    ```

## <img src="images/tech.svg" width="24" align="vertical-align: middle"> Технологии

- <img src="images/node.svg" width="24" align="middle"> Node.js + Telegraf
- <img src="images/ai.svg" width="24" align="middle"> Yandex GPT
- <img src="images/database.svg" width="24" align="middle"> SQLite / PostgreSQL (опционально)

## <img src="images/github.svg" width="24"> GitHub
[Перейти в репозиторий](https://github.com/xVOLKx/telegram-bot-admin)

## <img src="images/license.svg" width="28"> Лицензия

MIT © [xVOLKx](https://github.com/xVOLKx)
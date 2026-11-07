@echo off
chcp 65001 >nul
echo ========================================================
echo   Автоматическая публикация проекта на GitHub
echo ========================================================
echo.
echo Вставьте ссылку на ваш созданный репозиторий на GitHub.
echo Пример: https://github.com/ВАШ_ЛОГИН/todo-list-app.git
echo.
set /p REPO_URL="URL репозитория: "

if "%REPO_URL%"=="" (
    echo Ошибка: URL не может быть пустым!
    pause
    exit /b 1
)

echo.
echo [1/3] Проверка ветки main...
git branch -M main

echo [2/3] Настройка удаленного репозитория...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [3/3] Отправка кода на GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo ✅ Код успешно отправлен на GitHub!
    echo Теперь перейдите в Settings -^> Pages в репозитории
    echo и включите публикацию из ветки 'main'.
    echo ========================================================
) else (
    echo.
    echo ❌ Произошла ошибка при отправке. Проверьте правильность ссылки и авторизацию в GitHub.
)

echo.
pause

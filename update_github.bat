@echo off
chcp 65001 >nul
echo ========================================================
echo   TaskFlow: Быстрое обновление проекта на GitHub
echo ========================================================
echo.

echo [1/3] Добавление всех файлов и папок (css, js, manifest)...
git add -A

echo.
echo [2/3] Фиксация изменений...
git commit -m "feat: customize themes, mobile PWA, deadlines and priorities" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Изменения зафиксированы.
) else (
    echo Нет новых изменений для коммита или коммит уже создан.
)

echo.
echo [3/3] Отправка обновлений на GitHub (ветка main)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  ✅ УСПЕШНО! Все файлы и папки загружены на GitHub!
    echo.
    echo  Репозиторий: https://github.com/Yaroslav938/test
    echo  Рабочий сайт: https://yaroslav938.github.io/test/
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  ❌ Ошибка отправки. Если появилось окно браузера,
    echo  подтвердите вход в ваш аккаунт GitHub.
    echo ========================================================
)

echo.
pause

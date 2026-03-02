@echo off
echo 🔄 Деплой valutabot...
cd /d "E:\Работа\Pet-Projects\Курсы валют"
git pull origin main
git add .
git commit -m "Auto-deploy %date% %time%" || echo "Нет изменений"
git push origin main
echo ✅ GitHub + Vercel готово! https://valutabot.vercel.app
pause

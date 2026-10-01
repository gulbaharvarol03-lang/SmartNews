@echo off
title SmartNews Baslatici
echo ===================================================
echo SmartNews Uygulamasi Baslatiliyor...
echo ===================================================
echo Lutfen bu siyah pencereyi kapatmayin! Uygulama calistigi surece acik kalmalidir.
echo.
echo Tarayiciniz otomatik olarak aciliyor...
start http://localhost:8002
python -m http.server 8002

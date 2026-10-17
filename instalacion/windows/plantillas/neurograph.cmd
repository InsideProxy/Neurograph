@echo off
rem Comando diario de NeuroGraph (H11, B3 del diseno): neurograph abrir |
rem apagar | estado | tractografia | conectar-ia | desinstalar. Todo en una
rem linea que empieza por (goto): cmd ya ha leido y expandido la linea, sale
rem del .cmd y ejecuta el resto fuera de el. Asi "neurograph desinstalar"
rem puede borrar este archivo (cmd vuelve a leer el .cmd tras cada orden y
rem diria que no lo encuentra), y el codigo de salida es el de PowerShell
rem ("& exit /b" al final no sirve: da 0 y vuelve a leer el archivo;
rem comprobado en la maquina virtual de pruebas).
(goto) 2>nul & "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\neurograph.ps1" %*

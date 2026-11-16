@echo off
REM Windows version of run-payara-micro.sh
REM   set GEMINI_API_KEY=your_key
REM   set TRANSLATOR_USERS=student:darija2026
REM   run-payara-micro.bat
setlocal
cd /d %~dp0
if "%PAYARA_VERSION%"=="" set PAYARA_VERSION=6.2024.6
if "%PORT%"=="" set PORT=8080
set JAR=payara-micro-%PAYARA_VERSION%.jar

if not exist %JAR% (
  echo Downloading Payara Micro %PAYARA_VERSION%...
  curl -fL -o %JAR% https://repo1.maven.org/maven2/fish/payara/extras/payara-micro/%PAYARA_VERSION%/payara-micro-%PAYARA_VERSION%.jar || exit /b 1
)

call mvn -q clean package || exit /b 1
echo Starting on http://localhost:%PORT%/translator/api ...
java -jar %JAR% --deploy target\translator.war --port %PORT% --nocluster

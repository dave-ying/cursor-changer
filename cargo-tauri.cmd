@echo off
setlocal enabledelayedexpansion

rem Wrapper to allow running `cargo tauri ...` from the repo root.
rem It forwards to the real cargo-tauri binary (installed via cargo) while forcing
rem the manifest path to src-tauri/Cargo.toml.

set "SELF=%~f0"
set "REAL="

for /f "usebackq delims=" %%I in (`where cargo-tauri 2^>nul`) do (
  if /i not "%%~fI"=="%SELF%" (
    set "REAL=%%~fI"
    goto :found
  )
)

:found
if not defined REAL (
  echo Error: could not find the real cargo-tauri binary on PATH.
  echo Install it with: cargo install tauri-cli
  exit /b 1
)

if /i "%~1"=="init" (
  "%REAL%" %*
  exit /b %ERRORLEVEL%
)

"%REAL%" %* --manifest-path "%~dp0src-tauri\Cargo.toml"
exit /b %ERRORLEVEL%

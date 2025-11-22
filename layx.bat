@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

:: **********************
:: * Configuration Zone *
:: **********************
SET "VERSION=0.1.0 alpha"
SET "PROGRAM_DIR=C:\Program Files\LayX\"
SET "MAIN_DIR=main\"
SET "MAIN_FILE=main.mjs"
SET "IMAGES_DIR=assets\image\"
SET "ARGS="

:: *********************
:: * ANSI Color Codes  *
:: *********************
SET "COLOR_red=[31m"
SET "COLOR_green=[32m"
SET "COLOR_yellow=[33m"
SET "COLOR_cyan=[36m"
SET "COLOR_RESET=[0m"

:: *********************
:: * Error Messages    *
:: *********************
SET "STRING_node_fail=!COLOR_red!Failed to execute Node.js. Please check the path and installation.!COLOR_RESET!"
SET "STRING_dir_error=!COLOR_red!Cannot perform this action in "%FR_CURRENT_DIR%"!COLOR_RESET!"

:: *********************
:: * Initialize Paths  *
:: *********************
SET "CURRENT_DIR=%CD%\"    
SET "SCRIPT_DIR=%~dp0"
SET "SCRIPT_PATH=%~f0"

:: Snippets path
SET "SNIPPETS_PATH=%SCRIPT_DIR%%MAIN_DIR%syntax\layx.code-snippets"
SET "SNIPPETS_DIR=C:\Users\%username%\AppData\Roaming\Code\User\snippets\"




:: *********************
:: * Main Execution    *
:: *********************
ECHO LayX version %VERSION%

IF "%~1" NEQ "" (
    CALL :process_arguments %*
    GOTO :EOF
)

:interactive_menu
ECHO %COLOR_cyan%Please choose an option:%COLOR_RESET%
ECHO 1. Build
ECHO 2. Unbuild
ECHO 3. Create
ECHO 4. Optimize Images
ECHO 5. Install
ECHO 6. Uninstall
ECHO 7. Exit

SET /P choice="Enter your choice (1-7): "
IF "%choice%"=="1" (GOTO build)
IF "%choice%"=="2" (GOTO unbuild)
IF "%choice%"=="3" (GOTO create)
IF "%choice%"=="4" (GOTO optimizeImages)
IF "%choice%"=="5" (GOTO install)
IF "%choice%"=="6" (GOTO uninstall)
IF "%choice%"=="7" (GOTO end)
ECHO %COLOR_yellow%Invalid choice. Please try again.%COLOR_RESET%
GOTO interactive_menu

:: *********************
:: * Function Sections *
:: *********************

:build
CALL :validate_node
IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
    node "%SCRIPT_DIR%%MAIN_DIR%%MAIN_FILE%" build
) ELSE (ECHO %STRING_dir_error%)
GOTO end

:unbuild
CALL :validate_node
IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
    node "%SCRIPT_DIR%%MAIN_DIR%%MAIN_FILE%" unbuild
) ELSE (ECHO %STRING_dir_error%)
GOTO end

:create
IF NOT EXIST "%PROGRAM_DIR%" (
    ECHO %COLOR_yellow%LayX is not installed. Please install first.%COLOR_RESET%
    GOTO end
)

IF EXIST "%CURRENT_DIR%\layx" (
    :create_retry
    SET "choice="
    SET /P choice="Existing LayX project found. Overwrite? (Y/N): "
    IF /I "!choice!"=="Y" (ECHO %COLOR_cyan%Continuing...%COLOR_RESET%)
    IF /I "!choice!"=="N" (GOTO end)
    IF NOT DEFINED choice (GOTO create_retry)
)


FOR /F "DELIMS=" %%F IN ('DIR /B /A "%PROGRAM_DIR%"') DO (
    IF /I "%%F"=="layx.bat" (
    ) ELSE (
        IF "%~1"=="-bt" (
            CALL :CopyItem "%%F"
        ) ELSE (
            IF /I NOT "%%F"=="main" (
                IF /I NOT "%%F"=="node_modules" (
                    IF /I NOT "%%F"=="package.json" (
                        IF /I NOT "%%F"=="package-lock.json" (
                            CALL :CopyItem "%%F"
                        )
                    )
                )
            )
        )
    )
)

ECHO %COLOR_GREEN%Project created successfully!%COLOR_RESET%
GOTO END

:optimizeImages
CALL :validate_node
ECHO %COLOR_cyan%Checking if any images are available to optimize...%COLOR_RESET%
node "%SCRIPT_DIR%%MAIN_DIR%%MAIN_FILE%" optimizeImages
ECHO %COLOR_green%Optimization completed successfully!%COLOR_RESET%
GOTO end

:install
IF "%SCRIPT_DIR%"=="%PROGRAM_DIR%" (
    ECHO %COLOR_yellow%Already installed in "%PROGRAM_DIR%"%COLOR_RESET%
    GOTO end
)

NET SESSION >NUL 2>&1 || (
    ECHO %COLOR_yellow%Elevating privileges...%COLOR_RESET%
    PowerShell -Command "Start-Process -Verb RunAs -FilePath '%SCRIPT_PATH%' -ArgumentList 'install' -Wait"
    EXIT /B
)

IF EXIST "%PROGRAM_DIR%" (
    SET /P choice="Existing installation found. Update or overwrite? (Y/N): "
    IF /I NOT "!choice!"=="Y" GOTO end
)

CALL :xcopy_safe "%SCRIPT_DIR%" "%PROGRAM_DIR%"

:: Check if path already exists in system PATH
PowerShell -Command "$currentPath = [Environment]::GetEnvironmentVariable('Path', 'Machine'); if ($currentPath -notlike '*%PROGRAM_DIR%*') { [Environment]::SetEnvironmentVariable('Path', $currentPath + ';%PROGRAM_DIR%', 'Machine'); Write-Host '%COLOR_green%Added to system PATH%COLOR_RESET%' } else { Write-Host '%COLOR_cyan%Path already exists in system PATH%COLOR_RESET%' }"

:: Copy code snippets
CALL :xcopy_safe "%SNIPPETS_PATH%" "%SNIPPETS_DIR%"

ECHO %COLOR_green%Installation completed successfully!%COLOR_RESET%
GOTO end_with_pause

:uninstall
NET SESSION >NUL 2>&1 || (
    ECHO %COLOR_yellow%Elevating privileges...%COLOR_RESET%
    PowerShell -Command "Start-Process -Verb RunAs -FilePath '%SCRIPT_PATH%' -ArgumentList 'uninstall' -Wait"
    EXIT /B
)

IF EXIST "%PROGRAM_DIR%" (
    RMDIR /S /Q "%PROGRAM_DIR%" && (
        ECHO %COLOR_green%Uninstallation completed%COLOR_RESET%
    ) || (
        ECHO %COLOR_red%Failed to remove program directory%COLOR_RESET%
    )
)
GOTO end_with_pause

:: *********************
:: * Helper Functions *
:: *********************
:validate_node
where node >NUL 2>&1
IF ERRORLEVEL 1 (
        ECHO %COLOR_red%Node.js not found! It required for build and other operations. Download and install it from https://nodejs.org/en/download%COLOR_RESET%
        EXIT /B 1
)
EXIT /B 0

:CopyItem
IF EXIST "%PROGRAM_DIR%%~1\*" (
    XCOPY /Y /E /Q "%PROGRAM_DIR%%~1" "%CURRENT_DIR%%~1\" >NUL
) ELSE (
    COPY  /Y "%PROGRAM_DIR%%~1" "%CURRENT_DIR%%~1" >NUL
)
EXIT /B 1

:process_arguments
SET "cmd=%~1"
SHIFT
IF /I "%cmd%"=="add" (
    node "%SCRIPT_DIR%%MAIN_DIR%%MAIN_FILE%" %*
    EXIT /B
)

IF /I "%cmd%"=="setup" (
    CALL :validate_node
    node "create-setup.mjs"
    EXIT /B
)

FOR %%A IN (build unbuild create optimizeImages install uninstall) DO (
    IF /I "%cmd%"=="%%A" (
        GOTO %%A
    )
)

ECHO %COLOR_yellow%Invalid command. Valid options: build, unbuild, create, add, optimizeImages, install, uninstall%COLOR_RESET%
EXIT /B 1

:xcopy_safe
IF NOT EXIST "%~2\" MD "%~2" || EXIT /B 1
XCOPY /Y /E /Q "%~1" "%~2" >NUL
EXIT /B %ERRORLEVEL%

:end_with_pause
ECHO.
ECHO %COLOR_cyan%Press any key to continue...%COLOR_RESET%
PAUSE >NUL

:end
ENDLOCAL
EXIT /B 0
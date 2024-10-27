@ECHO OFF

SET COLOR_red=[31m
SET COLOR_green=[32m
SET COLOR_yellow=[33m
SET COLOR_cyan=[36m
SET COLOR_RESET=[0m


SET "STRING_node_fail=%COLOR_red%Failed to execute Node js. Please check the path and installation.%COLOR_RESET%"
SET "STRING_dir_error=%COLOR_red%Can not perform this action here "%FR_CURRENT_DIR%"%COLOR_RESET%"


SET "CURRENT_DIR=%CD%\"
SET "SCRIPT_DIR=%~dp0"
SET "CONFIG_DIR=config\"
SET "IMAGES_DIR=assets\image\"
SET "NODE_EXE=%CURRENT_DIR%%CONFIG_DIR%node.exe"
SET "WEBP_EXE=%CURRENT_DIR%%CONFIG_DIR%webp.exe"
SET "PROGRAM_DIR=C:\Program Files\layx\"
SET "FR_CURRENT_DIR=%CURRENT_DIR:\=/%"

IF "%SCRIPT_DIR%"=="%PROGRAM_DIR%" (
    SET "USE_DIR=%SCRIPT_DIR%"
    ) ELSE (
    SET "USE_DIR=%CURRENT_DIR%"
)

ECHO LayX version 0.1.0 alpha

IF NOT EXIST "%NODE_EXE%" (
    ECHO Local folder Node js not found.

    IF EXIST "%PROGRAM_DIR%%CONFIG_DIR%node.exe" (
        SET "NODE_EXE=%PROGRAM_DIR%%CONFIG_DIR%node.exe"
        SET "WEBP_EXE=%PROGRAM_DIR%%CONFIG_DIR%webp.exe"
        ECHO Using program Node js .
    ) ELSE ( 
    ECHO Program Node js also not found.   
    bun -v >nul 2>&1
    IF ERRORLEVEL 1 (
        ECHO Node js is not installed.
    ) ELSE (
        ECHO Node js found globally.
        SET "NODE_EXE=node"
    )
    )
)

IF NOT "%~1"=="" (
    FOR %%A IN (%*) DO (
        IF /I "%%A"=="build" (
            GOTO build 
        ) ELSE IF /I "%%A"=="unbuild" (
            GOTO unbuild 
        ) ELSE IF /I "%%A"=="create" (
            GOTO create
        ) ELSE IF /I "%%A"=="optimage" (
            GOTO optimizeImages
        ) ELSE IF /I "%%A"=="install" (
            GOTO install
        ) ELSE IF /I "%%A"=="uninstall" (
            GOTO uninstall
        ) ELSE (
            ECHO Available options are %COLOR_yellow%"build"%COLOR_RESET%, %COLOR_yellow%"unbuild"%COLOR_RESET%, %COLOR_yellow%"create"%COLOR_RESET%, %COLOR_yellow%"optimage"%COLOR_RESET%, %COLOR_yellow%"install"%COLOR_RESET% and %COLOR_yellow%"uninstall"%COLOR_RESET%.
            IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
               ECHO Forwading cmd to "config.mjs"
               "%NODE_EXE%" "%USE_DIR%%CONFIG_DIR%config.mjs"  %*
            ) ELSE (
              ECHO %STRING_dir_error%
            )
        )
    )
    GOTO end
) ELSE (
    GOTO option
)

GOTO end

:build
ECHO Building...
ECHO Using Node: "%NODE_EXE%"
"%NODE_EXE%" -v
IF ERRORLEVEL 1 (
    ECHO %STRING_node_fail%
    GOTO end
)

IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
  "%NODE_EXE%" "%USE_DIR%%CONFIG_DIR%config.mjs" "build"
) ELSE (
    ECHO %STRING_dir_error%
)

GOTO end

:unbuild
ECHO Unbuilding...
ECHO Using Node: "%NODE_EXE%"
"%NODE_EXE%" -v
IF ERRORLEVEL 1 (
    ECHO %STRING_node_fail%
    GOTO end
)

IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
  "%NODE_EXE%" "%USE_DIR%%CONFIG_DIR%config.mjs" "unbuild"
) ELSE (
    ECHO %STRING_dir_error%
)

GOTO end

:create

IF EXIST "%PROGRAM_DIR%" (
    IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
        
        IF EXIST "%CURRENT_DIR%\layx" (
            SET /P choice="There may be an existing LayX project. Do you want to replace it? (Y/N): "

             IF /I "%choice%"=="y" (
             ECHO %COLOR_cyan%Continuing...%COLOR_RESET%
             ) ELSE IF /I "%choice%"=="n" (
             GOTO end
        ) ELSE (
        ECHO %COLOR_yellow%Please choose a valid option.%COLOR_RESET%
        GOTO create
        )
        )
        
        ECHO %COLOR_cyan%Copying LayX files...%COLOR_RESET%
        Xcopy "%PROGRAM_DIR%" "%CURRENT_DIR%" /Y /E /S /V /I 
 
        IF EXIST "%CURRENT_DIR%%CONFIG_DIR%" (
            ECHO %COLOR_cyan%Cleaning up unnecessary files...%COLOR_RESET%
            rmdir "%CURRENT_DIR%%CONFIG_DIR%" /S /Q
        )
        
        IF EXIST "%CURRENT_DIR%\layx.bat" (
            DEL "%CURRENT_DIR%\layx.bat" /S /Q
        )

        ECHO %COLOR_green%LayX project created in the current directory.%COLOR_RESET%

    ) ELSE (
        ECHO %COLOR_red%Error: You are already in the LayX program directory. Please change to a different directory.%COLOR_RESET%
    )

) ELSE (
    ECHO %COLOR_yellow%LayX is not installed. Please install it first.%COLOR_RESET%
)

GOTO end

:optimizeImages

ECHO %COLOR_cyan%Optimizing images in "%IMAGES_DIR%"%COLOR_RESET%.

for /r "%CURRENT_DIR%%IMAGES_DIR%" %%d in (*.png *.jpg) do (
    echo %%d | findstr /v /i "orginal_images_dir" > nul && (
        SET "IMAGE_DIR=%%~dpd"
        SET "IMAGE_NAME=%%~nd"
        
        ECHO Processing %%~nxd

        "%WEBP_EXE%" "%%d" -o "%%~dpd%%~nd.webp" -q 90 -af  -progress -short

        IF NOT EXIST "%%~dpdorginal_images_dir\" (
            mkdir "%%~dpdorginal_images_dir\"
        )
        move "%%d" "%%~dpdorginal_images_dir\"

        ECHO Processed: %%~nxd at %%~dpd
    )
)

GOTO end


:install

IF NOT "%CURRENT_DIR%"=="%SCRIPT_DIR%" (
     ECHO %COLOR_red%Error: layx.bat not found in the specified directory.%COLOR_RESET%
     GOTO end
)

net session >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO %COLOR_yellow%Requesting Administrator privileges...%COLOR_RESET%
    powershell start-process -verb runas -filepath "%~0 install"
    EXIT /B
)

IF EXIST "%PROGRAM_DIR%" (

    IF "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
        ECHO %COLOR_yellow%Program already installated.%COLOR_RESET%
        GOTO pause
    )

    SET /P choice="Program directory already exists, would you like to update or replace? ('Y' or 'N'): "
    IF /I "%choice%"=="y" (
        ECHO %COLOR_cyan%Continuing...%COLOR_RESET%
    ) ELSE IF /I "%choice%"=="n" (
        GOTO end
    ) ELSE (
        ECHO %COLOR_yellow%Please choose a valid option.%COLOR_RESET%
        GOTO install
    )
)

ECHO %COLOR_cyan%Installing...%COLOR_RESET%
ECHO Copying Files.
Xcopy "%SCRIPT_DIR%" "%PROGRAM_DIR%" /Y /E /S /V /I 
Xcopy "%SCRIPT_DIR%%CONFIG_DIR%syntax\layx.code-snippets" "C:\Users\%username%\AppData\Roaming\Code\User\snippets\" /Y /E /S /V /I 

ECHO %PATH% | FIND /I "%PROGRAM_DIR%" >nul
IF ERRORLEVEL 1 (
    ECHO %COLOR_cyan%Adding "%PROGRAM_DIR%" to PATH%COLOR_RESET%
    setx PATH "%PATH%;%PROGRAM_DIR%"
) ELSE (
    ECHO %COLOR_yellow%"%PROGRAM_DIR%" is already in the PATH%COLOR_RESET%
)

ECHO %COLOR_green%Installation completed.%COLOR_RESET%

GOTO pause

:uninstall
net session >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO %COLOR_yellow%Requesting Administrator privileges...%COLOR_RESET%
    powershell -Command "Start-Process -Verb RunAs -FilePath '%PROGRAM_DIR%layx.bat' -ArgumentList 'uninstall'"
    EXIT /B
)

ECHO %COLOR_cyan%Uninstalling...%COLOR_RESET%

IF EXIST "%PROGRAM_DIR%" (
    rmdir "%PROGRAM_DIR%" /S /Q
) ELSE (
    ECHO "%PROGRAM_DIR%" not found.
)

ECHO Uninstallation completed.

GOTO end

:option
ECHO %COLOR_cyan%Please choose an option:%COLOR_RESET%
ECHO 1. Build
ECHO 2. Unbuild
ECHO 3. Create
ECHO 4. Optimize Images
ECHO 5. Install
ECHO 6. Uninstall
ECHO 7. Exit

SET /P choice="Enter your choice (1-8): "

IF "%choice%"=="1" (
    GOTO build 
) ELSE IF "%choice%"=="2" (
    GOTO unbuild 
) ELSE IF "%choice%"=="3" (
    GOTO create
) ELSE IF "%choice%"=="4" (
    GOTO optimizeImages 
) ELSE IF "%choice%"=="5" (
    GOTO install
) ELSE IF "%choice%"=="6" (
    GOTO uninstall
) ELSE IF "%choice%"=="7" (
    GOTO end
) ELSE (
    ECHO %COLOR_yellow%Please choose a valid option.%COLOR_RESET%
    GOTO option
)

:pause
PAUSE

:end
ECHO Script completed.
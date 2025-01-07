@ECHO OFF

REM Define ANSI color codes for formatted console output
SET COLOR_red=[31m
SET COLOR_green=[32m
SET COLOR_yellow=[33m
SET COLOR_cyan=[36m
SET COLOR_RESET=[0m

REM Define error messages with color formatting
SET "STRING_node_fail=%COLOR_red%Failed to execute Node js. Please check the path and installation.%COLOR_RESET%"
SET "STRING_dir_error=%COLOR_red%Can not perform this action here "%FR_CURRENT_DIR%"%COLOR_RESET%"

REM Set up directory paths and executable locations
SET "CURRENT_DIR=%CD%\"                        REM Current working directory
SET "SCRIPT_DIR=%~dp0"                         REM Directory containing this script
SET "CONFIG_DIR=config\"                       REM Configuration directory
SET "IMAGES_DIR=assets\image\"                 REM Images directory
SET "NODE_EXE=%CURRENT_DIR%%CONFIG_DIR%node.exe"   REM Path to Node.js executable
SET "WEBP_EXE=%CURRENT_DIR%%CONFIG_DIR%webp.exe"   REM Path to WebP converter executable
SET "AVIF_EXE=%CURRENT_DIR%%CONFIG_DIR%avif.exe"   REM Path to Avif converter executable
SET "PROGRAM_DIR=C:\Program Files\LayX\"           REM Installation directory
SET "FR_CURRENT_DIR=%CURRENT_DIR:\=/%"             REM Convert backslashes to forward slashes

REM Determine which directory to use based on script location
IF "%SCRIPT_DIR%"=="%PROGRAM_DIR%" (
    SET "USE_DIR=%SCRIPT_DIR%"
    ) ELSE (
    SET "USE_DIR=%CURRENT_DIR%"
)

ECHO LayX version 0.1.0 alpha

REM Check for Node.js installation and set appropriate path
IF NOT EXIST "%NODE_EXE%" (
    REM Check if Node.js exists in program directory
    IF EXIST "%PROGRAM_DIR%%CONFIG_DIR%node.exe" (
        SET "NODE_EXE=%PROGRAM_DIR%%CONFIG_DIR%node.exe"
        SET "WEBP_EXE=%PROGRAM_DIR%%CONFIG_DIR%webp.exe"
    ) ELSE ( 
        ECHO Program Node js also not found.   
        REM Check for global Node.js installation
        node -v >nul 2>&1
        IF ERRORLEVEL 1 (
            ECHO Node js is not installed.
        ) ELSE (
            ECHO Node js found globally.
            SET "NODE_EXE=node"
        )
    )
)

REM Process command line arguments if provided
IF NOT "%~1"=="" (
    REM Check for valid commands and route to appropriate label
    IF /I "%~1"=="build" (
        GOTO build 
    ) ELSE IF /I "%~1"=="unbuild" (
        GOTO unbuild 
    ) ELSE IF /I "%~1"=="create" (
        GOTO create
    ) ELSE IF /I "%~1"=="optimage" (
        GOTO optimizeImages
    ) ELSE IF /I "%~1"=="install" (
        GOTO install
    ) ELSE IF /I "%~1"=="uninstall" (
        GOTO uninstall
    ) ELSE IF /I "%~1"=="add" (
        "%NODE_EXE%" "%USE_DIR%%CONFIG_DIR%config.mjs"  %*
    ) ELSE (
        REM Display available options if invalid command
        ECHO Available options are %COLOR_yellow%"build"%COLOR_RESET%, %COLOR_yellow%"unbuild"%COLOR_RESET%, %COLOR_yellow%"create"%COLOR_RESET%, %COLOR_yellow%"add"%COLOR_RESET%, %COLOR_yellow%"optimage"%COLOR_RESET%, %COLOR_yellow%"install"%COLOR_RESET% and %COLOR_yellow%"uninstall"%COLOR_RESET%.
        IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
            ECHO Forwading cmd to "config.mjs"
            "%NODE_EXE%" "%USE_DIR%%CONFIG_DIR%config.mjs"  %*
        ) ELSE (
            ECHO %STRING_dir_error%
        )
    )
    GOTO end
) ELSE (
    GOTO option
)

GOTO end

REM Build label - Compiles the project using Node.js
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

REM Unbuild label - Reverses the build process
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

REM Create label - Sets up a new LayX project
:create
IF EXIST "%PROGRAM_DIR%" (
    IF NOT "%CURRENT_DIR%"=="%PROGRAM_DIR%" (
        REM Check for existing project and confirm overwrite
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
        
        REM Copy LayX files to current directory
        ECHO %COLOR_cyan%Copying LayX files...%COLOR_RESET%
        Xcopy "%PROGRAM_DIR%" "%CURRENT_DIR%" /Y /E /S /V /I 
 
        REM Clean up unnecessary files
        IF EXIST "%CURRENT_DIR%%CONFIG_DIR%" (
            ECHO %COLOR_yellow%Cleaning up unnecessary files...%COLOR_RESET%
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

REM Optimize Images label - Converts images to WebP format
:optimizeImages
ECHO %COLOR_cyan%Optimizing images in "%IMAGES_DIR%"%COLOR_RESET%.

REM Process all PNG and JPG files in the images directory
SET "ARGS=%*"
FOR /F "tokens=1*" %%A IN ("%ARGS%") DO (
    SET "ARGS=%%B"
)

for /r "%CURRENT_DIR%%IMAGES_DIR%" %%d in (*.png *.jpg) do (
    echo %%d | findstr /v /i "orginal_images_dir" > nul && (
        SET "IMAGE_DIR=%%~dpd"
        SET "IMAGE_NAME=%%~nd"
        SET "IMAGE_EXT=.avif"
        
        ECHO Processing %%~nxd

        REM Convert to Avif format
        "%AVIF_EXE%" %ARGS% "%%d" -o "%IMAGE_DIR%%IMAGE_NAME%%IMAGE_EXT%"

        REM Create backup directory and move original
        IF NOT EXIST "%%~dpdorginal_images_dir\" (
            mkdir "%%~dpdorginal_images_dir\" 
        )
        move "%%d" "%%~dpdorginal_images_dir\" 

        ECHO Processed: %%~nxd at %%~dpd
    )
)

GOTO end

REM Install label - Installs LayX
:install
REM Check for admin privileges
net session >nul 2>&1
IF ERRORLEVEL 1 (
    IF NOT EXIST "%CURRENT_DIR%layx.bat" (
        ECHO %COLOR_red%layx.bat not found in the current directory.%COLOR_RESET%
        GOTO end
    )

    ECHO %COLOR_yellow%Requesting Administrator privileges...%COLOR_RESET%
    powershell start-process -verb runas -filepath "%~0 install"
    EXIT /B
)

REM Handle existing installation
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

REM Perform installation
ECHO %COLOR_cyan%Installing...%COLOR_RESET%
ECHO Copying Files.
Xcopy "%SCRIPT_DIR%" "%PROGRAM_DIR%" /Y /E /S /V /I 
Xcopy "%SCRIPT_DIR%%CONFIG_DIR%syntax\layx.code-snippets" "C:\Users\%username%\AppData\Roaming\Code\User\snippets\" /Y /E /S /V /I 

REM Add to PATH using PowerShell to handle System PATH properly
powershell -Command "$oldPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'); if ($oldPath -notlike '*%PROGRAM_DIR%*') { $newPath = $oldPath + ';%PROGRAM_DIR%'; [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine'); Write-Host '%COLOR_cyan%Added to System PATH%COLOR_RESET%' } else { Write-Host '%COLOR_yellow%Already in System PATH%COLOR_RESET%' }"

ECHO %COLOR_green%Installation completed.%COLOR_RESET%

GOTO pause

REM Uninstall label - Uninstalls LayX
:uninstall
IF NOT EXIST "%PROGRAM_DIR%" (
    ECHO %COLOR_yellow%LayX is not installed on your system.%COLOR_RESET%
    GOTO end
)

REM Check for admin privileges
net session >nul 2>&1
IF ERRORLEVEL 1 (
    ECHO %COLOR_yellow%Requesting Administrator privileges...%COLOR_RESET%
    powershell -Command "Start-Process -Verb RunAs -FilePath '%PROGRAM_DIR%layx.bat' -ArgumentList 'uninstall'"
    EXIT /B
)

ECHO %COLOR_cyan%Uninstalling...%COLOR_RESET%

REM Remove from PATH using PowerShell
powershell -Command "$oldPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'); if ($oldPath -like '*%PROGRAM_DIR%*') { $newPath = ($oldPath -split ';' | Where-Object { $_ -ne '%PROGRAM_DIR%'.TrimEnd('\') }) -join ';'; [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine'); Write-Host '%COLOR_cyan%Removed from System PATH%COLOR_RESET%' }"

REM Remove program directory
IF EXIST "%PROGRAM_DIR%" (
    rmdir "%PROGRAM_DIR%" /S /Q
    ECHO %COLOR_green%Program directory removed.%COLOR_RESET%
) ELSE (
    ECHO "%PROGRAM_DIR%" not found.
)

ECHO %COLOR_green%Uninstallation completed.%COLOR_RESET%

GOTO end

REM Interactive menu for command selection
:option
ECHO %COLOR_cyan%Please choose an option:%COLOR_RESET%
ECHO 1. Build
ECHO 2. Unbuild
ECHO 3. Create
ECHO 4. Optimize Images
ECHO 5. Install
ECHO 6. Uninstall
ECHO 7. Exit

SET /P choice="Enter your choice (1-7): "

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
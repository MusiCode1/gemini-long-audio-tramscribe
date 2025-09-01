
function transcribe ($basePath, $audioFileName) {

    $audioFilePath = "$basePath\יומן\הקלטות\$audioFileName.mp3"
    $promptFilePath = "$basePath\פרומפטים\פרומפט לתמלול יומן רכב.md"
    $outputFilePath = "$basePath\יומן\הקלטות\$audioFileName.md"

    bun run transcribe -- --file $audioFilePath --output $outputFilePath --prompt $promptFilePath
}

$env:API_KEY = ""   
$env:DEBUG = "*";
$basePath = "G:\האחסון שלי\ObsidianVault";
$audioFileName = "/2025_08_25_15_33_15 יומן רכב"

transcribe $basePath, $audioFileName

bun run transcribe -- --file $audioFilePath --output $outputFilePath --prompt $promptFilePath
# יומן/הקלטות/יומן-רכב-01.mp3




$env:API_KEY = ""   
$env:DEBUG="*";
$basePath = "G:\האחסון שלי\ObsidianVault";
$audioFileName = "2025_06_24_21_23_29"
$audioFilePath = "$basePath\יומן\הקלטות\$audioFileName.mp3"
$promptFilePath = "$basePath\פרומפטים\פרומפט לתמלול יומן רכב.md"
$outputFilePath = "$basePath\יומן\הקלטות\$audioFileName.md"
bun run transcribe -- --file $audioFilePath --output $outputFilePath --prompt $promptFilePath
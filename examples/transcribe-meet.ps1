
$promptFilePath = "G:\האחסון שלי\ObsidianVault\10. פרויקטים\פרומפטים\פרומפט כללי לתמלול פגישה.md"

$output = "D:\Users\User\Downloads\Phone Link\record-1767126291929-t.md"

$inputFile  ="D:\Users\User\Downloads\Phone Link\record-1767126291929.wav"

transcribe.exe --file $inputFile --prompt $promptFilePath --output $output --concurrent 1 --backoff 30000

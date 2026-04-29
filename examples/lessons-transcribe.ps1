$basePath = "F:\וועדים-מעשיים\Shiur"

$lessonNum = 22;

$promptFilePath = "$basePath\Prompts\Transcribe-Prompt.md"

$output = "$basePath\שיעור-$lessonNum\L$lessonNum-t.md"

$inputFile  ="$basePath\שיעור-$lessonNum\Lesson-$lessonNum-full-v1.m4a"

transcribe.exe --file $inputFile --prompt $promptFilePath --output $output --concurrent 1 --backoff 30000

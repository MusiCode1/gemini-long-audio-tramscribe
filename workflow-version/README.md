To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

```powershell

$basePath = "E:\וועדים-מעשיים\Shiur"

$lessonNum = 15;

$promptFilePath = "$basePath\Prompts\Transcribe-Prompt.md"

$output = "$basePath\שיעור-$lessonNum\L$lessonNum-t.md"

$inputFile  ="$basePath\שיעור-$lessonNum\Lesson-$lessonNum-full-v1.m4a"

$requestBody = @{
    file = $inputFile
    prompt = $promptFilePath
    output = $output
    concurrent = 1
    backoff = 30000
} | ConvertTo-Json

curl -X POST --json $requestBody http://localhost:3000/transcribe



# transcribe.exe --file $inputFile --prompt $promptFilePath --output $output --concurrent 1 --backoff 30000

```
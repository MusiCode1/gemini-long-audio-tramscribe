#!/usr/bin/env bun
// ===================================================================================
// Transcribe CLI - כלי שורת פקודה לתמלול קבצי אודיו באמצעות שירות Gemini
// ===================================================================================
//
// שימוש:
// bun run transcribe -- --file <path> [--prompt <path>] [--output <path>] [--concurrent <number>]
//
// דוגמאות:
// bun run transcribe -- --file ./audio/my-podcast.mp3
// bun run transcribe -- --file ./audio/meeting.wav --prompt ./prompts/meeting-prompt.txt
// bun run transcribe -- --file input.mp3 --output result.md
// bun run transcribe -- --file long.mp3 --concurrent 5
//
// ===================================================================================
import 'dotenv/config'; // טעינת משתני סביבה מקובץ .env
import './utils/polyfill'; // ייבוא הפוליפילים ראשון כדי להבטיח שהסביבה מוכנה

import { transcribe } from './workflows/transcribe-file.js';

import { promises as fs } from 'fs';
import path from 'path';
import { cac } from 'cac';
import { start } from "workflow/api";


cli();


/**
 * פונקציה ראשית המריצה את תהליך התמלול מה-CLI.
 */
export async function main(options: {
    file: string;
    prompt?: string;
    output?: string;
    concurrent?: number;
    retries?: number;
    backoff?: number;
}) {

    debugger;
    console.log('--- Transcribe CLI Initialized ---');

    const { file: filePath, prompt: promptPath, output: outputPath, concurrent, retries, backoff } = options;

    if (concurrent) {
        console.log(`⚙️  Running with ${concurrent} concurrent requests.`);
    }
    if (retries) {
        console.log(`🔁 Max retries set to ${retries}.`);
    }
    if (backoff) {
        console.log(`⏱️ Initial backoff delay set to ${backoff}ms.`);
    }

    // קריאה לפונקציית התמלול הראשית
    /* const finalTranscript = await transcribe(filePath, promptPath, (progress) => {
        // הדפסת עדכוני התקדמות לקונסול
        process.stdout.write(`\r⏳ ${progress.message}`);
    }, concurrent, retries, backoff); */

    const progressFn = (progress: { message: string }) => {
        // הדפסת עדכוני התקדמות לקונסול
        process.stdout.write(`\r⏳ ${progress.message}`);
    };

    /* const options = {
        filePath,
        promptPath,
        outputPath,
        concurrent,
        retries,
        backoff
    }; */

    const run = await start(transcribe, [options]);


    const finalTranscript = await run.returnValue;



    // שמירת התוצאה או הדפסתה
    if (outputPath) {
        const basename = path.basename(filePath);
        const outputContent = [
            `![](./${basename})`,
            '# תמלול: ' + path.basename(filePath),
            finalTranscript
        ].join('\n\n');

        await fs.writeFile(outputPath, outputContent, 'utf-8');
        console.log(`\n✅ Transcription Complete! Output saved to: ${outputPath}`);
    } else {
        console.log('\n✅ Transcription Complete!');
        console.log('------------------------------------');
        console.log(finalTranscript);
        console.log('------------------------------------');
    }
}

export function cli() {

    // הגדרת ה-CLI באמצעות cac
    const cli = cac('transcribe');

    cli
        .command('', 'Transcribe an audio file')
        .option('--file <path>', 'Path to the audio file to transcribe')
        .option('--prompt <path>', 'Path to a custom prompt file')
        .option('--output <path>', 'Path to save the output markdown file')
        .option('--concurrent <number>', 'Number of concurrent requests to make', {
            default: undefined, // ברירת מחדל תהיה undefined אם לא סופק
        })
        .option('--retries <number>', 'Maximum number of retries for failed operations')
        .option('--backoff <number>', 'Initial backoff delay in milliseconds for retries')
        .action(async (options) => {
            if (!options.file) {
                console.error('Error: --file argument is required.');
                cli.outputHelp();
                process.exit(1);
            }

            try {
                await main(options);
            } catch (error) {
                console.error("\n❌ An unexpected error occurred:");
                console.error(error.message);
                process.exit(1);
            }
        });

    cli.help();
    cli.version('1.0.0');

    // ניתוח הארגומנטים שהועברו
    try {
        cli.parse();
    } catch (error) {
        console.error(`\n❌ ${error.message}`);
        process.exit(1);
    }
}
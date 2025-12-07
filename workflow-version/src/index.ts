


// import { createEmbeddedWorld } from '@workflow/world-local';

// const world = createEmbeddedWorld({ dataDir: './workflow-data' });


import { sValidator } from '@hono/standard-validator';
import { start } from "workflow/api";
import { type } from 'arktype';
import { Hono } from 'hono';


import { transcribe } from "./workflows/transcribe-file.js";

/* (async () => {
  cli();
})(); */

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const TranscribeRequestSchema = type({
  file: 'string',
  prompt: 'string?',
  output: 'string?',
  concurrent: 'number?',
  retries: 'number?',
  backoff: 'number?'
});

app.post('/transcribe', sValidator('json', TranscribeRequestSchema), async (c) => {

  const { file, prompt, output, concurrent, retries, backoff } = c.req.valid('json');

  const result = await start(transcribe, [{
    file,
    prompt,
    output,
    concurrent,
    retries,
    backoff
  }]);

  return c.json({ transcript: result });
});


export default app

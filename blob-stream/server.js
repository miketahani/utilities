import stream from 'stream'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { WebSocketServer } from 'ws'

console.log('[*] starting server')
const wss = new WebSocketServer({ port: 7005 })

wss.on('connection', function connection(ws) {
  const id = randomUUID()

  console.log(`[+] new connection: ${id}`)

  const ffmpegProcess = spawn('ffmpeg',
    [
      '-y',
      '-f', 'image2pipe',
      '-i', '-',
      `${id}.mp4`
    ]
  )

  const inputImagesStream = new stream.PassThrough()
  inputImagesStream.pipe(ffmpegProcess.stdin)

  ws.on('message', buffer => inputImagesStream.write(buffer))

  ws.on('close', () => {
    console.log(`[-] closed connection: ${id}`)
    inputImagesStream.end()
  })
})

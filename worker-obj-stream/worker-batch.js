class OBJDecoder {
  onChunk = null
  partialChunk = ''

  registerOnChunk = fn => this.onChunk = fn

  decode = data => {
    const normalisedData = this.partialChunk + data

    // FIXME Example-specific logic; extract and pass to the worker
    // Performance could be improved here, but this is just an example
    const chunks = normalisedData.split('\n')
      .filter(chunk => chunk.startsWith('v '))
      .map(chunk => chunk.replace('v ', '').split(' ').map(Number))

    this.partialChunk = chunks.pop()
    chunks.forEach(this.onChunk)
  }
}

class OBJDecoderStream {
  decoder = new OBJDecoder()

  readable = new ReadableStream({
    start: controller => {
      this.decoder.registerOnChunk(
        chunk => controller.enqueue(chunk)
      )
    }
  })

  writable = new WritableStream({
    write: data => {
      this.decoder.decode(data)
    }
  })
}

class PointStream {
  size = 500
  positions = new Float32Array(500 * 3)
  lastIndex = 0
  onPoint = null

  readable = new ReadableStream({
    start: controller => {
      this.onPoint = ([x, y, z]) => {
        this.positions[this.lastIndex++] = x
        this.positions[this.lastIndex++] = y
        this.positions[this.lastIndex++] = z

        if (this.lastIndex / 3 === this.size) {
          controller.enqueue(this.positions)
          this.positions = new Float32Array(this.size * 3)
          this.lastIndex = 0
        }
      }
    }
  })

  writable = new WritableStream({
    write: data => this.onPoint && this.onPoint(data)
  })
}

self.addEventListener('message', e => {
  fetch(e.data)
    .then(res => res.body.pipeThrough(new TextDecoderStream()))
    .then(text => text.pipeThrough(new OBJDecoderStream()))
    .then(positions => positions.pipeThrough(new PointStream()))
    .then(stream => stream.pipeTo(new WritableStream({
      write(data) {
        self.postMessage(data)
      }
    })))
})

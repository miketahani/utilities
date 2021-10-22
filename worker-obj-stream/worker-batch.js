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
      this.readController = controller

      this.decoder.registerOnChunk(
        chunk => controller.enqueue(chunk)
      )
    }
  })

  writable = new WritableStream({
    write: data => {
      this.decoder.decode(data)
    },
    close: controller => {
      // Teardown
      this.readController.close()
    }
  })
}

class PointStream {
  n = 500
  positions = new Float32Array(500 * 3)
  lastIndex = 0
  onPoint = null

  onPoint = (controller, [x, y, z]) => {
    this.positions[this.lastIndex++] = x
    this.positions[this.lastIndex++] = y
    this.positions[this.lastIndex++] = z

    if (this.lastIndex / 3 === this.n) {
      this.releaseBatch(controller)
    }
  }

  releaseBatch = consumerController => {
    let batch = this.positions

    // Cut the array size down if points < n (final batch)
    if (this.lastIndex / 3 < this.n) {
      batch = new Float32Array(this.lastIndex)
    }

    consumerController.enqueue(batch)
    this.positions = new Float32Array(this.n * 3)
    this.lastIndex = 0
  }

  readable = new ReadableStream({
    start: controller => {
      this.onPoint = this.onPoint.bind(this, controller)
      this.releaseBatch = this.releaseBatch.bind(this, controller)
    }
  })

  writable = new WritableStream({
    write: data => this.onPoint(data),

    close: controller => {
      // Send the last batch, which may not have this.n points
      this.releaseBatch()
    }
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

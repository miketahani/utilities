export class Capture {
  constructor (websocketURL, onOpen) {
    this.ws = new WebSocket(websocketURL)
    this.ws.addEventListener('open', onOpen)
  }

  close = () => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close()
      // FIXME Do event listeners get GC'd when we lose WS ref?
      this.ws = null
    }
  }

  frame = canvas => canvas.toBlob(blob => this.ws.send(blob))
}

export class Capture {
  constructor (websocketURL, onOpen, _canvas) {
    this.ws = new WebSocket(websocketURL)
    this.canvas = _canvas

    if (onOpen) {
      this.ws.addEventListener('open', onOpen)
    }
  }

  close = () => this.ws?.readyState === WebSocket.OPEN && this.ws.close()

  frame = (canvas = this.canvas) => {
    canvas.toBlob(blob => this.ws.send(blob))
  }
}

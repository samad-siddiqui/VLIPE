import { QRCodeSVG } from 'qrcode.react'

// QR code that opens a link. Dark ink on white so every phone camera reads it.
export default function QrCode({ url, size = 132 }) {
  return (
    <a href={url} className="qr" aria-label="Open the building passport">
      <QRCodeSVG value={url} size={size} level="M" fgColor="#1e2a2b" bgColor="#ffffff" marginSize={2} />
    </a>
  )
}
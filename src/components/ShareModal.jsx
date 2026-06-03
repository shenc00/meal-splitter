import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { X, Copy, Check, Share2 } from 'lucide-react'

// Shows the join link + QR code so others can scan and order on their device.
export default function ShareModal({ sessionId, onClose }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/join/${sessionId}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — user can still copy manually from the field
    }
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join our order', text: 'Order your items here:', url })
      } catch {
        // user cancelled
      }
    } else {
      copy()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Invite the table</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-5">Others scan the QR, open the link, or enter the code on the home screen.</p>

        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <QRCodeCanvas value={url} size={196} />
          </div>
        </div>

        {/* Typed join code */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Session code</p>
          <p className="text-3xl font-bold tracking-[0.3em] text-gray-900 pl-[0.3em]">{sessionId}</p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            readOnly
            value={url}
            onFocus={e => e.target.select()}
            className="flex-1 min-w-0 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600"
          />
          <button
            onClick={copy}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={nativeShare}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-2xl p-3.5 font-semibold hover:bg-orange-600 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4" /> Share link
        </button>
      </div>
    </div>
  )
}

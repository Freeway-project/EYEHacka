'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, Flashlight } from 'lucide-react'
import axios from 'axios'

interface FlashlightTestProps {
  onBack: () => void
  apiEndpoint?: string
}

type TestPhase = 'ready' | 'countdown' | 'capture' | 'result'

export default function FlashlightTest({ onBack, apiEndpoint = '/api/flashlight-test' }: FlashlightTestProps) {
  const [phase, setPhase] = useState<TestPhase>('ready')
  const [countdown, setCountdown] = useState(5)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize rear camera on mount
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Rear camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })
        
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Camera error:', err)
      }
    }
    
    initCamera()
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Start countdown
  const startCountdown = () => {
    setPhase('countdown')
    setCountdown(5)
  }

  // Countdown timer effect
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (phase === 'countdown' && countdown === 0) {
      capturePhoto()
    }
  }, [phase, countdown])

  // Capture photo with flash
  const capturePhoto = async () => {
    setPhase('capture')
    
    if (!streamRef.current || !videoRef.current || !canvasRef.current) return
    
    try {
      // Enable flash
      const track = streamRef.current.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities()
        if ('torch' in capabilities && capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: true } as MediaTrackConstraintSet]
          })
        }
      }

      // Wait for flash
      await new Promise(resolve => setTimeout(resolve, 200))

      // Capture
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        
        // Turn off flash
        if (track) {
          await track.applyConstraints({
            advanced: [{ torch: false } as MediaTrackConstraintSet]
          })
        }
        
        // Show photo
        canvas.toBlob((blob) => {
          if (blob) {
            const photoUrl = URL.createObjectURL(blob)
            setCapturedPhoto(photoUrl)
            setPhase('result')
            
            // Send to API
            sendToAPI(blob)
          }
        }, 'image/jpeg', 0.9)
      }
    } catch (err) {
      console.error('Capture failed:', err)
      setPhase('ready')
    }
  }

  // Send to API
  const sendToAPI = async (photoBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('photo', photoBlob, 'flash-test.jpg')
      
      await axios.post(apiEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
    } catch (err) {
      console.error('API error:', err)
    }
  }

  // Reset
  const reset = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto)
    }
    setCapturedPhoto(null)
    setCountdown(5)
    setPhase('ready')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-center py-3">
          <button onClick={onBack} className="mr-3 p-2 rounded-full hover:bg-gray-800">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <Flashlight className="w-7 h-7 text-yellow-400 mr-2" />
          <span className="text-lg font-semibold text-white">Flash Test</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {phase === 'ready' && (
          <>
            {/* Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Start Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={startCountdown}
                className="bg-yellow-500 text-black px-8 py-4 rounded-full font-bold text-xl hover:bg-yellow-400"
              >
                Start Flash Test
              </button>
            </div>
          </>
        )}

        {phase === 'countdown' && (
          <>
            {/* Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Countdown Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-white text-8xl font-bold mb-4">
                  {countdown}
                </div>
                <div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-semibold">
                  Get Ready - Flash Coming
                </div>
              </div>
            </div>
          </>
        )}

        {phase === 'capture' && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📸</div>
              <div className="text-2xl font-bold text-gray-800">Capturing...</div>
            </div>
          </div>
        )}

        {phase === 'result' && capturedPhoto && (
          <div className="absolute inset-0 bg-black flex flex-col">
            {/* Captured Photo */}
            <div className="flex-1 flex items-center justify-center p-4">
              <img 
                src={capturedPhoto} 
                alt="Captured photo" 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
            
            {/* Bottom Actions */}
            <div className="p-4 space-y-3">
              <button 
                onClick={reset}
                className="w-full bg-blue-500 text-white py-3 rounded-full font-semibold"
              >
                Take Another Photo
              </button>
              <button 
                onClick={onBack}
                className="w-full bg-gray-600 text-white py-3 rounded-full font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
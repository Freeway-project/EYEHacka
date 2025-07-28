'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, Camera, Flashlight, CheckCircle, AlertCircle } from 'lucide-react'
import axios from 'axios'

interface FlashlightTestProps {
  onBack: () => void
  apiEndpoint?: string
}

type TestPhase = 'setup' | 'ready' | 'capturing' | 'captured'

export default function FlashlightTest({ onBack, apiEndpoint = '/api/flashlight-test' }: FlashlightTestProps) {
  const [phase, setPhase] = useState<TestPhase>('setup')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize camera
  const initializeCamera = async () => {
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
      setPhase('ready')
    } catch (err) {
      const error = err as DOMException
      console.error('Camera error:', error)
      setError('Unable to access camera. Please check permissions.')
    }
  }

  // Capture photo with flash
  const capturePhoto = async () => {
    if (!streamRef.current || !videoRef.current || !canvasRef.current) return
    
    setPhase('capturing')
    setError(null)
    
    try {
      // Enable flash
      const track = streamRef.current.getVideoTracks()[0]
      let flashEnabled = false
      
      if (track) {
        const capabilities = track.getCapabilities()
        if ('torch' in capabilities && capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: true } as MediaTrackConstraintSet]
          })
          flashEnabled = true
        }
      }

      // Wait for flash to activate
      await new Promise(resolve => setTimeout(resolve, 300))

      // Capture the photo
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        
        // Turn off flash
        if (flashEnabled && track) {
          await track.applyConstraints({
            advanced: [{ torch: false } as MediaTrackConstraintSet]
          })
        }
        
        // Convert to blob and display
        canvas.toBlob(async (blob) => {
          if (blob) {
            const photoUrl = URL.createObjectURL(blob)
            setCapturedPhoto(photoUrl)
            setPhase('captured')
            
            // Send to API
            await sendToAPI(blob)
          }
        }, 'image/jpeg', 0.9)
      }
    } catch (err) {
      console.error('Capture error:', err)
      setError('Failed to capture photo')
      setPhase('ready')
    }
  }

  // Send photo to API
  const sendToAPI = async (photoBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('photo', photoBlob, 'flashlight-test.jpg')
      formData.append('timestamp', new Date().toISOString())
      formData.append('test_type', 'flashlight_reflex')
      
      const response = await axios.post(apiEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
      
      setApiResponse(response.data)
    } catch (err) {
      const error = err as any
      console.error('API error:', error)
      if (error.code === 'ECONNABORTED') {
        setError('Request timeout. Please try again.')
      } else if (error.response) {
        setError(`Server error: ${error.response.status}`)
      } else {
        setError('Network error. Please check connection.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Cleanup
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto)
    }
  }

  // Reset for new capture
  const resetCapture = () => {
    cleanup()
    setCapturedPhoto(null)
    setApiResponse(null)
    setError(null)
    setPhase('setup')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe bg-gray-800">
        <header className="flex items-center py-4">
          <button 
            onClick={() => { cleanup(); onBack(); }}
            className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <Flashlight className="w-8 h-8 text-yellow-400 mr-3" />
          <span className="text-xl font-semibold text-white">Flashlight Test</span>
        </header>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {phase === 'setup' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center space-y-6 px-4">
              <Camera className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Ready to Test</h2>
                <p className="text-gray-300">Position device 30-40cm from face</p>
                <p className="text-gray-400 text-sm mt-2">Flash will activate automatically</p>
              </div>
              <button 
                onClick={initializeCamera}
                className="bg-yellow-500 text-black px-8 py-3 rounded-full font-semibold hover:bg-yellow-400 transition-colors"
              >
                Start Camera
              </button>
            </div>
          </div>
        )}

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
            
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="text-center">
                <div className="bg-black bg-opacity-50 px-4 py-2 rounded-full inline-block">
                  <span className="text-white font-medium">Look directly at camera</span>
                </div>
              </div>

              {/* Face Guide */}
              <div className="flex-1 flex items-center justify-center">
                <div className="border-2 border-white border-dashed rounded-full w-40 h-40 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Face Here</span>
                </div>
              </div>

              {/* Capture Button */}
              <div className="text-center">
                <button 
                  onClick={capturePhoto}
                  className="bg-yellow-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors flex items-center mx-auto space-x-2"
                >
                  <Flashlight className="w-6 h-6" />
                  <span>Capture with Flash</span>
                </button>
              </div>
            </div>
          </>
        )}

        {phase === 'capturing' && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Flashlight className="w-8 h-8 text-yellow-800" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Capturing...</h2>
              <p className="text-gray-600">Keep still</p>
            </div>
          </div>
        )}

        {phase === 'captured' && capturedPhoto && (
          <div className="absolute inset-0 bg-gray-900 overflow-auto">
            <div className="p-4 space-y-6">
              {/* Captured Photo */}
              <div className="bg-white rounded-lg overflow-hidden">
                <img 
                  src={capturedPhoto} 
                  alt="Captured photo" 
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Photo captured successfully</span>
                  </div>
                </div>
              </div>

              {/* API Status */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">API Status</h3>
                {isProcessing ? (
                  <div className="flex items-center space-x-3 text-blue-400">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span>Sending to server...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                ) : apiResponse ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Successfully sent to API</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 mt-3">
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap overflow-auto">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400">No API response yet</div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={resetCapture}
                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-full font-medium hover:bg-blue-600 transition-colors"
                >
                  Take Another Photo
                </button>
                <button 
                  onClick={() => { cleanup(); onBack(); }}
                  className="w-full bg-gray-600 text-white py-3 px-6 rounded-full font-medium hover:bg-gray-500 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
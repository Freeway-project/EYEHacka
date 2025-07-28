'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle, Flashlight } from 'lucide-react'
import axios from 'axios'

interface FlashlightTestProps {
  onBack: () => void
  apiEndpoint?: string
}

type TestPhase = 'intro' | 'permission' | 'instructions' | 'countdown' | 'capture' | 'processing' | 'complete'

export default function FlashlightTest({ onBack, apiEndpoint = '/api/flashlight-test' }: FlashlightTestProps) {
  const [phase, setPhase] = useState<TestPhase>('intro')
  const [countdown, setCountdown] = useState(5)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Request camera permission with rear camera and flash
  const requestCameraPermission = async () => {
    setPhase('permission')
    setPermissionError(null)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' }, // Rear camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      streamRef.current = stream
      setHasPermission(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      setPhase('instructions')
    } catch (err: any) {
      console.error('Camera permission error:', err)
      if (err.name === 'NotAllowedError') {
        setPermissionError('Camera access denied. Please allow camera permission.')
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No rear camera found. Please ensure your device has a rear camera.')
      } else if (err.name === 'OverconstrainedError') {
        // Fallback to any available camera
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment', // Try rear camera without exact constraint
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          })
          streamRef.current = fallbackStream
          setHasPermission(true)
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream
          }
          setPhase('instructions')
        } catch (fallbackErr) {
          setPermissionError('Unable to access rear camera. Using default camera.')
        }
      } else {
        setPermissionError('Unable to access camera. Please check your device settings.')
      }
    }
  }

  // Start countdown
  const startCountdown = () => {
    setPhase('countdown')
    setCountdown(5)
  }

  // Countdown effect
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
    
    try {
      // Enable flash if available
      const track = streamRef.current?.getVideoTracks()[0]
      if (track) {
        const capabilities = track.getCapabilities()
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: true } as any]
          })
        }
      }

      // Small delay to ensure flash is on
      await new Promise(resolve => setTimeout(resolve, 200))

      // Capture the photo
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const video = videoRef.current
        
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          
          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              const photoUrl = URL.createObjectURL(blob)
              setCapturedPhoto(photoUrl)
              
              // Turn off flash
              if (track && capabilities.torch) {
                await track.applyConstraints({
                  advanced: [{ torch: false } as any]
                })
              }
              
              // Send to API
              await sendPhotoToAPI(blob)
            }
          }, 'image/jpeg', 0.9)
        }
      }
    } catch (err) {
      console.error('Capture error:', err)
      setError('Failed to capture photo')
      setPhase('complete')
    }
  }

  // Send photo to API
  const sendPhotoToAPI = async (photoBlob: Blob) => {
    setIsProcessing(true)
    setPhase('processing')
    
    try {
      const formData = new FormData()
      formData.append('photo', photoBlob, 'flashlight-test.jpg')
      formData.append('timestamp', new Date().toISOString())
      formData.append('test_type', 'flashlight_reflex')
      
      const response = await axios.post(apiEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      })
      
      setApiResponse(response.data)
      setPhase('complete')
    } catch (err: any) {
      console.error('API call error:', err)
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please try again.')
      } else if (err.response) {
        setError(`Server error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`)
      } else {
        setError('Network error. Please check your connection.')
      }
      setPhase('complete')
    } finally {
      setIsProcessing(false)
    }
  }

  // Cleanup camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto)
      }
    }
  }, [capturedPhoto])

  // Reset function
  const resetTest = () => {
    setCapturedPhoto(null)
    setApiResponse(null)
    setError(null)
    setCountdown(5)
    setPhase('intro')
    stopCamera()
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex flex-col">
        <div className="px-4 pt-safe">
          <header className="flex items-center py-4">
            <button onClick={onBack} className="mr-3 p-2 -ml-2 rounded-full hover:bg-white/50 transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Flashlight className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 mr-3" />
            <span className="text-lg sm:text-xl font-semibold">Flashlight Test</span>
          </header>
        </div>

        <div className="flex-1 px-4 pb-safe">
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 text-orange-800">Pupil Light Reflex Test</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                This test uses the camera flash to assess pupil light reflex, which can help detect vision problems and neurological issues.
              </p>
            </div>

            <div className="bg-orange-100 rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-3 text-sm sm:text-base text-orange-800">What to Expect</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-orange-700">
                <li>• Position the device 30-40cm from the patient's face</li>
                <li>• Look directly at the rear camera</li>
                <li>• A bright flash will activate automatically</li>
                <li>• The photo will be analyzed for pupil response</li>
              </ul>
            </div>

            <div className="bg-red-100 rounded-2xl p-4 sm:p-6 border border-red-200">
              <h3 className="font-semibold mb-3 text-red-800 text-sm sm:text-base">⚠️ Important</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-red-700">
                <li>• Ensure the room is dimly lit</li>
                <li>• Remove glasses if wearing any</li>
                <li>• The flash may be bright - this is normal</li>
                <li>• Keep eyes open during the flash</li>
              </ul>
            </div>

            <button 
              onClick={requestCameraPermission}
              className="w-full bg-orange-500 text-white py-4 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-orange-600 active:scale-95 transition-all"
            >
              Start Flashlight Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'permission') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-safe">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <Camera className="w-16 h-16 text-orange-500 mx-auto" />
          
          {permissionError ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold text-red-600">Camera Access Required</h2>
                <p className="text-center text-gray-700 text-sm sm:text-base">
                  {permissionError}
                </p>
              </div>
              <div className="space-y-3 w-full">
                <button 
                  onClick={requestCameraPermission}
                  className="w-full bg-orange-500 text-white py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-orange-600 active:scale-95 transition-all"
                >
                  Try Again
                </button>
                <button 
                  onClick={onBack}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-gray-300 active:scale-95 transition-all"
                >
                  Back
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold">Requesting Camera Access</h2>
                <p className="text-center text-gray-700 text-sm sm:text-base">
                  Please allow rear camera access to continue with the test.
                </p>
              </div>
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-4 pt-safe">
          <header className="flex items-center py-4">
            <button onClick={() => setPhase('intro')} className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Flashlight className="w-6 h-6 text-orange-600 mr-2" />
            <span className="text-lg sm:text-xl font-semibold">Position Setup</span>
          </header>
        </div>

        <div className="flex-1 px-4 pb-safe">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Get Ready</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Position yourself properly for the flashlight test
              </p>
            </div>

            {/* Camera Preview */}
            <div className="bg-black rounded-2xl p-2 aspect-[3/4] relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed rounded-full w-32 h-32 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Face Area</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-3 text-sm sm:text-base text-orange-800">Instructions</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-orange-700">
                <li>• Hold device steady, 30-40cm from face</li>
                <li>• Look directly at the camera lens</li>
                <li>• Keep both eyes open</li>
                <li>• Stay still during the countdown</li>
                <li>• The flash will activate automatically</li>
              </ul>
            </div>

            <button 
              onClick={startCountdown}
              className="w-full bg-orange-500 text-white py-4 px-6 rounded-full font-medium text-sm sm:text-base hover:bg-orange-600 active:scale-95 transition-all"
            >
              Ready - Start Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Camera Preview */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Countdown Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-black bg-opacity-50 rounded-full w-32 h-32 flex items-center justify-center mb-8">
              <span className="text-white text-6xl font-bold">{countdown}</span>
            </div>
            
            <div className="bg-orange-500 px-6 py-3 rounded-full">
              <span className="text-white font-semibold text-lg">Look at the camera</span>
            </div>
            
            <div className="mt-4 bg-black bg-opacity-70 px-4 py-2 rounded-full">
              <span className="text-white text-sm">Flash will activate automatically</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'capture') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Flashlight className="w-8 h-8 text-yellow-800" />
          </div>
          <h2 className="text-xl font-semibold">Capturing Photo...</h2>
          <p className="text-gray-600">Please keep still</p>
        </div>
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4 pb-safe">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          
          <h1 className="text-xl sm:text-2xl font-bold text-blue-800">Processing Photo</h1>
          
          <div className="bg-white rounded-lg p-4 sm:p-6">
            <p className="text-blue-700 font-medium mb-2 text-sm sm:text-base">🔍 Analyzing pupil light reflex...</p>
            <p className="text-blue-600 text-xs sm:text-sm">This may take a few moments</p>
          </div>

          {capturedPhoto && (
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Photo captured successfully</span>
              </div>
              <img 
                src={capturedPhoto} 
                alt="Captured test photo" 
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 pb-safe">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800">Test Complete!</h1>
          
          {/* Results */}
          <div>
            {error ? (
              <div className="bg-red-100 rounded-lg p-4 sm:p-6">
                <p className="text-red-800 font-medium text-sm sm:text-base">❌ Error occurred</p>
                <p className="text-red-600 text-xs sm:text-sm mt-1">{error}</p>
              </div>
            ) : apiResponse ? (
              <div className="bg-green-100 rounded-lg p-4 sm:p-6">
                <p className="text-green-800 font-medium text-sm sm:text-base">✅ Analysis completed!</p>
                <div className="mt-2 text-left">
                  <pre className="text-xs text-green-700 whitespace-pre-wrap">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-100 rounded-lg p-4 sm:p-6">
                <p className="text-yellow-800 font-medium text-sm sm:text-base">⚠️ Test completed</p>
                <p className="text-yellow-600 text-xs sm:text-sm">No response from server</p>
              </div>
            )}
          </div>
          
          {capturedPhoto && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start space-x-2 text-sm text-gray-600 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm">Test photo captured</span>
              </div>
              <img 
                src={capturedPhoto} 
                alt="Test result" 
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="space-y-3 w-full">
            <button 
              onClick={resetTest}
              className="w-full bg-blue-500 text-white py-3 px-8 rounded-full font-medium text-sm sm:text-base hover:bg-blue-600 active:scale-95 transition-all"
            >
              Run Another Test
            </button>
            
            <button 
              onClick={onBack}
              className="w-full bg-green-500 text-white py-3 px-8 rounded-full font-medium text-sm sm:text-base hover:bg-green-600 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Hidden canvas for photo capture
  return (
    <div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
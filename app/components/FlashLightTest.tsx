'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, Flashlight } from 'lucide-react'

interface FlashlightTestProps {
  onBack: () => void
  apiEndpoint?: string
}

type TestPhase = 'ready' | 'countdown' | 'capture' | 'result' | 'error'

// Photo Result Component
function PhotoResult({ photoUrl, onRetake, onBack, analysisResult, isAnalyzing }: { 
  photoUrl: string
  onRetake: () => void 
  onBack: () => void 
  analysisResult: any
  isAnalyzing: boolean
}) {
  const getResultDisplay = () => {
    if (isAnalyzing) {
      return {
        status: 'analyzing',
        title: 'Analyzing...',
        message: 'Please wait while we analyze your flashlight test',
        color: 'blue'
      }
    }
    
    if (!analysisResult) {
      return {
        status: 'waiting',
        title: 'Processing...',
        message: 'Preparing analysis',
        color: 'gray'
      }
    }
    
    if (!analysisResult.success) {
      return {
        status: 'error',
        title: 'Analysis Failed',
        message: analysisResult.message || 'An error occurred during analysis',
        color: 'red'
      }
    }
    
    // Handle different result structures
    const result = analysisResult.result
    if (typeof result === 'boolean') {
      return {
        status: result ? 'normal' : 'abnormal',
        title: result ? 'Normal Result' : 'Abnormal Result',
        message: analysisResult.message || (result 
          ? 'Normal pupil light reflex detected' 
          : 'Abnormal pupil light reflex - recommend further evaluation'),
        color: result ? 'green' : 'orange'
      }
    }
    
    // Handle object result
    if (typeof result === 'object' && result !== null) {
      const isNormal = result.normal || result.status === 'normal'
      return {
        status: isNormal ? 'normal' : 'abnormal',
        title: isNormal ? 'Normal Result' : 'Abnormal Result',
        message: result.message || analysisResult.message || 'Analysis completed',
        color: isNormal ? 'green' : 'orange'
      }
    }
    
    // Fallback
    return {
      status: 'unknown',
      title: 'Analysis Complete',
      message: 'Results are available',
      color: 'gray'
    }
  }
  
  const resultDisplay = getResultDisplay()
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-3 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200" title="Go back">
              <ArrowLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Flash Test Results</h2>
          </div>
          <div className={`px-3 py-1 rounded-full ${
            resultDisplay.color === 'green' ? 'bg-green-100' :
            resultDisplay.color === 'orange' ? 'bg-orange-100' :
            resultDisplay.color === 'red' ? 'bg-red-100' :
            resultDisplay.color === 'blue' ? 'bg-blue-100' :
            'bg-gray-100'
          }`}>
            <span className={`text-sm font-medium ${
              resultDisplay.color === 'green' ? 'text-green-800' :
              resultDisplay.color === 'orange' ? 'text-orange-800' :
              resultDisplay.color === 'red' ? 'text-red-800' :
              resultDisplay.color === 'blue' ? 'text-blue-800' :
              'text-gray-800'
            }`}>
              {isAnalyzing ? '🔄 Analyzing' :
               resultDisplay.status === 'normal' ? '✓ Normal' :
               resultDisplay.status === 'abnormal' ? '⚠ Abnormal' :
               resultDisplay.status === 'error' ? '❌ Error' :
               '📄 Complete'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Photo Display */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-700">Flashlight Test Photo</h3>
            <p className="text-sm text-gray-500">Captured: {new Date().toLocaleString()}</p>
          </div>
          <div className="p-4 flex items-center justify-center bg-gray-100 min-h-96">
            <img
              src={photoUrl}
              alt="Flashlight test result"
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm scale-x-[-1]"
            />
          </div>
          
          {/* Analysis Results */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-2">{resultDisplay.title}</h4>
              <p className="text-gray-600 mb-4">{resultDisplay.message}</p>
              
              {isAnalyzing && (
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-blue-600">Analyzing photo...</span>
                </div>
              )}
              
              {analysisResult && !isAnalyzing && (
                <div className="text-sm text-gray-500 space-y-1">
                  {analysisResult.confidence && (
                    <p>Confidence: {Math.round(analysisResult.confidence * 100)}%</p>
                  )}
                  {analysisResult.fallback && (
                    <p className="text-orange-600">⚠ Demo mode - API unavailable</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        {!isAnalyzing && (
          <>
            <button 
              onClick={onRetake}
              className="w-full bg-blue-500 text-white py-3 rounded-full font-semibold hover:bg-blue-600 active:bg-blue-700 transition-colors"
            >
              Take Another Photo
            </button>
            <button 
              onClick={onBack}
              className="w-full bg-gray-500 text-white py-3 rounded-full font-semibold hover:bg-gray-600 active:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </>
        )}
        {isAnalyzing && (
          <div className="text-center text-gray-500 py-3">
            <p>Please wait for analysis to complete...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FlashlightTest({ onBack, apiEndpoint = 'https://eyehacka.onrender.com/api/detect' }: FlashlightTestProps) {
  const [phase, setPhase] = useState<TestPhase>('ready')
  const [countdown, setCountdown] = useState(5)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize rear camera with better mobile support
  useEffect(() => {
    const initCamera = async () => {
      try {
        setError(null)
        
        // More comprehensive constraints for mobile devices
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { exact: 'environment' }, // Force rear camera
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        }

        // Fallback constraints if exact rear camera fails
        const fallbackConstraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment', // Prefer rear camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        }

        let stream: MediaStream
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (err) {
          console.warn('Exact rear camera failed, trying fallback:', err)
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
        }
        
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          // Wait for video to load with better event handling
          const video = videoRef.current
          
          const handleLoadedMetadata = () => {
            console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight)
            setCameraReady(true)
          }
          
          const handleCanPlay = () => {
            console.log('Video can play')
            // Double check dimensions are available
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setCameraReady(true)
            }
          }
          
          // Handle video errors
          const handleVideoError = (e: Event) => {
            console.error('Video error:', e)
            setError('Failed to load camera feed')
            setPhase('error')
          }
          
          video.addEventListener('loadedmetadata', handleLoadedMetadata)
          video.addEventListener('canplay', handleCanPlay)
          video.addEventListener('error', handleVideoError)
          
          // Cleanup function for event listeners
          const cleanup = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('canplay', handleCanPlay)
            video.removeEventListener('error', handleVideoError)
          }
          
          // Store cleanup function for later use
          ;(video as any)._cleanup = cleanup
        }
        
      } catch (err) {
        console.error('Camera initialization error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown camera error'
        
        if (errorMessage.includes('NotFoundError') || errorMessage.includes('DevicesNotFoundError')) {
          setError('No camera found on this device')
        } else if (errorMessage.includes('NotAllowedError') || errorMessage.includes('PermissionDeniedError')) {
          setError('Camera permission denied. Please allow camera access and refresh.')
        } else if (errorMessage.includes('NotSupportedError')) {
          setError('Camera not supported on this device')
        } else {
          setError('Failed to access camera: ' + errorMessage)
        }
        setPhase('error')
      }
    }
    
    // Only initialize camera if not showing result
    if (!showResult) {
      initCamera()
    }
    
    return () => {
      // Clean up video event listeners
      if (videoRef.current && (videoRef.current as any)._cleanup) {
        ;(videoRef.current as any)._cleanup()
      }
      
      // Clean up media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [showResult])

  // Start countdown with additional validation
  const startCountdown = () => {
    if (!cameraReady) {
      setError('Camera not ready yet')
      return
    }
    
    // Additional check for video readiness
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Video feed not ready. Please wait a moment and try again.')
      return
    }
    
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

  // Capture photo with improved mobile flash handling
  const capturePhoto = async () => {
    setPhase('capture')

    if (!streamRef.current || !videoRef.current || !canvasRef.current) {
      setError('Camera components not ready')
      setPhase('error')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    // Wait for video to be ready
    let attempts = 0
    while (
      attempts < 10 &&
      (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2)
    ) {
      await new Promise((r) => setTimeout(r, 100))
      attempts++
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Video not ready for capture. Please try again.')
      setPhase('ready')
      return
    }

    try {
      // Enable torch/flash if available
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities ? track.getCapabilities() : {}
      
      if ('torch' in capabilities) {
        try {
          await track.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: true }]
          })
          // Keep flash on for a moment
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (e) {
          console.warn('Torch not available:', e)
        }
      }

      // Mirror the canvas draw to match your mirrored <video>
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      ctx.save()
      ctx.scale(-1, 1) // flip horizontally
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
      ctx.restore()

      // Turn off torch
      if ('torch' in capabilities) {
        try {
          await track.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: false }]
          })
        } catch (e) {
          console.warn('Failed to turn off torch:', e)
        }
      }

      // Use a Promise to await toBlob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      })
      if (!blob) {
        setError('Failed to create photo blob')
        setPhase('error')
        return
      }

      // Revoke any previous URL to avoid leaks
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto)
      }
      const photoUrl = URL.createObjectURL(blob)
      setCapturedPhoto(photoUrl)
      
      // Important: Set phase to result before showing result
      setPhase('result')
      
      // Small delay to show capture animation
      setTimeout(() => {
        setShowResult(true)
        sendToAPI(blob)
      }, 500)

    } catch (err) {
      console.error('Capture failed:', err)
      setError(`Failed to capture photo: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setPhase('error')
    }
  }

  // Send photo to API for analysis
  const sendToAPI = async (photoBlob: Blob) => {
    console.log('📸 Sending photo to API for analysis...')
    setIsAnalyzing(true)
    
    try {
      const formData = new FormData()
      formData.append('photo', photoBlob, 'flashlight-test.jpg')

      console.log('📡 Calling API endpoint:', apiEndpoint)
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      })

      console.log(`📡 API response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Analysis result received:', result)
      
      setAnalysisResult(result)
      
    } catch (error) {
      console.error('❌ API call failed:', error)
      
      // Set fallback result on error
      setAnalysisResult({
        success: false,
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        fallback: true
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Reset with cleanup
  const reset = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto)
    }
    setCapturedPhoto(null)
    setCountdown(5)
    setError(null)
    setPhase('ready')
    setShowResult(false)
    setCameraReady(false)
    setIsAnalyzing(false)
    setAnalysisResult(null)
  }

  // Handle retake from result screen
  const handleRetake = () => {
    reset()
  }

  // Retry camera initialization
  const retryCamera = () => {
    setError(null)
    setPhase('ready')
    setCameraReady(false)
    window.location.reload()
  }

  // If showing result, render the PhotoResult component
  if (showResult && capturedPhoto) {
    return (
      <PhotoResult 
        photoUrl={capturedPhoto}
        onRetake={handleRetake}
        onBack={onBack}
        analysisResult={analysisResult}
        isAnalyzing={isAnalyzing}
      />
    )
  }

  // Main camera interface
  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-center py-3">
          <button onClick={onBack} className="mr-3 p-2 rounded-full hover:bg-gray-800 active:bg-gray-700" title="Go back">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <Flashlight className="w-7 h-7 text-yellow-400 mr-2" />
          <span className="text-lg font-semibold text-white">Flash Test</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {phase === 'error' && (
          <div className="absolute inset-0 bg-red-900 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <div className="text-6xl mb-4">⚠️</div>
              <div className="text-white text-xl font-bold mb-4">Camera Error</div>
              <div className="text-red-200 mb-6 text-sm">{error}</div>
              <div className="space-y-3">
                <button 
                  onClick={retryCamera}
                  className="w-full bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-500 active:bg-red-700"
                >
                  Retry Camera
                </button>
                <button 
                  onClick={onBack}
                  className="w-full bg-gray-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-500 active:bg-gray-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {(phase === 'ready' || phase === 'countdown') && (
          <>
            {/* Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Mirror for better UX
            />
            
            {/* Camera Status Overlay */}
            {phase === 'ready' && !cameraReady && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin text-4xl mb-4">📹</div>
                  <div className="text-lg">Loading camera...</div>
                </div>
              </div>
            )}
            
            {/* Start Button */}
            {phase === 'ready' && cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={startCountdown}
                  className="bg-yellow-500 text-black px-8 py-4 rounded-full font-bold text-xl hover:bg-yellow-400 active:bg-yellow-600 transition-colors shadow-lg"
                >
                  Start Flash Test
                </button>
              </div>
            )}

            {/* Countdown Overlay */}
            {phase === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                <div className="text-center">
                  <div className="mb-8">
                    <div className="text-white text-2xl font-semibold mb-2 animate-pulse">
                      GET READY
                    </div>
                    <div className="text-white text-lg opacity-90">
                      Flash photo in...
                    </div>
                  </div>
                  <div className="relative">
                    <div className="text-white font-bold mb-6" style={{ fontSize: '120px', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
                      {countdown}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border-8 border-white opacity-30 animate-ping"></div>
                    </div>
                  </div>
                  <div className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold text-lg animate-pulse">
                    📸 FLASH COMING!
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'capture' && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">📸</div>
              <div className="text-2xl font-bold text-gray-800">Capturing...</div>
            </div>
          </div>
        )}

        {phase === 'result' && !showResult && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <div className="text-lg text-white">Processing photo...</div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
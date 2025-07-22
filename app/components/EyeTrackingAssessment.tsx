'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { useVideoRecording } from '@/hooks/videorec'


interface EyeTrackingAssessmentProps {
  onBack: () => void
}

type AssessmentPhase = 'intro' | 'positioning' | 'permission' | 'countdown' | 'assessment' | 'complete'

export default function EyeTrackingAssessment({ onBack }: EyeTrackingAssessmentProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [toyPosition, setToyPosition] = useState(0)
  const [assessmentTime, setAssessmentTime] = useState(0)
  const [savedFilename, setSavedFilename] = useState<string | null>(null)
  
  const {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    videoPreview
  } = useVideoRecording()

  // Handle camera permission check
  const requestPermission = async () => {
    setPhase('permission')
    await startRecording()
    
    // If permission granted, stop immediately and go to countdown
    if (hasPermission) {
      await stopRecording()
      setTimeout(() => setPhase('countdown'), 500)
    }
  }

  // Countdown effect
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('assessment')
      startAssessment()
    }
  }, [phase, countdown])

  // Start assessment with recording
  const startAssessment = async () => {
    await startRecording()
    
    const duration = 10000 // 10 seconds
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Create smooth left-to-right and right-to-left movement
      // Using sine wave to create smooth back and forth motion
      // Two complete cycles in 10 seconds (left->right->left->right)
      const cycles = 2
      const sineValue = Math.sin(progress * Math.PI * cycles)
      
      // Convert sine wave (-1 to 1) to position (5% to 85% of screen width)
      // This ensures toy stays visible and moves from edge to edge
      const position = ((sineValue + 1) / 2) * 80 + 5
      
      setToyPosition(position)
      setAssessmentTime(Math.floor(elapsed / 1000))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        completeAssessment()
      }
    }
    
    animate()
  }

  // Complete assessment
  const completeAssessment = async () => {
    const filename = await stopRecording()
    setSavedFilename(filename)
    setPhase('complete')
  }

  if (phase === 'intro') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center mb-6">
          <button onClick={onBack} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Eye Tracking Assessment</h1>
        </header>

        <div className="bg-blue-100 rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Welcome to Infant Assessment</h2>
          <p className="text-gray-700 mb-4">
            The child interacts with the animation and we help you screen for Lazy eye, crossed eyes, etc.
          </p>
        </div>

        <div className="bg-gray-100 rounded-3xl p-6 mb-8">
          <h3 className="font-semibold mb-3">Instructions for Caregivers</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Ensure the infant is comfortably seated.</li>
            <li>• Guide their attention towards the screen.</li>
            <li>• Adjust the volume to a gentle level.</li>
          </ul>
        </div>

        <div className="flex space-x-4 mb-6">
          <button 
            onClick={() => setPhase('positioning')}
            className="flex-1 bg-blue-200 text-blue-800 py-3 px-6 rounded-full font-medium"
          >
            Start
          </button>
          <button 
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
          >
            Home
          </button>
        </div>

        <div className="bg-gray-100 rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Activities</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🚂</div>
              <p className="text-sm font-medium">Eye Tracking Assessment</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">👀</div>
              <p className="text-sm font-medium">The Flash Test</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'permission') {
    return (
      <div className="p-4 min-h-screen bg-white flex flex-col items-center justify-center">
        <Camera className="w-16 h-16 text-blue-500 mb-6" />
        
        {permissionError ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-4">Camera Access Required</h2>
            <p className="text-center text-gray-700 mb-6 px-4">
              {permissionError}
            </p>
            <div className="space-y-3 w-full max-w-sm">
              <button 
                onClick={requestPermission}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-full font-medium"
              >
                Try Again
              </button>
              <button 
                onClick={() => setPhase('intro')}
                className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-full font-medium"
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">Requesting Camera Access</h2>
            <p className="text-center text-gray-700 mb-6">
              Please allow camera access to continue with the assessment.
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </>
        )}
      </div>
    )
  }

  if (phase === 'positioning') {
    return (
      <div className="p-4 min-h-screen bg-white">
        <header className="flex items-center mb-6">
          <button onClick={() => setPhase('intro')} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Distance to Face</h1>
        </header>

        <p className="text-center text-lg mb-8">
          Please ensure that the camera is <strong>40 cm away</strong> from your face.
        </p>

        <div className="bg-gray-200 rounded-3xl p-4 mb-8" style={{ aspectRatio: '3/4' }}>
          <div className="bg-black rounded-2xl h-full flex flex-col justify-between p-4">
            <div className="text-center">
              <div className="bg-gray-800 text-red-400 px-4 py-2 rounded-full text-sm inline-block">
                Bring your face inside the box
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        </div>

        <button 
          onClick={() => setPhase('countdown')}
          className="w-full bg-gray-300 text-gray-700 py-4 px-6 rounded-full font-medium text-lg"
        >
          Proceed
        </button>
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-8xl font-bold">
          {countdown || 'GO!'}
        </div>
      </div>
    )
  }

  if (phase === 'assessment') {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Moving toy */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
          style={{ 
            left: `${toyPosition}%`,
            transition: 'none' // Remove CSS transition for smoother animation
          }}
        >
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-3xl shadow-lg">
            🚂
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 text-white">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Recording {assessmentTime}s</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-700 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-1000"
              style={{ width: `${(assessmentTime / 10) * 100}%` }}
            ></div>
          </div>
          <div className="text-white text-center text-sm mt-2">
            {10 - assessmentTime} seconds remaining
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className="p-4 min-h-screen bg-green-50 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-green-800 mb-4">All Clear!</h1>
        <p className="text-gray-700 mb-4 text-center">
          No significant risk factors were detected.
        </p>
        
        {savedFilename && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Assessment video downloaded:</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">{savedFilename}</p>
            <p className="text-xs text-gray-400 mt-1">
              Check your device Downloads folder
            </p>
          </div>
        )}
        
        <div className="space-y-3 w-full max-w-sm">
          <button 
            onClick={() => {
              // Reset states for new assessment
              setPhase('intro')
              setCountdown(3)
              setToyPosition(0)
              setAssessmentTime(0)
              setSavedFilename(null)
            }}
            className="w-full bg-blue-500 text-white py-3 px-8 rounded-full font-medium"
          >
            New Assessment
          </button>
          
          <button 
            onClick={onBack}
            className="w-full bg-green-500 text-white py-3 px-8 rounded-full font-medium"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return null
}
// Updated EyeTrackingAssessment with face compression
'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { useVideoRecording } from '@/hooks/videorec'
import { useOptimizedEyeTracking } from '@/hooks/face-compression'
import AnalysisResults from './EyeTrackingAnalysis'

interface EyeTrackingAssessmentProps {
  onBack: () => void
}

type AssessmentPhase = 'intro' | 'consent' | 'positioning' | 'permission' | 'countdown' | 'assessment' | 'complete'

export default function EyeTrackingAssessment({ onBack }: EyeTrackingAssessmentProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [assessmentTime, setAssessmentTime] = useState(0)
  const [savedFilename, setSavedFilename] = useState<string | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up' | 'down'>('center')
  const [compressionStats, setCompressionStats] = useState<{
    originalSize?: number
    compressedSize?: number
    compressionRatio?: number
  }>({})
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  
  // Original video recording hook
  const {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    videoPreview,
    videoStream,
    analysisResults,
    isAnalyzing,
    setAnalysisResults
  } = useVideoRecording()

  // New optimized face recording hook
  const {
    startOptimizedRecording,
    stopOptimizedRecording,
    canvasRef
  } = useOptimizedEyeTracking()

  // Handle camera permission check
  const requestPermission = async () => {
    setPhase('permission')
    await startRecording()
    
    if (hasPermission) {
      await stopRecording()
      setTimeout(() => setPhase('countdown'), 500)
    }
  }

  // Set up video stream for display
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream
    }
  }, [videoStream])

  // Log analysis results
  useEffect(() => {
    if (analysisResults) {
      console.log('🎉 ANALYSIS RESULTS RECEIVED!')
      console.log('═══════════════════════════════════')
      console.log('📹 Video Info:', analysisResults.video_info)
      console.log('🔍 Analysis:', analysisResults.analysis)
      console.log('⚠️ Risk Assessment:', analysisResults.risk_assessment)
      console.log('📊 Compression Stats:', compressionStats)
      console.log('═══════════════════════════════════')
    }
  }, [analysisResults, compressionStats])

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

  // Start assessment with optimized recording
  const startAssessment = async () => {
    // Start both regular recording (fallback) and optimized face recording
    await startRecording()
    
    // Try to start face-only recording
    if (videoRef.current) {
      const optimizedStarted = await startOptimizedRecording(videoRef.current)
      console.log('Optimized face recording:', optimizedStarted ? 'Started' : 'Fallback to full video')
    }
    
    const duration = 20000 // 20 seconds
    const startTime = Date.now()
    
    const eyeSequence = ['center', 'left', 'right', 'up', 'down'] as const
    let sequenceIndex = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Change eye direction every 4 seconds
      const currentSequenceIndex = Math.floor((elapsed / 4000)) % eyeSequence.length
      if (currentSequenceIndex !== sequenceIndex) {
        sequenceIndex = currentSequenceIndex
        setEyeDirection(eyeSequence[sequenceIndex])
      }
      
      setAssessmentTime(Math.floor(elapsed / 1000))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        completeAssessment()
      }
    }
    
    animate()
  }

  // Complete assessment with compression
  const completeAssessment = async () => {
    console.log('🏁 Assessment completed, stopping recording...')
    
    // Stop both recordings
    const [regularFilename, optimizedResult] = await Promise.all([
      stopRecording(),
      stopOptimizedRecording()
    ])

    if (optimizedResult) {
      // Calculate compression stats
      const originalBlob = await fetch(regularFilename).then(r => r.blob()).catch(() => ({ size: 0 }))
      const compressionRatio = originalBlob.size > 0 ? 
        ((originalBlob.size - optimizedResult.size) / originalBlob.size * 100).toFixed(1) : 0

      setCompressionStats({
        originalSize: originalBlob.size,
        compressedSize: optimizedResult.size,
        compressionRatio: parseFloat(compressionRatio)
      })

      // Create download for optimized video
      const optimizedUrl = URL.createObjectURL(
        optimizedResult.type === 'face-video' ? optimizedResult.data : 
        new Blob(optimizedResult.data.map(f => f.blob), { type: 'application/json' })
      )
      
      const optimizedFilename = `eye_tracking_optimized_${Date.now()}.${
        optimizedResult.type === 'face-video' ? 'webm' : 'json'
      }`
      
      // Download optimized version
      const a = document.createElement('a')
      a.href = optimizedUrl
      a.download = optimizedFilename
      a.click()
      
      setSavedFilename(optimizedFilename)
      console.log('💾 Optimized video saved:', optimizedFilename)
      console.log(`📊 Compression: ${compressionRatio}% size reduction`)
    } else {
      setSavedFilename(regularFilename)
      console.log('💾 Regular video saved:', regularFilename)
    }
    
    setPhase('complete')
  }

  // ... (keep all the existing phase rendering logic until 'complete' phase)

  if (phase === 'complete') {
    return (
      <div className="p-4 min-h-screen bg-green-50 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-green-800 mb-4">Assessment Complete!</h1>
        
        {/* Compression Stats */}
        {compressionStats.compressionRatio && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">📊 Optimization Results</h3>
            <div className="text-sm space-y-1">
              <p>Original size: {(compressionStats.originalSize / 1024 / 1024).toFixed(1)} MB</p>
              <p>Optimized size: {(compressionStats.compressedSize / 1024 / 1024).toFixed(1)} MB</p>
              <p className="font-medium text-green-600">
                Size reduction: {compressionStats.compressionRatio}%
              </p>
            </div>
          </div>
        )}
        
        {/* Analysis Status */}
        <div className="mb-6 text-center">
          {isAnalyzing ? (
            <div className="bg-blue-100 rounded-lg p-4 mb-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-blue-800 font-medium">🔍 Analyzing face-only video with AI...</p>
              <p className="text-blue-600 text-sm">Processing optimized data for faster analysis</p>
            </div>
          ) : analysisResults ? (
            <div className="bg-green-100 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">✅ Analysis completed!</p>
              <p className="text-green-700">Risk Level: {analysisResults.risk_assessment.level}</p>
              <button 
                onClick={() => setShowDetailedResults(true)} 
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                View Detailed Results
              </button>
            </div>
          ) : (
            <div className="bg-yellow-100 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium">⏳ Processing optimized video...</p>
              <p className="text-yellow-600 text-sm">Analysis will start automatically</p>
            </div>
          )}
        </div>
        
        {savedFilename && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Optimized assessment video downloaded:</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">{savedFilename}</p>
            <p className="text-xs text-gray-400 mt-1">
              Check your device Downloads folder
            </p>
          </div>
        )}
        
        {/* Hidden canvas for face detection */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="space-y-3 w-full max-w-sm">
          <button 
            onClick={() => {
              // Reset all states
              setPhase('intro')
              setCountdown(3)
              setAssessmentTime(0)
              setEyeDirection('center')
              setSavedFilename(null)
              setConsentChecked(false)
              setAnalysisResults(null)
              setCompressionStats({})
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
        
        {analysisResults && showDetailedResults && (
          <AnalysisResults
            analysis={analysisResults}
            isAnalyzing={false}
            onClose={() => setShowDetailedResults(false)}
          />
        )}
      </div>
    )
  }

  return null
}
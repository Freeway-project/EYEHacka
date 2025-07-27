import { useRef, useState, useCallback, useEffect } from 'react'

interface AnalysisData {
  video_info: {
    duration: number
    fps: number
    total_frames: number
  }
  analysis: {
    frames_analyzed: number
    frames_with_face: number
    face_detection_rate: number
    lazy_eye_detections: number
    detection_events: Array<{
      timestamp: number
      left_displacement: number
      right_displacement: number
      message: string
    }>
  }
  risk_assessment: {
    level: 'HIGH' | 'LOW' | 'MEDIUM'
    confidence: string
    recommendation: string
  }
}

interface VideoRecordingHook {
  isRecording: boolean
  hasPermission: boolean
  permissionError: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>
  requestCameraPermission: () => Promise<void>
  videoPreview: string | null
  videoStream: MediaStream | null
  analysisResults: AnalysisData | null
  isAnalyzing: boolean
  analysisProgress: string
  analysisError: string | null
  retryAnalysis: () => Promise<void>
  setAnalysisResults: (results: AnalysisData | null) => void
  cleanupStreams: () => void
}

export const useVideoRecording = (): VideoRecordingHook => {
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [analysisResults, setAnalysisResults] = useState<AnalysisData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const lastRecordedVideoRef = useRef<Blob | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUpRef = useRef(false)

  // Mobile-optimized API configuration
  const getApiUrl = () => {
    return 'https://eyehacka.onrender.com'
  }

  // Check if API is available before starting analysis
  const checkApiHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiUrl()}/health`, {
        method: 'GET',

      })
      return response.ok
    } catch (error) {
      console.log('❌ API health check failed:', error)
      return false
    }
  }

  // Clean up streams properly - with protection against multiple calls
  const cleanupStreams = useCallback(() => {
    if (isCleaningUpRef.current) {
      console.log('🔄 Cleanup already in progress, skipping...')
      return
    }
    
    isCleaningUpRef.current = true
    console.log('🧹 Cleaning up camera streams...')
    
    try {
      // Clear progress timer
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
        progressTimerRef.current = null
      }
      
      // Stop the current stream if it exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop()
            console.log(`📷 Stopped ${track.kind} track`)
          }
        })
        streamRef.current = null
      }
      
      // Also clean up the state stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop()
            console.log(`📷 Stopped state ${track.kind} track`)
          }
        })
      }
      
      // Clean up MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
      
      // Reset states
      setVideoStream(null)
      setIsRecording(false)
      setAnalysisProgress('')
      
      console.log('✅ Stream cleanup completed')
    } finally {
      isCleaningUpRef.current = false
    }
  }, [videoStream])

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      console.log('🏠 Hook unmounting - final cleanup')
      cleanupStreams()
    }
  }, [cleanupStreams])

  // Request camera permission only (for preview)
  const requestCameraPermission = useCallback(async () => {
    try {
      setPermissionError(null)
      console.log('📷 Requesting camera permission...')
      
      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser')
      }
      
      // Mobile-optimized camera settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      })
      
      console.log('📹 Camera permission granted - stream obtained')
      setHasPermission(true)
      streamRef.current = stream
      setVideoStream(stream)
      
    } catch (error: any) {
      console.error('❌ Camera permission error:', error)
      
      if (error.name === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please allow camera access and try again.')
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera found on this device.')
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Camera is already in use by another app. Please close other camera apps.')
      } else {
        setPermissionError(`Camera error: ${error.message}`)
      }
      
      setHasPermission(false)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setPermissionError(null)
      console.log('🎬 Starting video recording...')
      
      // If we don't have a stream yet, get one
      if (!streamRef.current) {
        await requestCameraPermission()
        if (!streamRef.current) {
          throw new Error('Failed to get camera stream')
        }
      }
      
      const stream = streamRef.current
      recordedChunksRef.current = []
      
      // Mobile-friendly format selection
      const supportedTypes = [
        'video/webm;codecs=vp8',
        'video/webm;codecs=h264',
        'video/webm',
        'video/mp4;codecs=h264',
        'video/mp4'
      ]
      
      let mimeType = 'video/webm'
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          console.log(`✅ Using format: ${mimeType}`)
          break
        }
      }
      
      // Create MediaRecorder with mobile-optimized settings
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 1000000 // 1Mbps for mobile
      })
      mediaRecorderRef.current = mediaRecorder
      
      // Handle data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
          console.log(`📦 Chunk: ${(event.data.size / 1024).toFixed(1)}KB`)
        }
      }
      
      mediaRecorder.onstart = () => {
        console.log('🔴 Recording started')
        setIsRecording(true)
      }
      
      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped')
        setIsRecording(false)
      }
      
      // Start recording with 2-second chunks for mobile
      mediaRecorder.start(2000)
      
    } catch (error: any) {
      console.error('❌ Recording start error:', error)
      setPermissionError(`Recording failed: ${error.message}`)
      setIsRecording(false)
    }
  }, [requestCameraPermission])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      console.log('⏹️ Stopping recording...')
      
      if (!mediaRecorderRef.current || !isRecording) {
        console.log('❌ No recording to stop')
        resolve(null)
        return
      }
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          console.log(`📊 Recorded ${recordedChunksRef.current.length} chunks`)
          
          if (recordedChunksRef.current.length === 0) {
            console.log('❌ No video data recorded')
            resolve(null)
            return
          }
          
          // Create video blob
          const videoBlob = new Blob(recordedChunksRef.current, {
            type: 'video/webm'
          })
          
          const fileSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2)
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = `eye-assessment-${timestamp}.webm`
          
          console.log(`💾 Video created: ${filename} (${fileSizeMB} MB)`)
          
          // Store video for potential retry
          lastRecordedVideoRef.current = videoBlob
          
          // Create preview for UI
          const videoUrl = URL.createObjectURL(videoBlob)
          setVideoPreview(videoUrl)
          
          // Start analysis with better error handling
          await analyzeVideoWithAPI(videoBlob, filename)
          
          // Cleanup video URL after a short delay
          setTimeout(() => {
            URL.revokeObjectURL(videoUrl)
            console.log('🗑️ Video URL cleaned up')
          }, 10000) // Longer delay for mobile
          
          resolve(filename)
          
        } catch (error) {
          console.error('❌ Stop recording error:', error)
          resolve(null)
        }
      }
      
      // Actually stop recording
      try {
        mediaRecorderRef.current.stop()
        console.log('🛑 MediaRecorder stopped')
      } catch (error) {
        console.error('❌ Stop error:', error)
        resolve(null)
      }
    })
  }, [isRecording])

  // Retry analysis function
  const retryAnalysis = useCallback(async () => {
    if (lastRecordedVideoRef.current) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `eye-assessment-retry-${timestamp}.webm`
      await analyzeVideoWithAPI(lastRecordedVideoRef.current, filename)
    }
  }, [])

  // Mobile-optimized analysis with better error handling
  const analyzeVideoWithAPI = async (videoBlob: Blob, filename: string) => {
    try {
      setIsAnalyzing(true)
      setAnalysisError(null)
      setAnalysisProgress('Checking API availability...')
      
      // Check if API is healthy first
      const isApiHealthy = await checkApiHealth()
      if (!isApiHealthy) {
        throw new Error('API_UNAVAILABLE')
      }
      
      const apiUrl = getApiUrl()
      const fileSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2)
      
      console.log(`🔍 Starting analysis for ${fileSizeMB}MB video...`)
      setAnalysisProgress(`Uploading ${fileSizeMB}MB video...`)
      
      // Create form data
      const formData = new FormData()
      formData.append('video', videoBlob, filename)

      // Mobile-optimized timeout (shorter than desktop)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000) // 5 minutes for mobile
      
      // Progress tracking optimized for mobile
      let progressInterval: NodeJS.Timeout | null = null
      let secondsElapsed = 0
      
      progressInterval = setInterval(() => {
        secondsElapsed += 3
        console.log(`⏳ Analysis: ${Math.floor(secondsElapsed / 60)}m ${secondsElapsed % 60}s`)
        
        // Mobile-friendly progress messages with countdown
        const remainingMinutes = Math.max(0, 5 - Math.floor(secondsElapsed / 60))
        const remainingSeconds = Math.max(0, 300 - secondsElapsed)
        
        if (secondsElapsed < 30) {
          setAnalysisProgress(`Uploading video... (${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} remaining)`)
        } else if (secondsElapsed < 60) {
          setAnalysisProgress(`Processing frames... (${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} remaining)`)
        } else if (secondsElapsed < 120) {
          setAnalysisProgress(`Analyzing eyes... (${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} remaining)`)
        } else if (secondsElapsed < 180) {
          setAnalysisProgress(`Generating report... (${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} remaining)`)
        } else if (secondsElapsed < 240) {
          setAnalysisProgress(`Finalizing... (${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} remaining)`)
        } else {
          setAnalysisProgress(`Almost done... (${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} remaining)`)
        }
      }, 3000)
      
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      
      // Clear progress tracking
      clearTimeout(timeoutId)
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      console.log(`📡 Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('SERVER_BUSY')
        } else if (response.status >= 500) {
          throw new Error('SERVER_ERROR')
        } else {
          throw new Error('UPLOAD_FAILED')
        }
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'ANALYSIS_FAILED')
      }
      
      console.log('🎉 Analysis complete:', result)
      setAnalysisResults(result.analysis)
      setAnalysisProgress('Analysis completed successfully! 🎉')
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error)
      
      // Clear progress tracking
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
      
      // Handle different error types with mobile-friendly messages
      let errorMessage = ''
      
      if (error.name === 'AbortError') {
        errorMessage = 'Analysis timed out. Server may be busy - please try again.'
        setAnalysisProgress('⏰ Analysis timed out')
      } else if (error.message === 'API_UNAVAILABLE') {
        errorMessage = 'Server unavailable. Please try again in a few minutes.'
        setAnalysisProgress('🔧 Server unavailable')
      } else if (error.message === 'SERVER_BUSY') {
        errorMessage = 'Server is busy. Please wait 1-2 minutes and try again.'
        setAnalysisProgress('⏳ Server busy')
      } else if (error.message === 'SERVER_ERROR') {
        errorMessage = 'Server error occurred. Please try again.'
        setAnalysisProgress('❌ Server error')
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network issue. Check your connection and try again.'
        setAnalysisProgress('📶 Network error')
      } else {
        errorMessage = 'Analysis failed. Please try again.'
        setAnalysisProgress('❌ Analysis failed')
      }
      
      setAnalysisError(errorMessage)
      
      // Show fallback results for demo purposes
      const fallbackResults: AnalysisData = {
        video_info: {
          duration: 20.0,
          fps: 30.0,
          total_frames: 600
        },
        analysis: {
          frames_analyzed: 600,
          frames_with_face: 570,
          face_detection_rate: 95.0,
          lazy_eye_detections: 0,
          detection_events: []
        },
        risk_assessment: {
          level: 'LOW',
          confidence: 'Demo Mode - Server Issue',
          recommendation: `${errorMessage} Showing demo results for now.`
        }
      }
      
      console.log('📋 Showing fallback results due to:', error.message)
      setAnalysisResults(fallbackResults)
      
    } finally {
      setIsAnalyzing(false)
    }
  }

  return {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    requestCameraPermission,
    videoPreview,
    videoStream,
    analysisResults,
    isAnalyzing,
    analysisProgress,
    analysisError,
    retryAnalysis,
    setAnalysisResults,
    cleanupStreams
  }
}
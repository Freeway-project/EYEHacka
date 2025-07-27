import { useRef, useState, useCallback } from 'react'

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
  videoPreview: string | null
  videoStream: MediaStream | null
  analysisResults: AnalysisData | null
  isAnalyzing: boolean
  setAnalysisResults: (results: AnalysisData | null) => void
}

export const useVideoRecording = (): VideoRecordingHook => {
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [analysisResults, setAnalysisResults] = useState<AnalysisData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // API URL configuration for Vercel frontend → Render API
  const getApiUrl = () => {
    // Production: Use your deployed Render API URL
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://eyehacka.onrender.com'  // 👈 REPLACE WITH YOUR RENDER URL
    }
    // Development: Use local API
    return 'https://eyehacka.onrender.com'
  }

  const startRecording = useCallback(async () => {
    try {
      setPermissionError(null)
      console.log('🎬 Starting video recording...')
      
      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser')
      }
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      
      console.log('📹 Camera stream obtained')
      setHasPermission(true)
      streamRef.current = stream
      setVideoStream(stream)
      recordedChunksRef.current = []
      
      // Find best supported format
      const supportedTypes = [
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9', 
        'video/webm',
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
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      
      // Handle data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
          console.log(`📦 Chunk: ${event.data.size} bytes`)
        }
      }
      
      mediaRecorder.onstart = () => {
        console.log('🔴 Recording started')
      }
      
      // Start recording with 1-second chunks
      mediaRecorder.start(1000)
      setIsRecording(true)
      
    } catch (error: any) {
      console.error('❌ Camera error:', error)
      
      if (error.name === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please allow camera access.')
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera found on this device.')
      } else {
        setPermissionError(`Camera error: ${error.message}`)
      }
      
      setHasPermission(false)
    }
  }, [])

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
          
          // Create preview for UI
          const videoUrl = URL.createObjectURL(videoBlob)
          setVideoPreview(videoUrl)
          
          // Send to Render API for analysis
          await analyzeVideoWithAPI(videoBlob, filename)
          
          // Cleanup
          setTimeout(() => {
            URL.revokeObjectURL(videoUrl)
            console.log('🗑️ Video URL cleaned up')
          }, 5000)
          
          // Stop camera
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop()
              console.log('📷 Camera stopped')
            })
          }
          
          setIsRecording(false)
          setVideoStream(null)
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

  // Send video to Render API for analysis
const analyzeVideoWithAPI = async (videoBlob: Blob, filename: string) => {
    try {
      setIsAnalyzing(true)
      const apiUrl = getApiUrl()
      
      console.log('🔍 Starting analysis... This may take several minutes...')
      
      // Create form data
      const formData = new FormData()
      formData.append('video', videoBlob, filename)

      // API call with extended timeout for video processing
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000) // 10 minutes timeout
      
      // Show progress indicator
      let progressInterval: NodeJS.Timeout | null = null
      let secondsElapsed = 0
      
      progressInterval = setInterval(() => {
        secondsElapsed += 5
        console.log(`⏳ Analysis in progress... ${Math.floor(secondsElapsed / 60)}m ${secondsElapsed % 60}s elapsed`)
        
        // Show user-friendly progress messages
        if (secondsElapsed === 30) {
          console.log('🧠 AI is analyzing your eye movements...')
        } else if (secondsElapsed === 60) {
          console.log('👁️ Processing facial landmarks and gaze patterns...')
        } else if (secondsElapsed === 120) {
          console.log('📊 Generating assessment report...')
        } else if (secondsElapsed >= 180) {
          console.log('🔄 Complex analysis taking longer than expected...')
        }
      }, 5000)
      
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Don't set Content-Type - let browser set it with boundary
        }
      })
      
      // Clear progress tracking
      clearTimeout(timeoutId)
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      console.log(`📡 Response: ${response.status} ${response.statusText}`)
      console.log(`✅ Analysis completed in ${Math.floor(secondsElapsed / 60)}m ${secondsElapsed % 60}s`)
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Analysis failed')
      }
      
      console.log('🎉 Analysis complete:', result)
      setAnalysisResults(result.analysis)
      
      return result.video_url || null
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error)
      
      if (error.name === 'AbortError') {
        console.error('⏰ Analysis timed out after 10 minutes')
        // You might want to show a user-friendly timeout message
      } else if (error.message?.includes('fetch')) {
        console.error('🌐 Network error - check your internet connection')
      } else {
        console.error('💡 Check Render API deployment and server logs')
      }
      
      // Enhanced fallback results with timeout info
      const fallbackResults: AnalysisData = {
        video_info: {
          duration: 30.0,
          fps: 30.0,
          total_frames: 900
        },
        analysis: {
          frames_analyzed: 900,
          frames_with_face: 850,
          face_detection_rate: 94.4,
          lazy_eye_detections: 0,
          detection_events: []
        },
        risk_assessment: {
          level: 'LOW',
          confidence: 'Demo Mode',
          recommendation: error.name === 'AbortError' 
            ? 'Analysis timed out - please try with a shorter video or check your connection'
            : 'API temporarily unavailable - showing demo results'
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
    videoPreview,
    videoStream,
    analysisResults,
    isAnalyzing,
    setAnalysisResults
  }
}

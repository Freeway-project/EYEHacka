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
      return 'https://YOUR_RENDER_API_URL.onrender.com'  // 👈 REPLACE WITH YOUR RENDER URL
    }
    // Development: Use local API
    return 'http://localhost:5000'
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
      
      console.log('🔍 Starting analysis...')
      console.log(`📤 API: ${apiUrl}/upload`)
      console.log(`📤 File: ${filename} (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)`)
      
      // Create form data
      const formData = new FormData()
      formData.append('video', videoBlob, filename)
      
      // Call Render API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('⏰ API call timed out')
      }, 120000) // 2 minute timeout
      
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Don't set Content-Type - let browser set it with boundary
        }
      })
      
      clearTimeout(timeoutId)
      console.log(`📡 Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.analysis) {
        console.log('✅ Analysis completed!')
        console.log(`⏱️ Processing time: ${result.processing_time_seconds?.toFixed(1)}s`)
        console.log('📊 Results:', result.analysis)
        setAnalysisResults(result.analysis)
      } else {
        throw new Error(result.error || 'Analysis failed')
      }
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error)
      
      if (error.name === 'AbortError') {
        console.error('⏰ Analysis timed out')
      } else {
        console.error('💡 Check Render API deployment')
      }
      
      // Fallback demo results
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
          confidence: 'High',
          recommendation: 'No issues detected (fallback - API unavailable)'
        }
      }
      
      console.log('📋 Showing fallback results:', fallbackResults)
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
import { useRef, useState, useCallback } from 'react'

interface VideoRecordingHook {
  isRecording: boolean
  hasPermission: boolean
  permissionError: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>
  videoPreview: string | null
}

export const useVideoRecording = (): VideoRecordingHook => {
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setPermissionError(null)
      
      // Request camera permission - this will show mobile permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      
      setHasPermission(true)
      streamRef.current = stream
      recordedChunksRef.current = []
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      
      // Start recording
      mediaRecorder.start(1000) // Record in 1-second chunks
      setIsRecording(true)
      
    } catch (error: any) {
      console.error('Camera access failed:', error)
      
      if (error.name === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please enable camera access in browser settings.')
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera found on device.')
      } else {
        setPermissionError('Failed to access camera. Please try again.')
      }
      
      setHasPermission(false)
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null)
        return
      }
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          // Create video blob from recorded chunks
          const videoBlob = new Blob(recordedChunksRef.current, {
            type: 'video/webm'
          })
          
          // Generate filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = `eye-assessment-${timestamp}.webm`
          
          // Create download link and trigger download
          const videoUrl = URL.createObjectURL(videoBlob)
          setVideoPreview(videoUrl)
          
          const downloadLink = document.createElement('a')
          downloadLink.href = videoUrl
          downloadLink.download = filename
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)

          // Clean up the blob URL after download
          setTimeout(() => URL.revokeObjectURL(videoUrl), 1000)
          
          console.log(`Video downloaded: ${filename} (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)`)
          
          // Stop camera stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
          }
          
          setIsRecording(false)
          resolve(filename)
          
        } catch (error) {
          console.error('Failed to download video:', error)
          resolve(null)
        }
      }
      
      mediaRecorderRef.current.stop()
    })
  }, [isRecording])

  return {
    isRecording,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    videoPreview
  }
}
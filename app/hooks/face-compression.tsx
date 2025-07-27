
import { useRef, useCallback } from 'react'

export const useFaceDetection = () => {
  const canvasRef = useRef(null)
  const faceDetectorRef = useRef(null)

  // Initialize face detection (modern browsers)
  const initFaceDetection = useCallback(async () => {
    if ('FaceDetector' in window) {
      faceDetectorRef.current = new window.FaceDetector({
        maxDetectedFaces: 1,
        fastMode: true
      })
      return true
    }
    return false
  }, [])

  // Detect and crop face from video frame
  const detectAndCropFace = useCallback(async (video) => {
    if (!faceDetectorRef.current || !video) return null

    try {
      const faces = await faceDetectorRef.current.detect(video)
      if (faces.length === 0) return null

      const face = faces[0]
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Add padding around face (20% on each side)
      const padding = 0.2
      const faceWidth = face.boundingBox.width
      const faceHeight = face.boundingBox.height
      const paddingX = faceWidth * padding
      const paddingY = faceHeight * padding

      // Calculate crop dimensions
      const cropX = Math.max(0, face.boundingBox.x - paddingX)
      const cropY = Math.max(0, face.boundingBox.y - paddingY)
      const cropWidth = Math.min(video.videoWidth - cropX, faceWidth + 2 * paddingX)
      const cropHeight = Math.min(video.videoHeight - cropY, faceHeight + 2 * paddingY)

      // Set canvas size to face crop
      canvas.width = cropWidth
      canvas.height = cropHeight

      // Draw cropped face
      ctx.drawImage(
        video,
        cropX, cropY, cropWidth, cropHeight,  // Source crop
        0, 0, cropWidth, cropHeight           // Destination
      )

      return canvas
    } catch (error) {
      console.error('Face detection failed:', error)
      return null
    }
  }, [])

  return {
    initFaceDetection,
    detectAndCropFace,
    canvasRef
  }
}

// 2. Video Compression and Face-Only Recording Hook
export const useCompressedFaceRecording = () => {
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const intervalRef = useRef(null)
  const { detectAndCropFace, initFaceDetection, canvasRef } = useFaceDetection()

  const startFaceOnlyRecording = useCallback(async (videoElement) => {
    try {
      // Initialize face detection
      const faceDetectionSupported = await initFaceDetection()
      
      if (!faceDetectionSupported) {
        console.warn('Face detection not supported, recording full video')
        return false
      }

      // Create canvas stream for face-only recording
      const canvas = canvasRef.current
      const stream = canvas.captureStream(15) // 15 FPS for efficiency

      // Setup MediaRecorder with compression
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9', // Efficient codec
        videoBitsPerSecond: 500000 // 500kbps for good compression
      })

      chunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Start recording
      mediaRecorderRef.current.start(100) // Collect data every 100ms

      // Capture face frames at intervals
      intervalRef.current = setInterval(async () => {
        await detectAndCropFace(videoElement)
      }, 66) // ~15 FPS

      return true
    } catch (error) {
      console.error('Failed to start face recording:', error)
      return false
    }
  }, [detectAndCropFace, initFaceDetection, canvasRef])

  const stopFaceRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          resolve(blob)
        }
        mediaRecorderRef.current.stop()
      } else {
        resolve(null)
      }
    })
  }, [])

  return {
    startFaceOnlyRecording,
    stopFaceRecording,
    canvasRef
  }
}

// 3. Alternative: Manual Face Cropping (for browsers without FaceDetector)
export const useManualFaceCrop = () => {
  const canvasRef = useRef(null)

  const cropVideoToFace = useCallback((video, cropRect) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Default face area (center portion of video)
    const defaultCrop = {
      x: video.videoWidth * 0.25,
      y: video.videoHeight * 0.2,
      width: video.videoWidth * 0.5,
      height: video.videoHeight * 0.6
    }

    const crop = cropRect || defaultCrop

    canvas.width = crop.width
    canvas.height = crop.height

    ctx.drawImage(
      video,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height
    )

    return canvas
  }, [])

  return {
    cropVideoToFace,
    canvasRef
  }
}

// 4. Frame-by-Frame Analysis (send only key frames)
export const useKeyFrameExtraction = () => {
  const extractKeyFrames = useCallback(async (videoBlob, frameCount = 10) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const frames = []

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const duration = video.duration
        const interval = duration / frameCount

        let currentFrame = 0
        
        const extractFrame = () => {
          if (currentFrame >= frameCount) {
            resolve(frames)
            return
          }

          video.currentTime = currentFrame * interval
        }

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0)
          
          canvas.toBlob((blob) => {
            frames.push({
              timestamp: video.currentTime,
              blob: blob,
              dataUrl: canvas.toDataURL('image/jpeg', 0.7) // 70% quality
            })
            
            currentFrame++
            extractFrame()
          }, 'image/jpeg', 0.7)
        }

        extractFrame()
      }

      video.src = URL.createObjectURL(videoBlob)
    })
  }, [])

  return { extractKeyFrames }
}

// 5. Usage in your main component
export const useOptimizedEyeTracking = () => {
  const { startFaceOnlyRecording, stopFaceRecording, canvasRef } = useCompressedFaceRecording()
  const { extractKeyFrames } = useKeyFrameExtraction()

  const startOptimizedRecording = async (videoElement) => {
    // Try face-only recording first
    const faceRecordingStarted = await startFaceOnlyRecording(videoElement)
    
    if (!faceRecordingStarted) {
      console.log('Falling back to full video recording')
      // Fallback to your existing recording method
    }
    
    return faceRecordingStarted
  }

  const stopOptimizedRecording = async () => {
    const faceBlob = await stopFaceRecording()
    
    if (faceBlob) {
      // Option 1: Send compressed face video
      return {
        type: 'face-video',
        data: faceBlob,
        size: faceBlob.size
      }
    } else {
      // Option 2: Extract key frames for analysis
      const keyFrames = await extractKeyFrames(faceBlob, 20) // 20 key frames
      return {
        type: 'key-frames',
        data: keyFrames,
        size: keyFrames.reduce((total, frame) => total + frame.blob.size, 0)
      }
    }
  }

  return {
    startOptimizedRecording,
    stopOptimizedRecording,
    canvasRef
  }
}
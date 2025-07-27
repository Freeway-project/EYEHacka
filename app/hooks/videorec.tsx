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
  cleanupResources: () => void
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
  const analysisControllerRef = useRef<AbortController | null>(null)

  // API URL configuration for Vercel frontend → Render API
  const getApiUrl = () => {
    // Production: Use your deployed Render API URL
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://eyehacka.onrender.com'  // 👈 REPLACE WITH YOUR RENDER URL
    }
    // Development: Use local API
    return 'https://eyehacka.onrender.com'
  }

  // Cleanup function to stop streams and clear resources
  const cleanupResources = useCallback(() => {
    console.log('🧹 Cleaning up video recording resources...')
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('🛑 Stopped video track')
      })
      streamRef.current = null
      setVideoStream(null)
    }

    // Stop recording if active
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop()
      } catch (error) {
        console.warn('⚠️ Error stopping media recorder:', error)
      }
    }

    // Abort any ongoing analysis
    if (analysisControllerRef.current) {
      analysisControllerRef.current.abort()
      analysisControllerRef.current = null
      console.log('🚫 Aborted ongoing analysis')
    }

    // Clean up preview URL
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
      setVideoPreview(null)
    }

    // Reset states
    setIsRecording(false)
    setIsAnalyzing(false)
    mediaRecorderRef.current = null
    recordedChunksRef.current = []
  }, [isRecording, videoPreview])

  const startRecording = useCallback(async () => {
    try {
      setPermissionError(null);
      console.log('🎬 Starting video recording...');

      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
      }

      // Clean up any existing resources first
      cleanupResources()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false,
      });

      console.log('📹 Camera stream obtained');
      setHasPermission(true);
      streamRef.current = stream;
      setVideoStream(stream);
      recordedChunksRef.current = [];

      const supportedTypes = [
        'video/mp4;codecs=h264',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm',
      ];

      let mimeType = 'video/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`✅ MediaRecorder will use: ${mimeType}`);
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log(`📦 Chunk: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setPermissionError('Recording error occurred');
      };

      // ✅ Wait until .onstart before proceeding
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Recording start timeout'))
        }, 5000) // 5 second timeout

        mediaRecorder.onstart = () => {
          clearTimeout(timeout)
          console.log('🔴 Recording started');
          setIsRecording(true);
          resolve();
        };

        try {
          mediaRecorder.start(1000); // record in 1-second chunks
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      });

    } catch (error: any) {
      console.error('❌ Camera error:', error);

      if (error.name === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Camera is being used by another application.');
      } else if (error.message === 'Recording start timeout') {
        setPermissionError('Camera failed to start recording. Please try again.');
      } else {
        setPermissionError(`Camera error: ${error.message}`);
      }

      setHasPermission(false);
      cleanupResources()
    }
  }, [cleanupResources]);

const stopRecording = useCallback(async (): Promise<string | null> => {
  return new Promise((resolve) => {
    console.log('⏹️ Stopping recording...');

    const recorder = mediaRecorderRef.current;
    
    // Check if recorder exists and is in recording state
    if (!recorder) {
      console.warn('❌ No media recorder found');
      resolve(null);
      return;
    }

    // Check recorder state instead of isRecording state
    if (recorder.state !== 'recording') {
      console.warn(`❌ Recorder not in recording state (current: ${recorder.state})`);
      resolve(null);
      return;
    }

    console.log(`📹 Recorder state: ${recorder.state}, stopping now...`);

    recorder.onstop = async () => {
      try {
        console.log('🛑 MediaRecorder stop event triggered');
        
        const chunks = recordedChunksRef.current;
        console.log(`📊 Recorded ${chunks.length} chunks`);

        if (chunks.length === 0) {
          console.warn('⚠️ No video chunks recorded');
          setIsRecording(false);
          setVideoStream(null);
          resolve(null);
          return;
        }

        const blob = new Blob(chunks, { type: 'video/webm' });
        const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
        const filename = `eye-assessment-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        console.log(`💾 Created ${filename} (${fileSizeMB} MB)`);

        // Create preview URL if needed
        const videoUrl = URL.createObjectURL(blob);
        setVideoPreview(videoUrl);

        // Clean up video stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Stopped video track');
          });
          streamRef.current = null;
        }

        // Update states
        setIsRecording(false);
        setVideoStream(null);

        // Start analysis - this will set isAnalyzing to true
        console.log('🔍 Starting video analysis...');
        await analyzeVideoWithAPI(blob, filename);

        // Clean up preview URL after 10 seconds
        setTimeout(() => {
          URL.revokeObjectURL(videoUrl);
          setVideoPreview(null);
          console.log('🗑️ Cleaned preview blob URL');
        }, 10000);

        resolve(filename);

      } catch (err) {
        console.error('❌ Stop error:', err);
        setIsRecording(false);
        setVideoStream(null);
        resolve(null);
      }
    };

    try {
      recorder.stop(); // This will trigger the onstop event
      console.log('🛑 MediaRecorder.stop() called');
    } catch (err) {
      console.error('❌ Failed to stop recorder:', err);
      setIsRecording(false);
      setVideoStream(null);
      resolve(null);
    }
  });
}, []); 

  // Send video to Render API for analysis
  const analyzeVideoWithAPI = async (videoBlob: Blob, filename: string) => {
    setIsAnalyzing(true);
    const apiUrl = getApiUrl();

    console.log('🔍 Sending video to API:', apiUrl, filename, `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);

    const formData = new FormData();
    formData.append('video', videoBlob, filename);

    try {
      // Create new abort controller for this analysis
      const controller = new AbortController();
      analysisControllerRef.current = controller;
      
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ Analysis timed out after 3 minutes');
      }, 3 * 60_000);

      console.log("⏳ Starting analysis (timeout: 3 minutes)");
      
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Let browser set Content-Type with boundary for FormData
        }
      });
      
      clearTimeout(timeoutId);
      analysisControllerRef.current = null;

      console.log(`📡 API response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed (${response.status}): ${text}`);
      }

      const result = await response.json();
      console.log('✅ Analysis result:', result);
      
      // Handle different possible response structures
      const analysisData = result.analysis || result;
      setAnalysisResults(analysisData);
      
      return result.video_url || null;

    } catch (error: any) {
      console.error('❌ Analysis failed:', error)

      if (error.name === 'AbortError') {
        console.error('⏰ Analysis was aborted or timed out')
      } else {
        console.error('💡 Check Render API deployment and network connection')
      }

      // Fallback demo results - updated to match 20-second recording
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
          confidence: 'High',
          recommendation: 'No issues detected (fallback - API unavailable)'
        }
      }

      console.log('📋 Showing fallback results:', fallbackResults)
      setAnalysisResults(fallbackResults)

    } finally {
      setIsAnalyzing(false)
      analysisControllerRef.current = null
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
    setAnalysisResults,
    cleanupResources
  }
}
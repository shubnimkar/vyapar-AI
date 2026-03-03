'use client';

import { useState, useRef, useEffect } from 'react';
import { ExtractedVoiceData } from '@/lib/types';

interface VoiceRecorderProps {
  onDataExtracted: (data: ExtractedVoiceData) => void;
  language: 'en' | 'hi';
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export default function VoiceRecorder({ onDataExtracted, language }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [queuedUploads, setQueuedUploads] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const translations = {
    en: {
      record: 'Record Voice',
      stop: 'Stop Recording',
      upload: 'Upload & Process',
      recording: 'Recording',
      uploading: 'Uploading',
      processing: 'Processing',
      success: 'Data extracted successfully!',
      error: 'Error',
      micPermissionDenied: 'Microphone permission denied. Please allow access.',
      micNotSupported: 'Voice recording not supported in this browser.',
      uploadFailed: 'Upload failed. Will retry when online.',
      offline: 'Offline - Recording saved locally',
      queuedUploads: 'uploads queued',
    },
    hi: {
      record: 'आवाज़ रिकॉर्ड करें',
      stop: 'रिकॉर्डिंग बंद करें',
      upload: 'अपलोड और प्रोसेस करें',
      recording: 'रिकॉर्डिंग',
      uploading: 'अपलोड हो रहा है',
      processing: 'प्रोसेस हो रहा है',
      success: 'डेटा सफलतापूर्वक निकाला गया!',
      error: 'त्रुटि',
      micPermissionDenied: 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया एक्सेस की अनुमति दें।',
      micNotSupported: 'इस ब्राउज़र में वॉइस रिकॉर्डिंग समर्थित नहीं है।',
      uploadFailed: 'अपलोड विफल। ऑनलाइन होने पर पुनः प्रयास करेंगे।',
      offline: 'ऑफ़लाइन - रिकॉर्डिंग स्थानीय रूप से सहेजी गई',
      queuedUploads: 'अपलोड कतारबद्ध',
    },
  };

  const t = translations[language];

  // Load queued uploads count on mount
  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem('voiceUploadQueue') || '[]');
    setQueuedUploads(queue.length);
  }, []);

  // Process offline queue when online
  useEffect(() => {
    const handleOnline = () => {
      processOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const visualizeWaveform = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Sample 20 points for visualization
    const samples = 20;
    const step = Math.floor(dataArray.length / samples);
    const waveform = [];
    for (let i = 0; i < samples; i++) {
      waveform.push(dataArray[i * step] / 255);
    }

    setWaveformData(waveform);
    animationFrameRef.current = requestAnimationFrame(visualizeWaveform);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for waveform visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start waveform visualization
      visualizeWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());

        // Stop waveform visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setErrorMessage(null);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError') {
        setErrorMessage(t.micPermissionDenied);
      } else {
        setErrorMessage(t.micNotSupported);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;

    setUploadStatus('uploading');
    setErrorMessage(null);

    try {
      // Check if online
      if (!navigator.onLine) {
        // Queue for later
        const queue = JSON.parse(localStorage.getItem('voiceUploadQueue') || '[]');
        const reader = new FileReader();
        reader.onloadend = () => {
          queue.push({
            audioData: reader.result,
            timestamp: Date.now(),
          });
          localStorage.setItem('voiceUploadQueue', JSON.stringify(queue));
          setQueuedUploads(queue.length);
          setUploadStatus('idle');
          setErrorMessage(t.offline);
        };
        reader.readAsDataURL(audioBlob);
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);

      const response = await fetch('/api/voice-entry', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadStatus('processing');

      const result = await response.json();

      if (result.success && result.data) {
        setUploadStatus('success');
        onDataExtracted(result.data);

        // Reset after 3 seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setAudioBlob(null);
          setRecordingDuration(0);
        }, 3000);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : t.uploadFailed;
      setErrorMessage(errorMessage);
    }
  };

  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('voiceUploadQueue') || '[]');
    if (queue.length === 0) return;

    setQueuedUploads(queue.length);

    for (let i = 0; i < queue.length; i++) {
      try {
        const item = queue[i];
        const blob = await fetch(item.audioData).then((r) => r.blob());

        const formData = new FormData();
        formData.append('audio', blob, `voice-${item.timestamp}.webm`);

        const response = await fetch('/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          queue.splice(i, 1);
          i--;
          localStorage.setItem('voiceUploadQueue', JSON.stringify(queue));
          setQueuedUploads(queue.length);
        }
      } catch (error) {
        console.error('Failed to process queued upload:', error);
        break;
      }
    }

    if (queue.length === 0) {
      setErrorMessage(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        {language === 'hi' ? 'वॉइस एंट्री' : 'Voice Entry'}
      </h3>

      {/* Waveform Visualization */}
      {isRecording && (
        <div className="flex items-center justify-center h-20 bg-gray-50 rounded-lg">
          <div className="flex items-end space-x-1 h-16">
            {waveformData.map((value, index) => (
              <div
                key={index}
                className="w-2 bg-blue-500 rounded-t transition-all duration-100"
                style={{ height: `${Math.max(value * 100, 5)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recording Duration */}
      {isRecording && (
        <div className="text-center">
          <span className="text-2xl font-mono text-red-600">
            {formatDuration(recordingDuration)}
          </span>
          <span className="ml-2 text-sm text-gray-600">{t.recording}...</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-3">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🎤 {t.record}
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            ⏹️ {t.stop}
          </button>
        )}

        {audioBlob && uploadStatus === 'idle' && (
          <button
            onClick={uploadAudio}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            ⬆️ {t.upload}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {uploadStatus === 'uploading' && (
        <div className="text-center text-blue-600 font-medium">
          ⏳ {t.uploading}...
        </div>
      )}

      {uploadStatus === 'processing' && (
        <div className="text-center text-purple-600 font-medium">
          🔄 {t.processing}...
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="text-center text-green-600 font-medium">
          ✅ {t.success}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Queued Uploads Indicator */}
      {queuedUploads > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
          📦 {queuedUploads} {t.queuedUploads}
        </div>
      )}
    </div>
  );
}

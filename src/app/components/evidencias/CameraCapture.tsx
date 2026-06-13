import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Loader2, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string, fileType: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [captured, setCaptured] = useState(false);

  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Permiso de cámara denegado. Revisá los permisos del navegador.");
      } else if (err.name === "NotFoundError") {
        setError("No se encontró ninguna cámara en este equipo.");
      } else {
        setError("No se pudo acceder a la cámara: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(true);

    // Detener stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    onCapture(dataUrl, "image/jpeg");
  };

  const handleRetry = () => {
    setCaptured(false);
    setError(null);
    startCamera();
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3">
        <p className="text-sm text-red-700">{error}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition"
          >
            Reintentar
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-xl overflow-hidden relative">
      {loading && (
        <div className="flex items-center justify-center h-64 bg-gray-900">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Abriendo cámara...</span>
          </div>
        </div>
      )}

      {!captured && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full max-h-80 object-contain ${loading ? "hidden" : ""}`}
        />
      )}

      {!loading && !captured && (
        <>
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <button
              onClick={onCancel}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleCapture}
              className="w-14 h-14 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition flex items-center justify-center"
              title="Tomar foto"
            >
              <span className="w-10 h-10 rounded-full bg-white" />
            </button>
          </div>
        </>
      )}

      {captured && (
        <div className="flex items-center justify-center p-4 bg-gray-900">
          <Camera className="w-6 h-6 text-green-400" />
          <span className="text-sm text-green-400 ml-2">Foto capturada</span>
        </div>
      )}
    </div>
  );
}

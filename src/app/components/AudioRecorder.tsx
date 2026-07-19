import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Trash2, Upload, Loader2, Check } from "lucide-react";
import { audioApi } from "@/api/client.js";

interface AudioRecorderProps {
  /** Texto que describe el propósito (ej: "Reporte del cliente", "Diagnóstico") */
  label?: string;
  /** URL de audio existente (en modo edición) */
  existingUrl?: string | null;
  /** Se llama cuando el audio se sube exitosamente */
  onAudioUploaded?: (url: string) => void;
  /** Se llama para limpiar el audio */
  onAudioRemoved?: () => void;
  /** Deshabilitado */
  disabled?: boolean;
  className?: string;
}

export function AudioRecorder({
  label,
  existingUrl,
  onAudioUploaded,
  onAudioRemoved,
  disabled,
  className,
}: AudioRecorderProps) {
  // -- Estados de UI --
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  // -- Refs --
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setError(null);
    setPermDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);

      // Timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setTimer(seconds);
        // Límite de 5 minutos
        if (seconds >= 300) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setPermDenied(true);
        setError("Permiso de micrófono denegado. Revisá los permisos del navegador.");
      } else if (err.name === "NotFoundError") {
        setError("No se encontró micrófono en este equipo.");
      } else {
        setError("Error al acceder al micrófono: " + err.message);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setTimer(0);
  }, []);

  const reRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
  }, [audioUrl]);

  const handleUpload = useCallback(async () => {
    if (!audioBlob) return;
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = reader.result as string;
      try {
        const { data } = await audioApi.upload({
          audio_base64: base64,
          content_type: audioBlob.type,
        });
        onAudioUploaded?.(data.data.url);
        // Liberar blob URL
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
      } catch (err: any) {
        const serverMsg = err?.response?.data?.detail || err?.response?.data?.message;
        setError(serverMsg || "Error al subir el audio");
      } finally {
        setUploading(false);
      }
      };
    } catch (err: any) {
      setError("Error al procesar el audio");
      setUploading(false);
    }
  }, [audioBlob, audioUrl, onAudioUploaded]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Si hay un audio ya subido y no hay uno nuevo grabándose, mostrar reproductor
  if (existingUrl && !audioUrl && !recording) {
    return (
      <div className={className}>
        {label && <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>}
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
          <audio src={existingUrl} controls className="flex-1 h-10" preload="metadata" />
          {onAudioRemoved && !disabled && (
            <button
              type="button"
              onClick={onAudioRemoved}
              className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition shrink-0"
              title="Eliminar audio"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <span className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {onAudioRemoved && existingUrl && !disabled && (
            <button
              type="button"
              onClick={onAudioRemoved}
              className="ml-2 text-xs text-red-500 hover:text-red-700"
            >
              Eliminar
            </button>
          )}
        </span>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        {/* Estado de grabación */}
        {recording && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              Grabando {formatTime(timer)}
            </span>
            <div className="flex-1 h-1 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${(timer / 300) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              Detener
            </button>
          </div>
        )}

        {/* Audio grabado listo para escuchar/subir */}
        {audioUrl && !recording && (
          <div className="space-y-3">
            <audio src={audioUrl} controls className="w-full h-10" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reRecord}
                disabled={disabled}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
                Regrabar
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || disabled}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir audio
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Botón inicial para empezar a grabar */}
        {!recording && !audioUrl && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || permDenied}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition
              ${
                permDenied
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              }
              disabled:opacity-50`}
          >
            <Mic className="w-5 h-5" />
            {permDenied ? "Micrófono bloqueado" : "Grabar audio"}
          </button>
        )}

        {/* Error */}
        {error && !recording && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {permDenied && (
          <p className="text-xs text-slate-400">
            Permití el acceso al micrófono en la configuración del navegador y volvé a intentar.
          </p>
        )}
      </div>
    </div>
  );
}

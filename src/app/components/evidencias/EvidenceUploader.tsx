import { useState, useRef } from "react";
import { useUploadEvidencia } from "@/api/queries/useEvidencias.js";
import { cn } from "@/app/lib/utils";
import { Camera, Upload, X, FileVideo, Loader2 } from "lucide-react";

interface EvidenceUploaderProps {
  servicioId: number;
  tareaId: number;
  onUploaded?: () => void;
  className?: string;
}

export function EvidenceUploader({ servicioId, tareaId, onUploaded, className }: EvidenceUploaderProps) {
  const [mode, setMode] = useState<"photo" | "video" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [fileType, setFileType] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadEvidencia();

  const handleFileSelected = (file: File, tipo: "photo" | "video") => {
    if (!file) return;
    setFileType(file.type);
    setMode(tipo);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;
    try {
      await uploadMutation.mutateAsync({
        servicio_id: servicioId,
        tarea_id: tareaId,
        tipo: mode!,
        archivo_base64: preview,
        content_type: fileType,
        comentario: comentario || undefined,
      });
      // Reset
      setPreview(null);
      setComentario("");
      setMode(null);
      onUploaded?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setComentario("");
    setMode(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  if (preview && mode) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-4 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {mode === "photo" ? "Vista previa de la foto" : "Video seleccionado"}
          </span>
          <button onClick={handleCancel} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {mode === "photo" ? (
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-contain rounded-lg bg-slate-50"
          />
        ) : (
          <video
            src={preview}
            className="w-full max-h-64 rounded-lg bg-slate-50"
            controls
          />
        )}

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Agregá un comentario sobre esta evidencia..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />

        <button
          onClick={handleUpload}
          disabled={uploadMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Subir evidencia
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Photo button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition flex-1 justify-center"
      >
        <Camera className="w-4 h-4" />
        Foto
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file, "photo");
        }}
      />

      {/* Video button */}
      <button
        onClick={() => videoInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition flex-1 justify-center"
      >
        <FileVideo className="w-4 h-4" />
        Video
      </button>
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file, "video");
        }}
      />
    </div>
  );
}

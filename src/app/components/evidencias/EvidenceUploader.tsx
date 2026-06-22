import { useState, useRef } from "react";
import { useUploadEvidencia } from "@/api/queries/useEvidencias.js";
import { cn } from "@/app/lib/utils";
import { Camera, Image, Upload, X, FileVideo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "./CameraCapture.js";
import heic2any from "heic2any";

interface EvidenceUploaderProps {
  servicioId: number;
  tareaId: number;
  onUploaded?: () => void;
  className?: string;
}

export function EvidenceUploader({ servicioId, tareaId, onUploaded, className }: EvidenceUploaderProps) {
  const [mode, setMode] = useState<"photo" | "video" | "camera" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [fileType, setFileType] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadEvidencia();

  const handleFileSelected = async (file: File, tipo: "photo" | "video") => {
    if (!file) return;
    setIsConverting(false);
    setFileType(file.type);
    setMode(tipo);

    // Detectar HEIC/HEIF por MIME type o extensión
    const esHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    let processedFile = file;

    if (esHeic) {
      if (tipo !== "photo") {
        toast.error("Los archivos HEIC/HEIF solo se pueden subir como foto");
        handleCancel();
        return;
      }
      setIsConverting(true);
      try {
        const blob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8,
        });
        const jpegBlob = blob instanceof Array ? blob[0] : blob;
        processedFile = new File(
          [jpegBlob],
          file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
          { type: "image/jpeg" },
        );
        setFileType("image/jpeg");
      } catch {
        toast.error("No se pudo convertir la imagen HEIC. Probá con otro formato.");
        setIsConverting(false);
        handleCancel();
        return;
      } finally {
        setIsConverting(false);
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(processedFile);
  };

  const handleCameraCapture = (dataUrl: string, mimeType: string) => {
    setFileType(mimeType);
    setMode("photo");
    setPreview(dataUrl);
  };

  const handleUpload = async () => {
    if (!preview) return;
    try {
      await uploadMutation.mutateAsync({
        servicio_id: servicioId,
        tarea_id: tareaId,
        tipo: "photo",
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

  // Camera mode: show live viewfinder
  if (mode === "camera") {
    return (
      <div className={cn("space-y-3", className)}>
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={handleCancel}
        />
        <button
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50 transition"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    );
  }

  if (isConverting) {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-6 text-sm text-slate-500", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        Convirtiendo imagen HEIC a JPEG...
      </div>
    );
  }

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
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Camera button (direct capture) */}
      <button
        onClick={() => setMode("camera")}
        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition flex-1 justify-center shadow-sm"
      >
        <Camera className="w-4 h-4" />
        Tomar foto
      </button>

      {/* Gallery button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition flex-1 justify-center"
      >
        <Image className="w-4 h-4" />
        Subir foto
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
        className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition flex-1 justify-center"
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

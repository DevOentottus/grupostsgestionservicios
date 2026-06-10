import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { comentariosApi } from "@/api/client.js";
import { toast } from "sonner";
import type { ComentarioDisplay } from "@shared/index.js";

export function useComentarios(servicioId: number) {
  return useQuery({
    queryKey: ["comentarios", servicioId],
    queryFn: async () => {
      const r = await comentariosApi.listar(servicioId);
      return r.data.data as ComentarioDisplay[];
    },
    enabled: !!servicioId,
  });
}

export function useCrearComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      servicioId,
      contenido,
      tarea_id,
    }: {
      servicioId: number;
      contenido: string;
      tarea_id?: number | null;
    }) => comentariosApi.crear(servicioId, { contenido, tarea_id }),
    onSuccess: (_, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ["comentarios", servicioId] });
      toast.success("Comentario agregado");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al agregar comentario"),
  });
}

export function useEliminarComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, servicioId }: { id: number; servicioId: number }) =>
      comentariosApi.eliminar(id),
    onSuccess: (_, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ["comentarios", servicioId] });
      toast.success("Comentario eliminado");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al eliminar comentario"),
  });
}

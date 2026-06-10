import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Usuario } from "@shared/index.js";

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async ({ signal }) => {
      console.log("[useUsuarios] queryFn EJECUTÁNDOSE");
      try {
        const r = await usuariosApi.listar();
        console.log("[useUsuarios] Respuesta:", r);
        return r.data.data as Usuario[];
      } catch (err) {
        console.error("[useUsuarios] Error en queryFn:", err);
        throw err;
      }
    },
  });
}

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => usuariosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuario creado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al crear"),
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usuariosApi.editar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuario actualizado");
    },
  });
}

export function useToggleUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usuariosApi.toggleEstado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Estado cambiado");
    },
  });
}

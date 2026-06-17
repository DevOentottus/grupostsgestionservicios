import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Usuario } from "@shared/index.js";

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const r = await usuariosApi.listar();
      return r.data.data as Usuario[];
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
    onError: (err: any) => {
      console.error("PUT /usuarios error:", err.response?.data);
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Error al actualizar");
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
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al cambiar estado"),
  });
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anuncios: {
        Row: {
          anuncio_activo: boolean
          anuncio_contenido: string
          anuncio_fecha_creacion: string
          anuncio_fecha_expiracion: string | null
          anuncio_fecha_publicacion: string
          anuncio_hora_creacion: string
          anuncio_hora_publicacion: string
          anuncio_id: number
          anuncio_prioridad: string
          anuncio_titulo: string
          area_id: number | null
          usuario_id: number
        }
        Insert: {
          anuncio_activo?: boolean
          anuncio_contenido: string
          anuncio_fecha_creacion?: string
          anuncio_fecha_expiracion?: string | null
          anuncio_fecha_publicacion?: string
          anuncio_hora_creacion?: string
          anuncio_hora_publicacion?: string
          anuncio_id?: number
          anuncio_prioridad?: string
          anuncio_titulo: string
          area_id?: number | null
          usuario_id: number
        }
        Update: {
          anuncio_activo?: boolean
          anuncio_contenido?: string
          anuncio_fecha_creacion?: string
          anuncio_fecha_expiracion?: string | null
          anuncio_fecha_publicacion?: string
          anuncio_hora_creacion?: string
          anuncio_hora_publicacion?: string
          anuncio_id?: number
          anuncio_prioridad?: string
          anuncio_titulo?: string
          area_id?: number | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "anuncios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      areacolaboradores: {
        Row: {
          area_id: number
          areacolaborador_es_principal: boolean
          areacolaborador_fecha_asignacion: string
          areacolaborador_id: number
          colaborador_id: number
        }
        Insert: {
          area_id: number
          areacolaborador_es_principal?: boolean
          areacolaborador_fecha_asignacion?: string
          areacolaborador_id?: number
          colaborador_id: number
        }
        Update: {
          area_id?: number
          areacolaborador_es_principal?: boolean
          areacolaborador_fecha_asignacion?: string
          areacolaborador_id?: number
          colaborador_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "areacolaboradores_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "areacolaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      areas: {
        Row: {
          area_descripcion: string | null
          area_encargado_id: number | null
          area_fecha_creacion: string
          area_id: number
          area_nombre: string
        }
        Insert: {
          area_descripcion?: string | null
          area_encargado_id?: number | null
          area_fecha_creacion?: string
          area_id?: number
          area_nombre: string
        }
        Update: {
          area_descripcion?: string | null
          area_encargado_id?: number | null
          area_fecha_creacion?: string
          area_id?: number
          area_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_area_encargado_id_fkey"
            columns: ["area_encargado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      auditoria: {
        Row: {
          auditoria_accion: string
          auditoria_detalle: Json | null
          auditoria_fecha: string
          auditoria_hora: string
          auditoria_id: number
          auditoria_registro_id: number | null
          auditoria_tabla: string
          usuario_id: number | null
        }
        Insert: {
          auditoria_accion: string
          auditoria_detalle?: Json | null
          auditoria_fecha?: string
          auditoria_hora?: string
          auditoria_id?: number
          auditoria_registro_id?: number | null
          auditoria_tabla: string
          usuario_id?: number | null
        }
        Update: {
          auditoria_accion?: string
          auditoria_detalle?: Json | null
          auditoria_fecha?: string
          auditoria_hora?: string
          auditoria_id?: number
          auditoria_registro_id?: number | null
          auditoria_tabla?: string
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      calificaciones: {
        Row: {
          calificacion_comentario: string | null
          calificacion_fecha: string
          calificacion_hora: string
          calificacion_id: number
          calificacion_observacion: string | null
          calificacion_puntaje: number
          calificacion_sugerencia: string | null
          cliente_id: number
          servicio_id: number
        }
        Insert: {
          calificacion_comentario?: string | null
          calificacion_fecha?: string
          calificacion_hora?: string
          calificacion_id?: number
          calificacion_observacion?: string | null
          calificacion_puntaje: number
          calificacion_sugerencia?: string | null
          cliente_id: number
          servicio_id: number
        }
        Update: {
          calificacion_comentario?: string | null
          calificacion_fecha?: string
          calificacion_hora?: string
          calificacion_id?: number
          calificacion_observacion?: string | null
          calificacion_puntaje?: number
          calificacion_sugerencia?: string | null
          cliente_id?: number
          servicio_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "calificaciones_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
        ]
      }
      clientes: {
        Row: {
          cliente_apellido_materno: string | null
          cliente_apellido_paterno: string
          cliente_correo: string | null
          cliente_direccion: string | null
          cliente_dni: string | null
          cliente_fecha_creacion: string
          cliente_id: number
          cliente_nombres: string
          cliente_telefono: string | null
        }
        Insert: {
          cliente_apellido_materno?: string | null
          cliente_apellido_paterno?: string
          cliente_correo?: string | null
          cliente_direccion?: string | null
          cliente_dni?: string | null
          cliente_fecha_creacion?: string
          cliente_id?: number
          cliente_nombres: string
          cliente_telefono?: string | null
        }
        Update: {
          cliente_apellido_materno?: string | null
          cliente_apellido_paterno?: string
          cliente_correo?: string | null
          cliente_direccion?: string | null
          cliente_dni?: string | null
          cliente_fecha_creacion?: string
          cliente_id?: number
          cliente_nombres?: string
          cliente_telefono?: string | null
        }
        Relationships: []
      }
      comentariosevidencias: {
        Row: {
          comentarioevidencia_id: number
          contenido: string
          created_at: string | null
          es_cliente: boolean | null
          evidencia_id: number
          usuario_id: number | null
        }
        Insert: {
          comentarioevidencia_id?: number
          contenido: string
          created_at?: string | null
          es_cliente?: boolean | null
          evidencia_id: number
          usuario_id?: number | null
        }
        Update: {
          comentarioevidencia_id?: number
          contenido?: string
          created_at?: string | null
          es_cliente?: boolean | null
          evidencia_id?: number
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comentariosevidencias_evidencia_id_fkey"
            columns: ["evidencia_id"]
            isOneToOne: false
            referencedRelation: "evidencias"
            referencedColumns: ["evidencia_id"]
          },
          {
            foreignKeyName: "comentariosevidencias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      evidencias: {
        Row: {
          archivo_url: string
          comentario_cliente: string | null
          comentario_colaborador: string | null
          created_at: string | null
          estado: string | null
          evidencia_id: number
          servicio_id: number
          submitted_at: string | null
          submitted_by: number | null
          tarea_id: number
          thumbnail_url: string | null
          tipo: string
        }
        Insert: {
          archivo_url: string
          comentario_cliente?: string | null
          comentario_colaborador?: string | null
          created_at?: string | null
          estado?: string | null
          evidencia_id?: number
          servicio_id: number
          submitted_at?: string | null
          submitted_by?: number | null
          tarea_id: number
          thumbnail_url?: string | null
          tipo: string
        }
        Update: {
          archivo_url?: string
          comentario_cliente?: string | null
          comentario_colaborador?: string | null
          created_at?: string | null
          estado?: string | null
          evidencia_id?: number
          servicio_id?: number
          submitted_at?: string | null
          submitted_by?: number | null
          tarea_id?: number
          thumbnail_url?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "evidencias_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "evidencias_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["tarea_id"]
          },
        ]
      }
      plantillas: {
        Row: {
          area_id: number | null
          plantilla_activa: boolean
          plantilla_descripcion: string | null
          plantilla_fecha_creacion: string
          plantilla_id: number
          plantilla_nombre: string
        }
        Insert: {
          area_id?: number | null
          plantilla_activa?: boolean
          plantilla_descripcion?: string | null
          plantilla_fecha_creacion?: string
          plantilla_id?: number
          plantilla_nombre: string
        }
        Update: {
          area_id?: number | null
          plantilla_activa?: boolean
          plantilla_descripcion?: string | null
          plantilla_fecha_creacion?: string
          plantilla_id?: number
          plantilla_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["area_id"]
          },
        ]
      }
      plantillatareas: {
        Row: {
          plantilla_id: number
          plantillatarea_id: number
          plantillatarea_modo_evidencia: string | null
          plantillatarea_orden: number
          plantillatarea_requiere_evidencia: boolean | null
          plantillatarea_titulo: string
        }
        Insert: {
          plantilla_id: number
          plantillatarea_id?: number
          plantillatarea_modo_evidencia?: string | null
          plantillatarea_orden?: number
          plantillatarea_requiere_evidencia?: boolean | null
          plantillatarea_titulo: string
        }
        Update: {
          plantilla_id?: number
          plantillatarea_id?: number
          plantillatarea_modo_evidencia?: string | null
          plantillatarea_orden?: number
          plantillatarea_requiere_evidencia?: boolean | null
          plantillatarea_titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantillatareas_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas"
            referencedColumns: ["plantilla_id"]
          },
        ]
      }
      serviciocolaboradores: {
        Row: {
          colaborador_id: number
          servicio_id: number
          serviciocolaborador_fecha_asignacion: string
          serviciocolaborador_id: number
        }
        Insert: {
          colaborador_id: number
          servicio_id: number
          serviciocolaborador_fecha_asignacion?: string
          serviciocolaborador_id?: number
        }
        Update: {
          colaborador_id?: number
          servicio_id?: number
          serviciocolaborador_fecha_asignacion?: string
          serviciocolaborador_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "serviciocolaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "serviciocolaboradores_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
        ]
      }
      serviciocomentarios: {
        Row: {
          servicio_id: number
          serviciocomentario_contenido: string
          serviciocomentario_fecha: string
          serviciocomentario_hora: string
          serviciocomentario_id: number
          usuario_id: number
        }
        Insert: {
          servicio_id: number
          serviciocomentario_contenido: string
          serviciocomentario_fecha?: string
          serviciocomentario_hora?: string
          serviciocomentario_id?: number
          usuario_id: number
        }
        Update: {
          servicio_id?: number
          serviciocomentario_contenido?: string
          serviciocomentario_fecha?: string
          serviciocomentario_hora?: string
          serviciocomentario_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "serviciocomentarios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "serviciocomentarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      servicios: {
        Row: {
          area_id: number | null
          cliente_apellido_materno: string | null
          cliente_apellido_paterno: string | null
          cliente_dni: string | null
          cliente_id: number
          cliente_nombres: string | null
          cliente_telefono: string | null
          id_plantilla_inicial: number | null
          plantilla_id: number | null
          servicio_cliente_reporte: string | null
          servicio_codigo: string
          servicio_codigo_acceso: string | null
          servicio_colaborador_desactiva: boolean | null
          servicio_descripcion: string | null
          servicio_descripcion_accesorio: string | null
          servicio_descripcion_equipo: string | null
          servicio_detalles_accesorio: string | null
          servicio_detalles_equipo: string | null
          servicio_diagnostico_inicial: string | null
          servicio_estado: string
          servicio_fecha_creacion: string
          servicio_fecha_fin: string | null
          servicio_fecha_inicio: string | null
          servicio_hora_creacion: string
          servicio_hora_fin: string | null
          servicio_hora_inicio: string | null
          servicio_id: number
          servicio_modo_evidencia: string | null
          servicio_nombre: string
          servicio_permite_evidencia: boolean | null
          servicio_serie_equipo: string | null
          servicio_tiempo_estimado: number | null
          tecnico_principal_id: number | null
        }
        Insert: {
          area_id?: number | null
          cliente_apellido_materno?: string | null
          cliente_apellido_paterno?: string | null
          cliente_dni?: string | null
          cliente_id: number
          cliente_nombres?: string | null
          cliente_telefono?: string | null
          id_plantilla_inicial?: number | null
          plantilla_id?: number | null
          servicio_cliente_reporte?: string | null
          servicio_codigo: string
          servicio_codigo_acceso?: string | null
          servicio_colaborador_desactiva?: boolean | null
          servicio_descripcion?: string | null
          servicio_descripcion_accesorio?: string | null
          servicio_descripcion_equipo?: string | null
          servicio_detalles_accesorio?: string | null
          servicio_detalles_equipo?: string | null
          servicio_diagnostico_inicial?: string | null
          servicio_estado?: string
          servicio_fecha_creacion?: string
          servicio_fecha_fin?: string | null
          servicio_fecha_inicio?: string | null
          servicio_hora_creacion?: string
          servicio_hora_fin?: string | null
          servicio_hora_inicio?: string | null
          servicio_id?: number
          servicio_modo_evidencia?: string | null
          servicio_nombre: string
          servicio_permite_evidencia?: boolean | null
          servicio_serie_equipo?: string | null
          servicio_tiempo_estimado?: number | null
          tecnico_principal_id?: number | null
        }
        Update: {
          area_id?: number | null
          cliente_apellido_materno?: string | null
          cliente_apellido_paterno?: string | null
          cliente_dni?: string | null
          cliente_id?: number
          cliente_nombres?: string | null
          cliente_telefono?: string | null
          id_plantilla_inicial?: number | null
          plantilla_id?: number | null
          servicio_cliente_reporte?: string | null
          servicio_codigo?: string
          servicio_codigo_acceso?: string | null
          servicio_colaborador_desactiva?: boolean | null
          servicio_descripcion?: string | null
          servicio_descripcion_accesorio?: string | null
          servicio_descripcion_equipo?: string | null
          servicio_detalles_accesorio?: string | null
          servicio_detalles_equipo?: string | null
          servicio_diagnostico_inicial?: string | null
          servicio_estado?: string
          servicio_fecha_creacion?: string
          servicio_fecha_fin?: string | null
          servicio_fecha_inicio?: string | null
          servicio_hora_creacion?: string
          servicio_hora_fin?: string | null
          servicio_hora_inicio?: string | null
          servicio_id?: number
          servicio_modo_evidencia?: string | null
          servicio_nombre?: string
          servicio_permite_evidencia?: boolean | null
          servicio_serie_equipo?: string | null
          servicio_tiempo_estimado?: number | null
          tecnico_principal_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "servicios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "servicios_id_plantilla_inicial_fkey"
            columns: ["id_plantilla_inicial"]
            isOneToOne: false
            referencedRelation: "plantillas"
            referencedColumns: ["plantilla_id"]
          },
          {
            foreignKeyName: "servicios_tecnico_principal_id_fkey"
            columns: ["tecnico_principal_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      servicios_plantillas: {
        Row: {
          plantilla_id: number
          servicio_id: number
        }
        Insert: {
          plantilla_id: number
          servicio_id: number
        }
        Update: {
          plantilla_id?: number
          servicio_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicios_plantillas_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas"
            referencedColumns: ["plantilla_id"]
          },
          {
            foreignKeyName: "servicios_plantillas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
        ]
      }
      serviciovisitas: {
        Row: {
          servicio_id: number
          serviciovisita_fecha: string
          serviciovisita_hora: string
          serviciovisita_id: number
          serviciovisita_ip: string | null
          serviciovisita_user_agent: string | null
        }
        Insert: {
          servicio_id: number
          serviciovisita_fecha: string
          serviciovisita_hora: string
          serviciovisita_id?: number
          serviciovisita_ip?: string | null
          serviciovisita_user_agent?: string | null
        }
        Update: {
          servicio_id?: number
          serviciovisita_fecha?: string
          serviciovisita_hora?: string
          serviciovisita_id?: number
          serviciovisita_ip?: string | null
          serviciovisita_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serviciovisitas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          atendido_por: number | null
          solicitud_descripcion: string
          solicitud_estado: string
          solicitud_fecha_atencion: string | null
          solicitud_fecha_creacion: string
          solicitud_hora_atencion: string | null
          solicitud_hora_creacion: string
          solicitud_id: number
          solicitud_prioridad: string
          solicitud_respuesta: string | null
          solicitud_tipo: string
          usuario_id: number
        }
        Insert: {
          atendido_por?: number | null
          solicitud_descripcion: string
          solicitud_estado?: string
          solicitud_fecha_atencion?: string | null
          solicitud_fecha_creacion?: string
          solicitud_hora_atencion?: string | null
          solicitud_hora_creacion?: string
          solicitud_id?: number
          solicitud_prioridad?: string
          solicitud_respuesta?: string | null
          solicitud_tipo?: string
          usuario_id: number
        }
        Update: {
          atendido_por?: number | null
          solicitud_descripcion?: string
          solicitud_estado?: string
          solicitud_fecha_atencion?: string | null
          solicitud_fecha_creacion?: string
          solicitud_hora_atencion?: string | null
          solicitud_hora_creacion?: string
          solicitud_id?: number
          solicitud_prioridad?: string
          solicitud_respuesta?: string | null
          solicitud_tipo?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_atendido_por_fkey"
            columns: ["atendido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "solicitudes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tareacomentarios: {
        Row: {
          tarea_id: number
          tareacomentario_contenido: string
          tareacomentario_fecha: string
          tareacomentario_hora: string
          tareacomentario_id: number
          usuario_id: number
        }
        Insert: {
          tarea_id: number
          tareacomentario_contenido: string
          tareacomentario_fecha?: string
          tareacomentario_hora?: string
          tareacomentario_id?: number
          usuario_id: number
        }
        Update: {
          tarea_id?: number
          tareacomentario_contenido?: string
          tareacomentario_fecha?: string
          tareacomentario_hora?: string
          tareacomentario_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tareacomentarios_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["tarea_id"]
          },
          {
            foreignKeyName: "tareacomentarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tareas: {
        Row: {
          servicio_id: number
          tarea_completado_por: number | null
          tarea_estado: string
          tarea_evidencia_desactivada: boolean | null
          tarea_fecha_completado: string | null
          tarea_fecha_creacion: string
          tarea_hora_completado: string | null
          tarea_hora_creacion: string
          tarea_hora_fin: string | null
          tarea_hora_inicio: string | null
          tarea_id: number
          tarea_modo_evidencia: string | null
          tarea_orden: number
          tarea_requiere_evidencia: boolean | null
          tarea_tiempo_real: number | null
          tarea_titulo: string
        }
        Insert: {
          servicio_id: number
          tarea_completado_por?: number | null
          tarea_estado?: string
          tarea_evidencia_desactivada?: boolean | null
          tarea_fecha_completado?: string | null
          tarea_fecha_creacion?: string
          tarea_hora_completado?: string | null
          tarea_hora_creacion?: string
          tarea_hora_fin?: string | null
          tarea_hora_inicio?: string | null
          tarea_id?: number
          tarea_modo_evidencia?: string | null
          tarea_orden?: number
          tarea_requiere_evidencia?: boolean | null
          tarea_tiempo_real?: number | null
          tarea_titulo: string
        }
        Update: {
          servicio_id?: number
          tarea_completado_por?: number | null
          tarea_estado?: string
          tarea_evidencia_desactivada?: boolean | null
          tarea_fecha_completado?: string | null
          tarea_fecha_creacion?: string
          tarea_hora_completado?: string | null
          tarea_hora_creacion?: string
          tarea_hora_fin?: string | null
          tarea_hora_inicio?: string | null
          tarea_id?: number
          tarea_modo_evidencia?: string | null
          tarea_orden?: number
          tarea_requiere_evidencia?: boolean | null
          tarea_tiempo_real?: number | null
          tarea_titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["servicio_id"]
          },
          {
            foreignKeyName: "tareas_tarea_completado_por_fkey"
            columns: ["tarea_completado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tiempo_tracking: {
        Row: {
          created_at: string | null
          tarea_id: number
          tracking_fin: string | null
          tracking_id: number
          tracking_inicio: string
          tracking_pausa: string | null
          usuario_id: number
        }
        Insert: {
          created_at?: string | null
          tarea_id: number
          tracking_fin?: string | null
          tracking_id?: number
          tracking_inicio?: string
          tracking_pausa?: string | null
          usuario_id: number
        }
        Update: {
          created_at?: string | null
          tarea_id?: number
          tracking_fin?: string | null
          tracking_id?: number
          tracking_inicio?: string
          tracking_pausa?: string | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiempo_tracking_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["tarea_id"]
          },
          {
            foreignKeyName: "tiempo_tracking_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      usuarios: {
        Row: {
          usuario_activo: boolean
          usuario_apellido_materno: string | null
          usuario_apellido_paterno: string
          usuario_contrasena: string
          usuario_correo: string
          usuario_disponible: boolean
          usuario_dni: string | null
          usuario_fecha_creacion: string
          usuario_hora_creacion: string
          usuario_id: number
          usuario_nombres: string
          usuario_rol: string
          usuario_telefono: string | null
          usuario_ultimo_login: string | null
          usuario_username: string
        }
        Insert: {
          usuario_activo?: boolean
          usuario_apellido_materno?: string | null
          usuario_apellido_paterno?: string
          usuario_contrasena: string
          usuario_correo: string
          usuario_disponible?: boolean
          usuario_dni?: string | null
          usuario_fecha_creacion?: string
          usuario_hora_creacion?: string
          usuario_id?: number
          usuario_nombres: string
          usuario_rol: string
          usuario_telefono?: string | null
          usuario_ultimo_login?: string | null
          usuario_username: string
        }
        Update: {
          usuario_activo?: boolean
          usuario_apellido_materno?: string | null
          usuario_apellido_paterno?: string
          usuario_contrasena?: string
          usuario_correo?: string
          usuario_disponible?: boolean
          usuario_dni?: string | null
          usuario_fecha_creacion?: string
          usuario_hora_creacion?: string
          usuario_id?: number
          usuario_nombres?: string
          usuario_rol?: string
          usuario_telefono?: string | null
          usuario_ultimo_login?: string | null
          usuario_username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

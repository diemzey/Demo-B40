// Generado desde el proyecto Supabase `Jornada40` (raxjivzqypbpnmffhmos).
// Regenerar tras cada migración: supabase gen types typescript --project-id raxjivzqypbpnmffhmos
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asignaciones: {
        Row: {
          created_at: string
          descanso_min: number
          empleado_id: string
          es_domingo: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas: number | null
          id: string
          inicio: string
          plantilla_id: string | null
          semana_iso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descanso_min?: number
          empleado_id: string
          es_domingo?: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas?: number | null
          id?: string
          inicio: string
          plantilla_id?: string | null
          semana_iso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descanso_min?: number
          empleado_id?: string
          es_domingo?: boolean | null
          escenario_id?: string
          fin?: string
          habilidad_id?: string
          horas?: number | null
          id?: string
          inicio?: string
          plantilla_id?: string | null
          semana_iso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_horas_semana"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
          {
            foreignKeyName: "asignaciones_habilidad_id_fkey"
            columns: ["habilidad_id"]
            isOneToOne: false
            referencedRelation: "habilidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_turno"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_2026q1: {
        Row: {
          created_at: string
          descanso_min: number
          empleado_id: string
          es_domingo: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas: number | null
          id: string
          inicio: string
          plantilla_id: string | null
          semana_iso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descanso_min?: number
          empleado_id: string
          es_domingo?: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas?: number | null
          id?: string
          inicio: string
          plantilla_id?: string | null
          semana_iso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descanso_min?: number
          empleado_id?: string
          es_domingo?: boolean | null
          escenario_id?: string
          fin?: string
          habilidad_id?: string
          horas?: number | null
          id?: string
          inicio?: string
          plantilla_id?: string | null
          semana_iso?: string
          updated_at?: string
        }
        Relationships: []
      }
      asignaciones_2026q2: {
        Row: {
          created_at: string
          descanso_min: number
          empleado_id: string
          es_domingo: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas: number | null
          id: string
          inicio: string
          plantilla_id: string | null
          semana_iso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descanso_min?: number
          empleado_id: string
          es_domingo?: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas?: number | null
          id?: string
          inicio: string
          plantilla_id?: string | null
          semana_iso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descanso_min?: number
          empleado_id?: string
          es_domingo?: boolean | null
          escenario_id?: string
          fin?: string
          habilidad_id?: string
          horas?: number | null
          id?: string
          inicio?: string
          plantilla_id?: string | null
          semana_iso?: string
          updated_at?: string
        }
        Relationships: []
      }
      asignaciones_2026q3: {
        Row: {
          created_at: string
          descanso_min: number
          empleado_id: string
          es_domingo: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas: number | null
          id: string
          inicio: string
          plantilla_id: string | null
          semana_iso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descanso_min?: number
          empleado_id: string
          es_domingo?: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas?: number | null
          id?: string
          inicio: string
          plantilla_id?: string | null
          semana_iso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descanso_min?: number
          empleado_id?: string
          es_domingo?: boolean | null
          escenario_id?: string
          fin?: string
          habilidad_id?: string
          horas?: number | null
          id?: string
          inicio?: string
          plantilla_id?: string | null
          semana_iso?: string
          updated_at?: string
        }
        Relationships: []
      }
      asignaciones_2026q4: {
        Row: {
          created_at: string
          descanso_min: number
          empleado_id: string
          es_domingo: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas: number | null
          id: string
          inicio: string
          plantilla_id: string | null
          semana_iso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descanso_min?: number
          empleado_id: string
          es_domingo?: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas?: number | null
          id?: string
          inicio: string
          plantilla_id?: string | null
          semana_iso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descanso_min?: number
          empleado_id?: string
          es_domingo?: boolean | null
          escenario_id?: string
          fin?: string
          habilidad_id?: string
          horas?: number | null
          id?: string
          inicio?: string
          plantilla_id?: string | null
          semana_iso?: string
          updated_at?: string
        }
        Relationships: []
      }
      asignaciones_default: {
        Row: {
          created_at: string
          descanso_min: number
          empleado_id: string
          es_domingo: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas: number | null
          id: string
          inicio: string
          plantilla_id: string | null
          semana_iso: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descanso_min?: number
          empleado_id: string
          es_domingo?: boolean | null
          escenario_id: string
          fin: string
          habilidad_id: string
          horas?: number | null
          id?: string
          inicio: string
          plantilla_id?: string | null
          semana_iso: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descanso_min?: number
          empleado_id?: string
          es_domingo?: boolean | null
          escenario_id?: string
          fin?: string
          habilidad_id?: string
          horas?: number | null
          id?: string
          inicio?: string
          plantilla_id?: string | null
          semana_iso?: string
          updated_at?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          antes: Json | null
          despues: Json | null
          en: string
          escenario_id: string | null
          fila_id: string | null
          id: number
          operacion: string
          tabla: string
          usuario: string | null
        }
        Insert: {
          antes?: Json | null
          despues?: Json | null
          en?: string
          escenario_id?: string | null
          fila_id?: string | null
          id?: number
          operacion: string
          tabla: string
          usuario?: string | null
        }
        Update: {
          antes?: Json | null
          despues?: Json | null
          en?: string
          escenario_id?: string | null
          fila_id?: string | null
          id?: number
          operacion?: string
          tabla?: string
          usuario?: string | null
        }
        Relationships: []
      }
      cobertura_intervalo: {
        Row: {
          asignado_caja: number
          asignado_total: number
          es_pico: boolean
          escenario_id: string
          inicio: string
          requerido_caja: number
          requerido_total: number
        }
        Insert: {
          asignado_caja?: number
          asignado_total?: number
          es_pico?: boolean
          escenario_id: string
          inicio: string
          requerido_caja?: number
          requerido_total?: number
        }
        Update: {
          asignado_caja?: number
          asignado_total?: number
          es_pico?: boolean
          escenario_id?: string
          inicio?: string
          requerido_caja?: number
          requerido_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobertura_intervalo_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobertura_intervalo_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "cobertura_intervalo_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
        ]
      }
      demanda_intervalo: {
        Row: {
          created_at: string
          es_pico: boolean
          fin: string
          id: string
          inicio: string
          pronostico_id: string
          requerido_caja: number
          requerido_total: number
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          es_pico?: boolean
          fin: string
          id?: string
          inicio: string
          pronostico_id: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          es_pico?: boolean
          fin?: string
          id?: string
          inicio?: string
          pronostico_id?: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: [
          {
            foreignKeyName: "demanda_intervalo_pronostico_id_fkey"
            columns: ["pronostico_id"]
            isOneToOne: false
            referencedRelation: "pronosticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_intervalo_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_intervalo_2026q1: {
        Row: {
          created_at: string
          es_pico: boolean
          fin: string
          id: string
          inicio: string
          pronostico_id: string
          requerido_caja: number
          requerido_total: number
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          es_pico?: boolean
          fin: string
          id?: string
          inicio: string
          pronostico_id: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          es_pico?: boolean
          fin?: string
          id?: string
          inicio?: string
          pronostico_id?: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      demanda_intervalo_2026q2: {
        Row: {
          created_at: string
          es_pico: boolean
          fin: string
          id: string
          inicio: string
          pronostico_id: string
          requerido_caja: number
          requerido_total: number
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          es_pico?: boolean
          fin: string
          id?: string
          inicio: string
          pronostico_id: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          es_pico?: boolean
          fin?: string
          id?: string
          inicio?: string
          pronostico_id?: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      demanda_intervalo_2026q3: {
        Row: {
          created_at: string
          es_pico: boolean
          fin: string
          id: string
          inicio: string
          pronostico_id: string
          requerido_caja: number
          requerido_total: number
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          es_pico?: boolean
          fin: string
          id?: string
          inicio: string
          pronostico_id: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          es_pico?: boolean
          fin?: string
          id?: string
          inicio?: string
          pronostico_id?: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      demanda_intervalo_2026q4: {
        Row: {
          created_at: string
          es_pico: boolean
          fin: string
          id: string
          inicio: string
          pronostico_id: string
          requerido_caja: number
          requerido_total: number
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          es_pico?: boolean
          fin: string
          id?: string
          inicio: string
          pronostico_id: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          es_pico?: boolean
          fin?: string
          id?: string
          inicio?: string
          pronostico_id?: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      demanda_intervalo_default: {
        Row: {
          created_at: string
          es_pico: boolean
          fin: string
          id: string
          inicio: string
          pronostico_id: string
          requerido_caja: number
          requerido_total: number
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          es_pico?: boolean
          fin: string
          id?: string
          inicio: string
          pronostico_id: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          es_pico?: boolean
          fin?: string
          id?: string
          inicio?: string
          pronostico_id?: string
          requerido_caja?: number
          requerido_total?: number
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      disponibilidad: {
        Row: {
          created_at: string
          dia_semana: number
          empleado_id: string
          hora_fin: string
          hora_inicio: string
          id: string
          updated_at: string
          vigente_desde: string | null
          vigente_hasta: string | null
        }
        Insert: {
          created_at?: string
          dia_semana: number
          empleado_id: string
          hora_fin: string
          hora_inicio: string
          id?: string
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          created_at?: string
          dia_semana?: number
          empleado_id?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          updated_at?: string
          vigente_desde?: string | null
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidad_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilidad_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_horas_semana"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      empleado_habilidades: {
        Row: {
          certificado_hasta: string | null
          created_at: string
          empleado_id: string
          habilidad_id: string
        }
        Insert: {
          certificado_hasta?: string | null
          created_at?: string
          empleado_id: string
          habilidad_id: string
        }
        Update: {
          certificado_hasta?: string | null
          created_at?: string
          empleado_id?: string
          habilidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleado_habilidades_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_habilidades_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_horas_semana"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "empleado_habilidades_habilidad_id_fkey"
            columns: ["habilidad_id"]
            isOneToOne: false
            referencedRelation: "habilidades"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean
          apellido: string
          clave_externa: string | null
          created_at: string
          fecha_alta: string | null
          foto_url: string | null
          id: string
          jornada_contratada_horas: number | null
          max_horas_semana: number
          nombre: string
          puesto: string | null
          puesto_id: string | null
          sucursal_id: string
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          clave_externa?: string | null
          created_at?: string
          fecha_alta?: string | null
          foto_url?: string | null
          id?: string
          jornada_contratada_horas?: number | null
          max_horas_semana?: number
          nombre: string
          puesto?: string | null
          puesto_id?: string | null
          sucursal_id: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          clave_externa?: string | null
          created_at?: string
          fecha_alta?: string | null
          foto_url?: string | null
          id?: string
          jornada_contratada_horas?: number | null
          max_horas_semana?: number
          nombre?: string
          puesto?: string | null
          puesto_id?: string | null
          sucursal_id?: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          costo_hora_default: number
          created_at: string
          id: string
          nombre: string
          rfc: string | null
          tope_objetivo: number
          updated_at: string
        }
        Insert: {
          costo_hora_default?: number
          created_at?: string
          id?: string
          nombre: string
          rfc?: string | null
          tope_objetivo?: number
          updated_at?: string
        }
        Update: {
          costo_hora_default?: number
          created_at?: string
          id?: string
          nombre?: string
          rfc?: string | null
          tope_objetivo?: number
          updated_at?: string
        }
        Relationships: []
      }
      escenarios: {
        Row: {
          creado_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_escenario"]
          id: string
          padre_id: string | null
          parametros: Json
          pronostico_id: string | null
          publicado_en: string | null
          reglas_id: string
          semana_iso: string
          sucursal_id: string
          tipo: Database["public"]["Enums"]["tipo_escenario"]
          tope_semanal: number
          updated_at: string
          version: number
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_escenario"]
          id?: string
          padre_id?: string | null
          parametros?: Json
          pronostico_id?: string | null
          publicado_en?: string | null
          reglas_id: string
          semana_iso: string
          sucursal_id: string
          tipo: Database["public"]["Enums"]["tipo_escenario"]
          tope_semanal: number
          updated_at?: string
          version?: number
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_escenario"]
          id?: string
          padre_id?: string | null
          parametros?: Json
          pronostico_id?: string | null
          publicado_en?: string | null
          reglas_id?: string
          semana_iso?: string
          sucursal_id?: string
          tipo?: Database["public"]["Enums"]["tipo_escenario"]
          tope_semanal?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "escenarios_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escenarios_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "escenarios_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
          {
            foreignKeyName: "escenarios_pronostico_id_fkey"
            columns: ["pronostico_id"]
            isOneToOne: false
            referencedRelation: "pronosticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escenarios_reglas_id_fkey"
            columns: ["reglas_id"]
            isOneToOne: false
            referencedRelation: "reglas_laborales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escenarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      habilidades: {
        Row: {
          clave: string
          created_at: string
          empresa_id: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          empresa_id: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habilidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          created_at: string
          cruza_medianoche: boolean
          empleado_id: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas: number | null
          id: string
          importacion_id: string | null
          minutos_descanso: number
          origen: Database["public"]["Enums"]["origen_horario"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          cruza_medianoche?: boolean
          empleado_id: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas?: number | null
          id?: string
          importacion_id?: string | null
          minutos_descanso?: number
          origen?: Database["public"]["Enums"]["origen_horario"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          cruza_medianoche?: boolean
          empleado_id?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          horas?: number | null
          id?: string
          importacion_id?: string | null
          minutos_descanso?: number
          origen?: Database["public"]["Enums"]["origen_horario"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_horas_semana"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "horarios_importacion_id_fkey"
            columns: ["importacion_id"]
            isOneToOne: false
            referencedRelation: "importaciones_csv"
            referencedColumns: ["id"]
          },
        ]
      }
      hubs: {
        Row: {
          ciudad: string | null
          created_at: string
          empresa_id: string
          estado: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          empresa_id: string
          estado?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          empresa_id?: string
          estado?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hubs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      importaciones_csv: {
        Row: {
          created_at: string
          errores: Json
          estado: Database["public"]["Enums"]["estado_importacion"]
          filas_error: number
          filas_ok: number
          filas_totales: number
          huella: string | null
          id: string
          nombre_archivo: string
          sucursal_id: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          errores?: Json
          estado?: Database["public"]["Enums"]["estado_importacion"]
          filas_error?: number
          filas_ok?: number
          filas_totales?: number
          huella?: string | null
          id?: string
          nombre_archivo: string
          sucursal_id: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          errores?: Json
          estado?: Database["public"]["Enums"]["estado_importacion"]
          filas_error?: number
          filas_ok?: number
          filas_totales?: number
          huella?: string | null
          id?: string
          nombre_archivo?: string
          sucursal_id?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "importaciones_csv_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importaciones_csv_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          apellido: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string
        }
        Insert: {
          apellido?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          updated_at?: string
        }
        Update: {
          apellido?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_turno: {
        Row: {
          activa: boolean
          clave: string
          created_at: string
          descanso_min: number
          duracion_min: number
          empresa_id: string
          hora_inicio: string
          id: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          clave: string
          created_at?: string
          descanso_min?: number
          duracion_min: number
          empresa_id: string
          hora_inicio: string
          id?: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          clave?: string
          created_at?: string
          descanso_min?: number
          duracion_min?: number
          empresa_id?: string
          hora_inicio?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_turno_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pronosticos: {
        Row: {
          created_at: string
          generado_en: string
          id: string
          metodo: string
          parametros: Json
          semana_iso: string
          sucursal_id: string
        }
        Insert: {
          created_at?: string
          generado_en?: string
          id?: string
          metodo?: string
          parametros?: Json
          semana_iso: string
          sucursal_id: string
        }
        Update: {
          created_at?: string
          generado_en?: string
          id?: string
          metodo?: string
          parametros?: Json
          semana_iso?: string
          sucursal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pronosticos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      puestos: {
        Row: {
          clave: string
          created_at: string
          empresa_id: string
          habilidad_id: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          empresa_id: string
          habilidad_id?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          empresa_id?: string
          habilidad_id?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "puestos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puestos_habilidad_id_fkey"
            columns: ["habilidad_id"]
            isOneToOne: false
            referencedRelation: "habilidades"
            referencedColumns: ["id"]
          },
        ]
      }
      reglas_laborales: {
        Row: {
          created_at: string
          descanso_entre_turnos_horas: number
          empresa_id: string | null
          factor_doble: number
          factor_triple: number
          horas_dobles_max: number
          id: string
          max_dias_semana: number
          max_horas_dia: number
          prima_dominical_pct: number
          tope_semanal: number
          updated_at: string
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          descanso_entre_turnos_horas?: number
          empresa_id?: string | null
          factor_doble?: number
          factor_triple?: number
          horas_dobles_max?: number
          id?: string
          max_dias_semana?: number
          max_horas_dia?: number
          prima_dominical_pct?: number
          tope_semanal: number
          updated_at?: string
          vigente_desde: string
        }
        Update: {
          created_at?: string
          descanso_entre_turnos_horas?: number
          empresa_id?: string | null
          factor_doble?: number
          factor_triple?: number
          horas_dobles_max?: number
          id?: string
          max_dias_semana?: number
          max_horas_dia?: number
          prima_dominical_pct?: number
          tope_semanal?: number
          updated_at?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "reglas_laborales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      resumen_escenario: {
        Row: {
          calculado_en: string
          costo_dobles: number
          costo_prima_dominical: number
          costo_regular: number
          costo_sobrestaffing: number
          costo_total: number
          costo_triples: number
          deficit_pico_horas: number
          escenario_id: string
          horas_dobles: number
          horas_domingo: number
          horas_regulares: number
          horas_sobrestaffing: number
          horas_totales: number
          horas_triples: number
          intervalos_pico: number
          intervalos_pico_cubiertos: number
        }
        Insert: {
          calculado_en?: string
          costo_dobles?: number
          costo_prima_dominical?: number
          costo_regular?: number
          costo_sobrestaffing?: number
          costo_total?: number
          costo_triples?: number
          deficit_pico_horas?: number
          escenario_id: string
          horas_dobles?: number
          horas_domingo?: number
          horas_regulares?: number
          horas_sobrestaffing?: number
          horas_totales?: number
          horas_triples?: number
          intervalos_pico?: number
          intervalos_pico_cubiertos?: number
        }
        Update: {
          calculado_en?: string
          costo_dobles?: number
          costo_prima_dominical?: number
          costo_regular?: number
          costo_sobrestaffing?: number
          costo_total?: number
          costo_triples?: number
          deficit_pico_horas?: number
          escenario_id?: string
          horas_dobles?: number
          horas_domingo?: number
          horas_regulares?: number
          horas_sobrestaffing?: number
          horas_totales?: number
          horas_triples?: number
          intervalos_pico?: number
          intervalos_pico_cubiertos?: number
        }
        Relationships: [
          {
            foreignKeyName: "resumen_escenario_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: true
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumen_escenario_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: true
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "resumen_escenario_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: true
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
        ]
      }
      sucursales: {
        Row: {
          ciudad: string | null
          created_at: string
          direccion: string | null
          hub_id: string
          id: string
          nombre: string
          updated_at: string
          zona_horaria: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          hub_id: string
          id?: string
          nombre: string
          updated_at?: string
          zona_horaria?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          hub_id?: string
          id?: string
          nombre?: string
          updated_at?: string
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      tabuladores: {
        Row: {
          created_at: string
          id: string
          prima_dominical_pct: number
          puesto_id: string
          salario_hora: number
          updated_at: string
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          id?: string
          prima_dominical_pct?: number
          puesto_id: string
          salario_hora: number
          updated_at?: string
          vigente_desde: string
        }
        Update: {
          created_at?: string
          id?: string
          prima_dominical_pct?: number
          puesto_id?: string
          salario_hora?: number
          updated_at?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabuladores_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puestos"
            referencedColumns: ["id"]
          },
        ]
      }
      topes_semanales: {
        Row: {
          anio: number
          tope_horas: number
        }
        Insert: {
          anio: number
          tope_horas: number
        }
        Update: {
          anio?: number
          tope_horas?: number
        }
        Relationships: []
      }
      trafico_observado: {
        Row: {
          created_at: string
          fin: string
          id: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          fin: string
          id?: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          fin?: string
          id?: string
          inicio?: string
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: [
          {
            foreignKeyName: "trafico_observado_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      trafico_observado_2026q1: {
        Row: {
          created_at: string
          fin: string
          id: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          fin: string
          id?: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          fin?: string
          id?: string
          inicio?: string
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      trafico_observado_2026q2: {
        Row: {
          created_at: string
          fin: string
          id: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          fin: string
          id?: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          fin?: string
          id?: string
          inicio?: string
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      trafico_observado_2026q3: {
        Row: {
          created_at: string
          fin: string
          id: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          fin: string
          id?: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          fin?: string
          id?: string
          inicio?: string
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      trafico_observado_2026q4: {
        Row: {
          created_at: string
          fin: string
          id: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          fin: string
          id?: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          fin?: string
          id?: string
          inicio?: string
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
      trafico_observado_default: {
        Row: {
          created_at: string
          fin: string
          id: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico: number
          ventas: number
        }
        Insert: {
          created_at?: string
          fin: string
          id?: string
          inicio: string
          semana_iso: string
          sucursal_id: string
          trafico?: number
          ventas?: number
        }
        Update: {
          created_at?: string
          fin?: string
          id?: string
          inicio?: string
          semana_iso?: string
          sucursal_id?: string
          trafico?: number
          ventas?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_ahorro_escenario: {
        Row: {
          ahorro_dobles: number | null
          ahorro_mxn: number | null
          ahorro_pct: number | null
          ahorro_prima: number | null
          ahorro_sobrestaffing: number | null
          ahorro_triples: number | null
          cobertura_pico_baseline_pct: number | null
          cobertura_pico_propuesta_pct: number | null
          costo_total_baseline: number | null
          costo_total_propuesta: number | null
          deficit_pico_horas_propuesta: number | null
          escenario_baseline_id: string | null
          escenario_propuesta_id: string | null
          horas_baseline: number | null
          horas_propuesta: number | null
          semana_iso: string | null
          sucursal_id: string | null
          tope_semanal: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escenarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_asignacion_horas_semana: {
        Row: {
          dias_trabajados: number | null
          empleado_id: string | null
          escenario_id: string | null
          horas: number | null
          horas_domingo: number | null
          semana_iso: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_horas_semana"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
        ]
      }
      v_costo_empleado_semana: {
        Row: {
          costo_dobles: number | null
          costo_prima_dominical: number | null
          costo_regular: number | null
          costo_total: number | null
          costo_triples: number | null
          dias_trabajados: number | null
          empleado_id: string | null
          escenario_id: string | null
          horas: number | null
          horas_dobles: number | null
          horas_domingo: number | null
          horas_regulares: number | null
          horas_triples: number | null
          semana_iso: string | null
          sucursal_id: string | null
          tarifa: number | null
          tope: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_horas_semana"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "asignaciones_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
          {
            foreignKeyName: "escenarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_horas_semana: {
        Row: {
          empleado_id: string | null
          horas_semana: number | null
          semana_iso: string | null
          sucursal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_resumen_sucursal_semana: {
        Row: {
          colaboradores: number | null
          fuera_de_norma: number | null
          horas_al_doble: number | null
          horas_totales: number | null
          semana_iso: string | null
          sucursal_id: string | null
          tope_horas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_subdotacion_pico: {
        Row: {
          asignado_total: number | null
          deficit: number | null
          escenario_id: string | null
          inicio: string | null
          requerido_total: number | null
          semana_iso: string | null
          sucursal_id: string | null
          tipo: Database["public"]["Enums"]["tipo_escenario"] | null
        }
        Relationships: [
          {
            foreignKeyName: "cobertura_intervalo_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "escenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobertura_intervalo_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_baseline_id"]
          },
          {
            foreignKeyName: "cobertura_intervalo_escenario_id_fkey"
            columns: ["escenario_id"]
            isOneToOne: false
            referencedRelation: "v_ahorro_escenario"
            referencedColumns: ["escenario_propuesta_id"]
          },
          {
            foreignKeyName: "escenarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      empresa_actual: { Args: never; Returns: string }
      es_admin: { Args: never; Returns: boolean }
      materializar_baseline: {
        Args: { p_reglas?: string; p_semana: string; p_sucursal: string }
        Returns: string
      }
      puede_editar: { Args: never; Returns: boolean }
      reacomodar_semana: {
        Args: {
          p_margen_contrato?: number
          p_semana: string
          p_sucursal: string
          p_tope?: number
        }
        Returns: {
          apellido: string
          delta: number
          empleado_id: string
          foto_url: string
          horas_hoy: number
          horas_reacomodadas: number
          jornada_contratada: number
          nombre: string
          puesto: string
          rol: string
        }[]
      }
      reporte_ejecutivo: {
        Args: { p_semana?: string }
        Returns: {
          ahorro_dobles: number
          ahorro_mxn: number
          ahorro_pct: number
          ahorro_prima: number
          ahorro_sobrestaffing: number
          ahorro_triples: number
          cobertura_pico_baseline_pct: number
          cobertura_pico_propuesta_pct: number
          costo_baseline: number
          costo_propuesta: number
          deficit_pico_horas: number
          horas_baseline: number
          horas_propuesta: number
          semana_iso: string
          tiendas: number
          tiendas_con_subdotacion_pico: number
        }[]
      }
      semanas_sin_propuesta: {
        Args: Record<PropertyKey, never>
        Returns: {
          colaboradores: number
          semana_iso: string
          sucursal: string
          sucursal_id: string
        }[]
      }
      resumen_reacomodo: {
        Args: {
          p_margen_contrato?: number
          p_semana: string
          p_sucursal: string
          p_tope?: number
        }
        Returns: {
          colaboradores: number
          fuera_de_norma_antes: number
          fuera_de_norma_despues: number
          horas_absorbidas: number
          horas_excedentes: number
          horas_sin_cubrir: number
          horas_totales: number
          semana_iso: string
          tope_horas: number
          vacantes_sugeridas: number
        }[]
      }
      resumen_sucursal: {
        Args: { p_semana: string; p_sucursal: string }
        Returns: {
          colaboradores: number
          fuera_de_norma: number
          horas_al_doble: number
          horas_totales: number
          semana_iso: string
          sucursal_id: string
          tope_horas: number
        }[]
      }
      resumir_escenario: { Args: { p_escenario: string }; Returns: undefined }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      tarifa_vigente: {
        Args: { p_fecha: string; p_puesto: string }
        Returns: number
      }
      tope_semanal: { Args: { p_anio: number }; Returns: number }
    }
    Enums: {
      estado_escenario: "borrador" | "publicado" | "archivado"
      estado_importacion:
        | "pendiente"
        | "procesando"
        | "completada"
        | "con_errores"
      origen_horario: "csv" | "manual" | "motor"
      rol_usuario: "owner" | "admin" | "gerente" | "lectura"
      tipo_contrato: "tiempo_completo" | "medio_tiempo"
      tipo_escenario: "baseline" | "propuesta"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_escenario: ["borrador", "publicado", "archivado"],
      estado_importacion: [
        "pendiente",
        "procesando",
        "completada",
        "con_errores",
      ],
      origen_horario: ["csv", "manual", "motor"],
      rol_usuario: ["owner", "admin", "gerente", "lectura"],
      tipo_contrato: ["tiempo_completo", "medio_tiempo"],
      tipo_escenario: ["baseline", "propuesta"],
    },
  },
} as const

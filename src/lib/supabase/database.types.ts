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
      empleados: {
        Row: {
          activo: boolean
          apellido: string
          clave_externa: string | null
          created_at: string
          foto_url: string | null
          id: string
          jornada_contratada_horas: number | null
          nombre: string
          puesto: string | null
          sucursal_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          clave_externa?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          jornada_contratada_horas?: number | null
          nombre: string
          puesto?: string | null
          sucursal_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          clave_externa?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          jornada_contratada_horas?: number | null
          nombre?: string
          puesto?: string | null
          sucursal_id?: string
          updated_at?: string
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
      empresas: {
        Row: {
          created_at: string
          id: string
          nombre: string
          rfc: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          rfc?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          rfc?: string | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Functions: {
      empresa_actual: { Args: never; Returns: string }
      es_admin: { Args: never; Returns: boolean }
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
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      tope_semanal: { Args: { p_anio: number }; Returns: number }
    }
    Enums: {
      estado_importacion:
        | "pendiente"
        | "procesando"
        | "completada"
        | "con_errores"
      origen_horario: "csv" | "manual" | "motor"
      rol_usuario: "owner" | "admin" | "gerente" | "lectura"
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
      estado_importacion: [
        "pendiente",
        "procesando",
        "completada",
        "con_errores",
      ],
      origen_horario: ["csv", "manual", "motor"],
      rol_usuario: ["owner", "admin", "gerente", "lectura"],
    },
  },
} as const

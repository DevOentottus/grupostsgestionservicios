import type { HelpRegistry, HelpContent } from "./help-types";
import type { Rol as HelpRol } from "./help-types";

/**
 * Resuelve la ruta de la captura de pantalla para una ruta + rol.
 * Las capturas se generan con scripts/generar-capturas-ayuda.py
 * y se guardan en public/help/{rol}-{slug}.png
 */
export function getHelpScreenshot(pathname: string, rol: string): string | null {
  // Detectar rutas de detalle (con ID numérico)
  const isDetail = /\/\w+\/\d+/.test(pathname);

  let normalized: string;
  if (isDetail) {
    // Rutas detalle: /servicios/123 → servicios-detalle
    normalized = pathname
      .replace(/\/nuevo/g, "-nuevo")
      .replace(/\/\d+/g, "-detalle")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\//g, "-");
  } else {
    normalized = pathname
      .replace(/\/\d+/g, "")
      .replace(/\/nuevo/g, "-nuevo")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\//g, "-");
  }

  // Mapa de rutas a nombres de screenshot
  // El sufijo de screenshot es el mismo para todos los roles
  const screenshotMap: Record<string, string> = {
    "dashboard": "dashboard",
    "miarea": "miarea",
    "servicios": "servicios",
    "servicios-nuevo": "servicios-nuevo",
    "servicios-detalle": "servicios-detalle",
    "areas": "areas",
    "usuarios": "usuarios",
    "plantillas": "plantillas",
    "reportes": "reportes",
    "comunicaciones": "comunicaciones",
    "auditoria": "auditoria",
    "admin-rendimiento": "admin-rendimiento",
    "manager-clientes": "manager-clientes",
    "manager-desempeno": "manager-desempeno",
  };

  const suffix = screenshotMap[normalized];
  if (!suffix) return null;

  return `/help/${rol}-${suffix}.png`;
}

export const helpRegistry: HelpRegistry = {
  // --- T-006: Dashboard (admin) ---
  "/dashboard": {
    admin: {
      title: "Dashboard -- Panel de Control",
      sections: [
        {
          id: "dashboard-visualizacion",
          title: "Visión general del Dashboard",
          steps: [
            { number: 1, description: "El Dashboard es tu centro de comando. Mostrá los indicadores clave de rendimiento (KPIs) de todo el sistema en tiempo real." },
            { number: 2, description: "Usá el filtro de fechas en la parte superior para ajustar el período: hoy, esta semana, este mes o un rango personalizado." },
            { number: 3, description: "También podés filtrar por área específica si querés ver métricas de un equipo en particular." },
            { number: 4, description: "Activá la comparación con el período anterior para ver si las métricas mejoraron o empeoraron." },
          ],
        },
        {
          id: "dashboard-metricas",
          title: "Cards de métricas",
          steps: [
            { number: 1, description: "Las cards superiores muestran: servicios activos, completados hoy, pendientes, e ingresos del período." },
            { number: 2, description: "Servicios activos: todos los servicios que están en estado 'en_progreso' en este momento." },
            { number: 3, description: "Completados hoy: servicios que se marcaron como completados en el día de hoy." },
            { number: 4, description: "Tiempo promedio: mostrá el tiempo medio de resolución de servicios en el período seleccionado." },
            { number: 5, description: "Hacé clic en cualquier card para navegar directamente a la lista filtrada de servicios." },
          ],
        },
        {
          id: "dashboard-graficos",
          title: "Gráficos y tendencias",
          steps: [
            { number: 1, description: "El gráfico de tendencias muestra la evolución diaria de servicios creados vs. completados." },
            { number: 2, description: "El gráfico de torta muestra la distribución de servicios por estado (pendiente, en_progreso, completado, cancelado, bloqueado)." },
            { number: 3, description: "El gráfico de barras compara el rendimiento de cada área: servicios completados vs. tiempo promedio." },
            { number: 4, description: "El gráfico de satisfacción por área muestra el puntaje promedio (1-5 estrellas) que los clientes le dan a cada área." },
            { number: 5, description: "Pasá el mouse sobre cualquier punto del gráfico para ver el valor exacto de ese día o categoría." },
          ],
        },
        {
          id: "dashboard-acciones-rapidas",
          title: "Acciones rápidas",
          steps: [
            { number: 1, description: "Usá el botón 'Actualizar' (ícono de recargar) para refrescar todos los datos del dashboard sin recargar la página." },
            { number: 2, description: "Desde el botón 'Nuevo servicio' en la barra superior podés crear un servicio sin salir del dashboard." },
            { number: 3, description: "Los servicios con alerta (bloqueados o con más de 48h sin avance) aparecen destacados en la sección de alertas." },
          ],
        },
      ],
    },
  },

  // --- T-007: Mi Área (colaborador, encargado) ---
  "/miarea": {
    colaborador: {
      title: "Mi Área -- Panel Personal",
      sections: [
        {
          id: "miarea-visualizacion",
          title: "Tu panel personal",
          steps: [
            { number: 1, description: "Esta página te muestra un resumen de tu área de trabajo y tu desempeño individual." },
            { number: 2, description: "Arriba ves las cards con tus métricas: servicios activos, completados, pendientes y tu puntuación promedio." },
            { number: 3, description: "Debajo está el ranking del área: ves cómo te posicionás frente a tus compañeros." },
            { number: 4, description: "La tabla de servicios asignados te permite ver los detalles y acceder rápidamente a cada servicio." },
          ],
        },
        {
          id: "miarea-ranking-colaborador",
          title: "Ranking y desempeño",
          steps: [
            { number: 1, description: "El ranking se ordena por puntuación (estrellas) que los clientes te asignan al completar un servicio." },
            { number: 2, description: "También muestra cuántos servicios completaste en el período." },
            { number: 3, description: "Podés cambiar el orden entre ascendente y descendente con el botón de ordenamiento." },
            { number: 4, description: "Tu posición se destaca visualmente para que la encuentres rápido." },
          ],
        },
        {
          id: "miarea-servicios-colaborador",
          title: "Tus servicios asignados",
          steps: [
            { number: 1, description: "Cada servicio se muestra con su código único, título, prioridad y estado actual." },
            { number: 2, description: "Usá los colores de prioridad para identificar rápido: rojo = urgente, naranja = alta, azul = media, gris = baja." },
            { number: 3, description: "Hacé clic en cualquier servicio para ir al detalle y empezar a trabajar." },
            { number: 4, description: "Desde el detalle podés cambiar el estado, completar tareas y subir evidencias." },
          ],
        },
        {
          id: "miarea-eficiencia",
          title: "Métricas de eficiencia",
          steps: [
            { number: 1, description: "Las cards superiores muestran tu eficiencia: tiempo promedio por servicio, servicios completados y productividad." },
            { number: 2, description: "El tiempo promedio se calcula desde que tomás el servicio hasta que lo completás." },
            { number: 3, description: "Compará tus métricas con el promedio del área para saber si estás por encima o debajo." },
          ],
        },
      ],
    },
    encargado: {
      title: "Mi Área -- Panel de Encargado",
      sections: [
        {
          id: "miarea-visualizacion-encargado",
          title: "Tu panel de gestión",
          steps: [
            { number: 1, description: "Esta página te da una visión completa de tu área: colaboradores, servicios activos y métricas del equipo." },
            { number: 2, description: "Usá las pestañas 'Servicios' y 'Colaboradores' para alternar entre ambas vistas." },
            { number: 3, description: "En la vista Servicios ves todos los servicios del área con su estado actual y colaborador asignado." },
            { number: 4, description: "En la vista Colaboradores ves el ranking del equipo con métricas individuales de cada uno." },
          ],
        },
        {
          id: "miarea-ranking-encargado",
          title: "Ranking del equipo",
          steps: [
            { number: 1, description: "El ranking muestra a todos los colaboradores de tu área ordenados por puntuación promedio." },
            { number: 2, description: "Cada colaborador muestra: nombre, servicios completados, puntuación (1-5) y tiempo promedio." },
            { number: 3, description: "Usá esta información para identificar a los mejores performers y a quienes necesitan apoyo." },
            { number: 4, description: "El orden se puede alternar entre ascendente y descendente según la puntuación." },
          ],
        },
        {
          id: "miarea-servicios-encargado",
          title: "Servicios del área",
          steps: [
            { number: 1, description: "Ves todos los servicios del área con el colaborador asignado, prioridad y estado." },
            { number: 2, description: "Los colores de prioridad te ayudan a identificar urgencias: rojo urgente, naranja alta, azul media." },
            { number: 3, description: "Hacé clic en un servicio para ir al detalle y hacer seguimiento." },
            { number: 4, description: "Como encargado, podés reasignar servicios entre colaboradores de tu área si es necesario." },
          ],
        },
        {
          id: "miarea-metricas-encargado",
          title: "Métricas del equipo",
          steps: [
            { number: 1, description: "Las cards superiores muestran métricas agregadas: servicios activos, completados del período, pendientes." },
            { number: 2, description: "El tiempo promedio del equipo te da una idea de la eficiencia general." },
            { number: 3, description: "La satisfacción promedio (estrellas) refleja la calidad del servicio que entrega tu equipo." },
          ],
        },
      ],
    },
  },

  // --- T-008: Servicios (todos los roles) ---
  "/servicios": {
    admin: {
      title: "Servicios -- Gestión General",
      sections: [
        {
          id: "servicios-lista",
          title: "Lista de servicios",
          steps: [
            { number: 1, description: "La vista principal de servicios te muestra todos los servicios del sistema en formato de cards." },
            { number: 2, description: "Cada card muestra: código, título, cliente, área, colaborador asignado, prioridad y estado." },
            { number: 3, description: "También ves un indicador visual del tiempo transcurrido desde que se creó el servicio." },
            { number: 4, description: "Hacé clic en cualquier card para ir al detalle completo del servicio." },
          ],
        },
        {
          id: "servicios-filtros",
          title: "Filtros y búsqueda",
          steps: [
            { number: 1, description: "Usá la barra de búsqueda para encontrar servicios por código, título o nombre del cliente." },
            { number: 2, description: "Los filtros de estado te permiten ver solo servicios pendientes, en_progreso, completados, bloqueados o cancelados." },
            { number: 3, description: "Combiná búsqueda con filtros para afinar los resultados." },
            { number: 4, description: "El filtro se aplica automáticamente al seleccionar un estado o escribir en la búsqueda." },
          ],
        },
        {
          id: "servicios-estados",
          title: "Estado de servicios",
          steps: [
            { number: 1, description: "Pendiente (amarillo): servicio creado pero aún no asignado ni en ejecución." },
            { number: 2, description: "En Progreso (azul): servicio en ejecución, con tareas asignadas y en avance." },
            { number: 3, description: "Completado (verde): servicio finalizado, todas las tareas completadas y cliente notificado." },
            { number: 4, description: "Bloqueado (rojo): servicio con problemas que impiden su avance (falta de repuestos, información, etc.)." },
            { number: 5, description: "Cancelado (gris): servicio que fue cancelado antes de completarse." },
          ],
        },
        {
          id: "servicios-crear-rapido",
          title: "Crear servicio rápido",
          steps: [
            { number: 1, description: "Hacé clic en el botón 'Nuevo Servicio' o en el ícono '+' para abrir el modal de creación rápida." },
            { number: 2, description: "El modal te permite crear un servicio con los datos esenciales sin ir al formulario completo." },
            { number: 3, description: "Completá los campos requeridos: cliente, título, descripción, área y prioridad." },
            { number: 4, description: "Si necesitás más opciones (tareas, plantillas, asignación detallada), usá 'Crear con wizard' para ir al formulario completo." },
          ],
        },
      ],
    },
    encargado: {
      title: "Servicios -- Mi Área",
      sections: [
        {
          id: "servicios-lista-encargado",
          title: "Servicios de tu área",
          steps: [
            { number: 1, description: "Ves los servicios filtrados por tu área. Como encargado, solo gestionás los servicios de tu equipo." },
            { number: 2, description: "Cada card muestra el colaborador asignado, prioridad, estado y tiempo transcurrido." },
            { number: 3, description: "Usá los filtros de estado para enfocarte en servicios pendientes, en progreso o completados." },
            { number: 4, description: "Hacé clic en un servicio para ver el detalle, reasignar tareas o cambiar el estado." },
          ],
        },
        {
          id: "servicios-estados",
          title: "Estado de servicios",
          steps: [
            { number: 1, description: "Pendiente (amarillo): servicio sin iniciar." },
            { number: 2, description: "En Progreso (azul): servicio en ejecución por algún colaborador." },
            { number: 3, description: "Completado (verde): servicio finalizado exitosamente." },
            { number: 4, description: "Bloqueado (rojo): servicio detenido por algún inconveniente." },
            { number: 5, description: "Cancelado (gris): servicio cancelado." },
          ],
        },
        {
          id: "servicios-busqueda",
          title: "Búsqueda y filtros",
          steps: [
            { number: 1, description: "Buscá por código o título del servicio usando la barra de búsqueda." },
            { number: 2, description: "Filtrá por estado para ver solo los servicios que te interesan en cada momento." },
            { number: 3, description: "Los filtros son acumulativos con la búsqueda." },
          ],
        },
      ],
    },
    colaborador: {
      title: "Mis Servicios",
      sections: [
        {
          id: "servicios-lista-colaborador",
          title: "Tus servicios asignados",
          steps: [
            { number: 1, description: "Ves solo los servicios que tenés asignados. Si no ves ningún servicio, ninguno te fue asignado aún." },
            { number: 2, description: "Cada card muestra el código, título, cliente, prioridad y estado del servicio." },
            { number: 3, description: "Los colores de prioridad te ayudan a saber qué atender primero: rojo urgente, naranja alta." },
            { number: 4, description: "Hacé clic en cualquier servicio para abrir el detalle y empezar a trabajar." },
          ],
        },
        {
          id: "servicios-estados-colaborador",
          title: "Estado y seguimiento",
          steps: [
            { number: 1, description: "Pendiente: servicio asignado pero aún no empezaste a trabajar." },
            { number: 2, description: "En Progreso: estás trabajando en el servicio." },
            { number: 3, description: "Completado: finalizaste el servicio y todas sus tareas." },
            { number: 4, description: "Bloqueado: necesitás algo para continuar (repuestos, información del cliente, etc.)." },
          ],
        },
        {
          id: "servicios-busqueda-colaborador",
          title: "Buscar servicios",
          steps: [
            { number: 1, description: "Usá la barra de búsqueda para encontrar servicios por código o título." },
            { number: 2, description: "Filtrá por estado para enfocarte en pendientes o en progreso." },
          ],
        },
      ],
    },
    sistema: {
      title: "Servicios -- Visión completa",
      sections: [
        {
          id: "servicios-lista-sistema",
          title: "Todos los servicios del sistema",
          steps: [
            { number: 1, description: "Como usuario sistema, ves todos los servicios sin restricción de área." },
            { number: 2, description: "Usá los filtros y búsqueda para encontrar servicios específicos." },
            { number: 3, description: "Esta vista es de solo monitoreo -- las acciones de gestión las realizan admin y encargados." },
          ],
        },
      ],
    },
  },

  // --- Seguimiento / Detalle de Servicio ---
  "/servicios/:id": {
    admin: {
      title: "Servicio -- Detalle y Seguimiento",
      sections: [
        {
          id: "detalle-cabecera",
          title: "Cabecera del servicio",
          steps: [
            { number: 1, description: "La cabecera muestra el código del servicio, el título (editable haciendo clic), la prioridad y el estado actual." },
            { number: 2, description: "El estado se puede cambiar usando las acciones rápidas en la barra superior." },
            { number: 3, description: "El botón de volver (←) te lleva de vuelta a la lista de servicios." },
          ],
        },
        {
          id: "detalle-qr-compartir",
          title: "Código QR y compartir",
          steps: [
            { number: 1, description: "El código QR permite al cliente hacer seguimiento del servicio desde su celular sin necesidad de iniciar sesión." },
            { number: 2, description: "Usá el botón de WhatsApp (ícono de Share2) para compartir el enlace de seguimiento con el cliente." },
            { number: 3, description: "El enlace público funciona con el número de DNI del cliente como validación." },
          ],
        },
        {
          id: "detalle-tareas",
          title: "Pestaña Tareas",
          steps: [
            { number: 1, description: "Las tareas son los pasos concretos que se deben completar para finalizar el servicio." },
            { number: 2, description: "Cada tarea tiene: título, descripción, tipo (técnico, administrativo, cliente), tiempo estimado y colaborador asignado." },
            { number: 3, description: "Podés agregar tareas nuevas con el botón 'Agregar Tarea'. Se abre un formulario en línea." },
            { number: 4, description: "Las tareas se pueden marcar como completadas, reabrir si es necesario, o eliminar." },
            { number: 5, description: "Los tipos de tarea ayudan a clasificar el trabajo: técnico (campo), administrativo (oficina), cliente (responsabilidad del cliente)." },
          ],
        },
        {
          id: "detalle-flujo",
          title: "Pestaña Flujo",
          steps: [
            { number: 1, description: "La pestaña Flujo muestra un diagrama visual del proceso completo del servicio." },
            { number: 2, description: "Cada paso del flujo representa una etapa del servicio (recepción, diagnóstico, reparación, etc.)." },
            { number: 3, description: "Los pasos completados aparecen en verde, el paso actual en azul, y los pendientes en gris." },
            { number: 4, description: "El flujo se define desde la plantilla de servicio o se puede personalizar por servicio." },
          ],
        },
        {
          id: "detalle-comentarios",
          title: "Pestaña Comentarios",
          steps: [
            { number: 1, description: "En la pestaña Comentarios podés ver y agregar notas internas sobre el servicio." },
            { number: 2, description: "Los comentarios son internos del sistema -- no los ve el cliente en el enlace público." },
            { number: 3, description: "Usá los comentarios para dejar registro de novedades, decisiones o coordinaciones con otros colaboradores." },
          ],
        },
        {
          id: "detalle-evidencias",
          title: "Pestaña Evidencias",
          steps: [
            { number: 1, description: "Las evidencias son fotos o videos que documentan el trabajo realizado en el servicio." },
            { number: 2, description: "Podés tomar fotos desde el navegador o subir archivos existentes." },
            { number: 3, description: "Cada tarea puede requerir evidencia obligatoria según la configuración de la plantilla." },
            { number: 4, description: "Las evidencias se pueden ver, comentar y gestionar desde esta pestaña." },
          ],
        },
        {
          id: "detalle-cambiar-estado",
          title: "Cambiar estado del servicio",
          steps: [
            { number: 1, description: "Usá el selector de estado en la cabecera para avanzar el servicio: pendiente → en_progreso → completado." },
            { number: 2, description: "Si algo impide el avance, podés marcarlo como bloqueado y agregar el motivo en comentarios." },
            { number: 3, description: "Un servicio completado ya no se puede modificar, pero se pueden ver todas las tareas y evidencias." },
          ],
        },
      ],
    },
    encargado: {
      title: "Servicio -- Detalle y Seguimiento",
      sections: [
        {
          id: "detalle-visualizacion-encargado",
          title: "Visualización del servicio",
          steps: [
            { number: 1, description: "Ves el detalle completo del servicio: código, título, estado, prioridad y datos del cliente." },
            { number: 2, description: "Podés ver y gestionar las tareas del servicio. Asigná tareas a los colaboradores de tu área." },
            { number: 3, description: "El botón de WhatsApp te permite compartir el enlace de seguimiento con el cliente." },
          ],
        },
        {
          id: "detalle-gestion-tareas-encargado",
          title: "Gestión de tareas",
          steps: [
            { number: 1, description: "Creá tareas nuevas asignándoselas a colaboradores específicos de tu área." },
            { number: 2, description: "Definí el tipo de tarea (técnico, administrativo) y el tiempo estimado." },
            { number: 3, description: "Marcá tareas como completadas cuando el colaborador informa que finalizó." },
            { number: 4, description: "Si una tarea se completó por error, podés reabrirla para que se vuelva a trabajar." },
          ],
        },
        {
          id: "detalle-evidencias-encargado",
          title: "Revisar evidencias",
          steps: [
            { number: 1, description: "Revisá las fotos y videos que subieron los colaboradores como evidencia del trabajo." },
            { number: 2, description: "Podés dejar comentarios en cada evidencia para pedir ajustes o aprobar el trabajo." },
            { number: 3, description: "Las evidencias son importantes para respaldar el servicio ante el cliente." },
          ],
        },
      ],
    },
    colaborador: {
      title: "Servicio -- Mi Trabajo",
      sections: [
        {
          id: "detalle-tareas-colaborador",
          title: "Mis tareas asignadas",
          steps: [
            { number: 1, description: "En la pestaña Tareas ves solo las tareas que te asignaron a vos." },
            { number: 2, description: "Cada tarea muestra el título, descripción, tipo y tiempo estimado." },
            { number: 3, description: "Cuando termines una tarea, marcala como completada usando el botón ✓." },
            { number: 4, description: "Si no podés completar una tarea, dejá un comentario explicando el motivo." },
          ],
        },
        {
          id: "detalle-evidencias-colaborador",
          title: "Subir evidencias",
          steps: [
            { number: 1, description: "Cuando una tarea lo requiera, subí fotos o videos como evidencia del trabajo realizado." },
            { number: 2, description: "Usá el botón de la cámara para tomar una foto directamente desde tu celular o computadora." },
            { number: 3, description: "Las evidencias quedan asociadas al servicio y las puede revisar tu encargado." },
          ],
        },
        {
          id: "detalle-flujo-colaborador",
          title: "Flujo del servicio",
          steps: [
            { number: 1, description: "La pestaña Flujo te muestra en qué etapa está el servicio y qué pasos siguen." },
            { number: 2, description: "Esto te ayuda a entender el contexto del servicio más allá de tus tareas individuales." },
          ],
        },
      ],
    },
    sistema: {
      title: "Servicio -- Detalle y Monitoreo",
      sections: [
        {
          id: "detalle-visualizacion-sistema",
          title: "Monitoreo del servicio",
          steps: [
            { number: 1, description: "Como usuario sistema ves toda la información del servicio pero sin opciones de edición." },
            { number: 2, description: "Podés ver las tareas, el flujo, los comentarios y las evidencias cargadas." },
            { number: 3, description: "Esta vista es útil para auditoría y monitoreo del estado de los servicios." },
          ],
        },
        {
          id: "detalle-qr-sistema",
          title: "Código QR y enlace público",
          steps: [
            { number: 1, description: "El código QR permite al cliente hacer seguimiento del servicio desde su celular." },
            { number: 2, description: "Podés compartir el enlace por WhatsApp con el cliente si lo solicita." },
            { number: 3, description: "El seguimiento público solo requiere el DNI del cliente para validar su identidad." },
          ],
        },
      ],
    },
  },

  "/servicios/nuevo": {
    admin: {
      title: "Nuevo Servicio -- Wizard",
      sections: [
        {
          id: "nuevo-wizard",
          title: "Formulario de nuevo servicio",
          steps: [
            { number: 1, description: "El wizard tiene 3 pasos: Datos del Cliente, Detalles del Servicio y Asignación de Tareas." },
            { number: 2, description: "Usá 'Siguiente' y 'Anterior' para navegar entre pasos. No perdés los datos ya ingresados." },
            { number: 3, description: "Al final, hacé clic en 'Guardar' para crear el servicio. Todos los pasos son obligatorios." },
            { number: 4, description: "Si querés cancelar, usá la 'X' o el botón 'Cancelar'. No se guarda nada." },
          ],
        },
        {
          id: "nuevo-cliente",
          title: "Datos del cliente",
          steps: [
            { number: 1, description: "Paso 1: seleccioná un cliente existente de la lista desplegable o creá uno nuevo." },
            { number: 2, description: "Si el cliente no está registrado, completá: nombre, teléfono, email y dirección." },
            { number: 3, description: "El teléfono y email son opcionales pero recomendados para notificaciones." },
            { number: 4, description: "Verificá que los datos sean correctos antes de pasar al siguiente paso." },
          ],
        },
        {
          id: "nuevo-detalles",
          title: "Detalles del servicio",
          steps: [
            { number: 1, description: "Paso 2: completá el título del servicio (obligatorio), describí el problema o solicitud." },
            { number: 2, description: "Seleccioná el área responsable. Esto determina qué encargado y colaboradores pueden asignarse." },
            { number: 3, description: "Elegí la prioridad: baja, media, alta o urgente. Esto afecta el orden en las listas." },
            { number: 4, description: "Si corresponde, seleccioná una plantilla en el paso siguiente para precargar tareas." },
          ],
        },
        {
          id: "nuevo-asignacion",
          title: "Asignación de tareas",
          steps: [
            { number: 1, description: "Paso 3: primero seleccioná una plantilla si querés precargar tareas predefinidas." },
            { number: 2, description: "Las tareas de la plantilla se agregan automáticamente. Podés editarlas o eliminarlas." },
            { number: 3, description: "También podés agregar tareas manualmente una por una con el botón 'Agregar tarea'." },
            { number: 4, description: "Cada tarea debe tener un título descriptivo. Opcionalmente podés agregar una descripción." },
            { number: 5, description: "Revisá la lista de tareas y el orden antes de guardar. El orden se respeta al crear." },
          ],
        },
      ],
    },
    encargado: {
      title: "Nuevo Servicio -- Wizard",
      sections: [
        {
          id: "nuevo-wizard-encargado",
          title: "Crear servicio",
          steps: [
            { number: 1, description: "El wizard te guía en 3 pasos: cliente, detalles del servicio y tareas." },
            { number: 2, description: "Como encargado, el área se preselecciona según tu área asignada." },
            { number: 3, description: "Completá todos los pasos y hacé clic en 'Guardar' al final." },
          ],
        },
        {
          id: "nuevo-cliente",
          title: "Datos del cliente",
          steps: [
            { number: 1, description: "Seleccioná un cliente existente o creá uno nuevo con nombre, teléfono y email." },
          ],
        },
        {
          id: "nuevo-detalles",
          title: "Detalles del servicio",
          steps: [
            { number: 1, description: "Completá título, descripción y prioridad. El área ya está definida." },
            { number: 2, description: "Podés asignar el servicio a un colaborador de tu área si lo deseás." },
          ],
        },
        {
          id: "nuevo-tareas",
          title: "Tareas",
          steps: [
            { number: 1, description: "Seleccioná una plantilla para precargar tareas o agregalas manualmente." },
            { number: 2, description: "Revisá el orden de las tareas antes de guardar." },
          ],
        },
      ],
    },
    colaborador: {
      title: "Nuevo Servicio",
      sections: [
        {
          id: "nuevo-wizard-colaborador",
          title: "Crear servicio",
          steps: [
            { number: 1, description: "El wizard te guía en 3 pasos para crear un servicio." },
            { number: 2, description: "Completá datos del cliente, detalles del servicio y tareas." },
            { number: 3, description: "El área se asigna automáticamente según tu área." },
          ],
        },
      ],
    },
    sistema: {
      title: "Nuevo Servicio",
      sections: [
        {
          id: "nuevo-wizard-sistema",
          title: "Crear servicio",
          steps: [
            { number: 1, description: "El wizard completo de 3 pasos para crear servicios." },
            { number: 2, description: "Seleccioná el área, cliente, completá detalles y agregá tareas." },
          ],
        },
      ],
    },
  },

  // --- T-009: Usuarios y Áreas ---
  "/usuarios": {
    sistema: {
      title: "Usuarios -- Gestión",
      sections: [
        {
          id: "usuarios-lista",
          title: "Gestión de usuarios",
          steps: [
            { number: 1, description: "Esta página muestra la tabla de todos los usuarios del sistema con sus datos: usuario, nombres, email, rol, fecha de registro y estado." },
            { number: 2, description: "Usá la barra de búsqueda para encontrar usuarios por nombre o email." },
            { number: 3, description: "Hacé clic en cualquier fila para ver el detalle o editar el usuario." },
          ],
        },
        {
          id: "usuarios-crear",
          title: "Crear/editar usuario",
          steps: [
            { number: 1, description: "Hacé clic en 'Nuevo Usuario' para abrir el formulario de creación." },
            { number: 2, description: "Completá: contraseña, nombres, apellido paterno, apellido materno, email, dni y rol." },
            { number: 3, description: "El email debe ser único en el sistema. La contraseña debe tener al menos 6 caracteres." },
            { number: 4, description: "Para editar un usuario existente, hacé clic en el ícono de lápiz en la fila correspondiente." },
          ],
        },
        {
          id: "usuarios-roles",
          title: "Roles y permisos",
          steps: [
            { number: 1, description: "Sistema: acceso total a configuración del sistema, usuarios y monitoreo. No gestiona servicios." },
            { number: 2, description: "Admin: acceso a gestión completa de servicios, áreas, reportes y dashboard." },
            { number: 3, description: "Encargado: gestiona su área, colaboradores, servicios del área y reportes de su equipo." },
            { number: 4, description: "Colaborador: ve y trabaja solo en los servicios que le asignan." },
          ],
        },
        {
          id: "usuarios-estado",
          title: "Activar/desactivar usuarios",
          steps: [
            { number: 1, description: "Usá el toggle de estado para activar o desactivar un usuario." },
            { number: 2, description: "Un usuario desactivado no puede iniciar sesión en el sistema." },
            { number: 3, description: "Los servicios asignados a un usuario desactivado no se pierden, pero quedan sin responsable." },
            { number: 4, description: "Reactivá al usuario cuando sea necesario para que retome sus actividades." },
          ],
        },
      ],
    },
  },

  "/areas": {
    admin: {
      title: "Áreas -- Gestión",
      sections: [
        {
          id: "areas-lista",
          title: "Gestión de áreas",
          steps: [
            { number: 1, description: "La página muestra la lista de todas las áreas del sistema con su encargado y cantidad de colaboradores." },
            { number: 2, description: "Seleccioná un área para ver su detalle: colaboradores asignados y servicios activos." },
            { number: 3, description: "Usá el botón 'Nueva Área' para crear un área nueva con su nombre y encargado." },
          ],
        },
        {
          id: "areas-crear",
          title: "Crear/editar área",
          steps: [
            { number: 1, description: "Hacé clic en 'Nueva Área' para abrir el formulario. Completá el nombre y seleccioná un encargado." },
            { number: 2, description: "El encargado debe ser un usuario con rol 'encargado'. Si no aparece, creálo primero en Usuarios." },
            { number: 3, description: "Para editar, hacé clic en el ícono de lápiz sobre el área que querés modificar." },
            { number: 4, description: "Podés eliminar un área solo si no tiene servicios asociados." },
          ],
        },
        {
          id: "areas-colaboradores",
          title: "Colaboradores por área",
          steps: [
            { number: 1, description: "Al seleccionar un área, ves la lista de colaboradores asignados." },
            { number: 2, description: "Usá el botón 'Asignar colaborador' para agregar un colaborador al área." },
            { number: 3, description: "Podés remover un colaborador del área si ya no trabaja allí." },
            { number: 4, description: "Cada colaborador solo puede pertenecer a un área a la vez." },
          ],
        },
      ],
    },
    sistema: {
      title: "Áreas -- Visión completa",
      sections: [
        {
          id: "areas-lista-sistema",
          title: "Áreas del sistema",
          steps: [
            { number: 1, description: "Ves todas las áreas con sus encargados y colaboradores." },
            { number: 2, description: "Podés crear, editar y eliminar áreas igual que el admin." },
            { number: 3, description: "Usá esta sección para auditar la estructura de áreas del sistema." },
          ],
        },
      ],
    },
  },

  "/areas/:id/servicios": {
    admin: {
      title: "Servicios por Área",
      sections: [
        {
          id: "areas-servicios",
          title: "Servicios por área",
          steps: [
            { number: 1, description: "Esta página muestra todos los servicios que pertenecen a un área específica." },
            { number: 2, description: "Ves los servicios con su estado, colaborador asignado y prioridad." },
            { number: 3, description: "Usá esta vista para evaluar la carga de trabajo de cada área." },
          ],
        },
        {
          id: "areas-reasignar",
          title: "Reasignación",
          steps: [
            { number: 1, description: "Podés reasignar servicios entre áreas si es necesario reorganizar." },
            { number: 2, description: "Seleccioná el servicio y elegí el área de destino." },
            { number: 3, description: "Al reasignar, el colaborador asignado se libera y el servicio queda pendiente en el área nueva." },
          ],
        },
      ],
    },
  },

  // --- T-010: Plantillas y Reportes ---
  "/plantillas": {
    admin: {
      title: "Plantillas -- Gestión",
      sections: [
        {
          id: "plantillas-intro",
          title: "Gestión de plantillas",
          steps: [
            { number: 1, description: "Las plantillas son listas de tareas predefinidas que podés reutilizar al crear servicios." },
            { number: 2, description: "Ahorran tiempo y aseguran consistencia: en vez de escribir las mismas tareas cada vez, usás una plantilla." },
            { number: 3, description: "La lista muestra todas las plantillas con su nombre, cantidad de tareas y área asociada." },
            { number: 4, description: "Hacé clic en una plantilla para expandirla y ver sus tareas." },
          ],
        },
        {
          id: "plantillas-crear",
          title: "Crear plantilla",
          steps: [
            { number: 1, description: "Hacé clic en 'Nueva Plantilla' para abrir el formulario." },
            { number: 2, description: "Dale un nombre descriptivo a la plantilla (ej: 'Instalación de software básico')." },
            { number: 3, description: "Agregá tareas una por una con el botón 'Agregar tarea'. Cada tarea necesita un título." },
            { number: 4, description: "Ordená las tareas según la secuencia de trabajo. El orden se respeta al aplicar la plantilla." },
            { number: 5, description: "Guardá la plantilla y ya estará disponible al crear nuevos servicios." },
          ],
        },
        {
          id: "plantillas-usar",
          title: "Usar plantilla en servicio",
          steps: [
            { number: 1, description: "Al crear un servicio nuevo (en el wizard, paso 3), seleccioná una plantilla del desplegable." },
            { number: 2, description: "Las tareas de la plantilla se cargan automáticamente. Podés editarlas o eliminarlas antes de guardar." },
            { number: 3, description: "También podés aplicar una plantilla a un servicio existente desde el detalle del servicio." },
          ],
        },
      ],
    },
    encargado: {
      title: "Plantillas",
      sections: [
        {
          id: "plantillas-intro-encargado",
          title: "Plantillas de tu área",
          steps: [
            { number: 1, description: "Las plantillas son listas de tareas predefinidas. Creá plantillas para estandarizar los servicios de tu equipo." },
            { number: 2, description: "Ves todas las plantillas del sistema. Podés crear nuevas y usarlas al crear servicios." },
          ],
        },
        {
          id: "plantillas-crear-encargado",
          title: "Crear y usar plantillas",
          steps: [
            { number: 1, description: "Hacé clic en 'Nueva Plantilla', dale un nombre y agregá las tareas en orden." },
            { number: 2, description: "Al crear un servicio, seleccioná la plantilla para precargar las tareas automáticamente." },
          ],
        },
      ],
    },
    colaborador: {
      title: "Plantillas",
      sections: [
        {
          id: "plantillas-intro-colaborador",
          title: "Ver plantillas",
          steps: [
            { number: 1, description: "Las plantillas son modelos de tareas predefinidos. Podés ver las plantillas disponibles." },
            { number: 2, description: "Cuando te asignan un servicio creado con plantilla, las tareas ya vienen precargadas." },
          ],
        },
      ],
    },
    sistema: {
      title: "Plantillas",
      sections: [
        {
          id: "plantillas-sistema",
          title: "Plantillas del sistema",
          steps: [
            { number: 1, description: "Ves todas las plantillas. Como sistema, tenés acceso de monitoreo." },
          ],
        },
      ],
    },
  },

  "/reportes": {
    admin: {
      title: "Reportes -- Globales",
      sections: [
        {
          id: "reportes-visualizacion",
          title: "Reportes globales",
          steps: [
            { number: 1, description: "Esta página genera reportes de todo el sistema: servicios, áreas, colaboradores y rendimiento." },
            { number: 2, description: "Usá los filtros de fecha y área para acotar los datos del reporte." },
            { number: 3, description: "Los reportes incluyen: cantidad de servicios por estado, tiempo promedio, ingresos y satisfacción." },
            { number: 4, description: "Ves los datos en formato de tabla y gráficos para facilitar el análisis." },
          ],
        },
        {
          id: "reportes-exportar",
          title: "Exportar reportes",
          steps: [
            { number: 1, description: "Hacé clic en 'Exportar Excel' para descargar el reporte en formato .xlsx." },
            { number: 2, description: "Usá 'Exportar PDF' para obtener un documento listo para presentar o imprimir." },
            { number: 3, description: "Los filtros aplicados se reflejan en la exportación." },
          ],
        },
        {
          id: "reportes-filtros",
          title: "Filtros de reportes",
          steps: [
            { number: 1, description: "Filtrá por rango de fechas para ver datos de un período específico." },
            { number: 2, description: "Filtrá por área para ver solo los datos de un equipo en particular." },
            { number: 3, description: "También podés filtrar por estado de servicio para reportes más específicos." },
          ],
        },
      ],
    },
    encargado: {
      title: "Reportes -- Mi Área",
      sections: [
        {
          id: "reportes-visualizacion-encargado",
          title: "Reportes de tu área",
          steps: [
            { number: 1, description: "Ves los reportes filtrados automáticamente por tu área. No ves datos de otras áreas." },
            { number: 2, description: "Los reportes incluyen: servicios del área, rendimiento del equipo y tiempos de resolución." },
            { number: 3, description: "Usá los filtros de fecha para ajustar el período del reporte." },
          ],
        },
        {
          id: "reportes-exportar-encargado",
          title: "Exportar",
          steps: [
            { number: 1, description: "Exportá el reporte a Excel o PDF con los botones correspondientes." },
          ],
        },
        {
          id: "reportes-filtros-encargado",
          title: "Filtros",
          steps: [
            { number: 1, description: "Filtrá por fecha para ver datos de un período específico." },
            { number: 2, description: "El filtro de área está preseleccionado en tu área y no podés cambiarlo." },
          ],
        },
      ],
    },
  },

  // --- T-011: Comunicaciones, Auditoría, Rendimiento ---
  "/comunicaciones": {
    admin: {
      title: "Comunicaciones",
      sections: [
        {
          id: "comunicaciones-intro",
          title: "Centro de comunicaciones",
          steps: [
            { number: 1, description: "Este es el centro de comunicaciones del sistema. Podés crear anuncios visibles para todos los usuarios." },
            { number: 2, description: "Ves el historial de comunicaciones enviadas, ordenadas por fecha (más reciente primero)." },
            { number: 3, description: "Cada comunicación muestra: título, mensaje, autor y fecha de publicación." },
          ],
        },
        {
          id: "comunicaciones-enviar",
          title: "Enviar comunicación",
          steps: [
            { number: 1, description: "Hacé clic en 'Nueva Comunicación' para abrir el formulario." },
            { number: 2, description: "Completá el título (obligatorio) y el mensaje de la comunicación." },
            { number: 3, description: "Opcionalmente, seleccioná un área específica para que la comunicación sea visible solo para esa área." },
            { number: 4, description: "Si no seleccionás área, la comunicación será visible para todos los usuarios del sistema." },
          ],
        },
        {
          id: "comunicaciones-historial",
          title: "Historial",
          steps: [
            { number: 1, description: "Todas las comunicaciones enviadas quedan registradas en el historial." },
            { number: 2, description: "Podés ver el detalle de cada comunicación haciendo clic en ella." },
            { number: 3, description: "Las comunicaciones no se pueden editar ni eliminar una vez publicadas." },
          ],
        },
      ],
    },
    encargado: {
      title: "Comunicaciones",
      sections: [
        {
          id: "comunicaciones-intro-encargado",
          title: "Comunicaciones",
          steps: [
            { number: 1, description: "Ves las comunicaciones del sistema, incluyendo las dirigidas a tu área." },
            { number: 2, description: "Podés crear comunicaciones dirigidas a tu equipo o a todos." },
          ],
        },
        {
          id: "comunicaciones-enviar-encargado",
          title: "Enviar comunicación",
          steps: [
            { number: 1, description: "Completá título y mensaje. Podés restringir la visibilidad a tu área." },
          ],
        },
      ],
    },
    colaborador: {
      title: "Comunicaciones",
      sections: [
        {
          id: "comunicaciones-intro-colaborador",
          title: "Ver comunicaciones",
          steps: [
            { number: 1, description: "Ves las comunicaciones dirigidas a todos o a tu área." },
            { number: 2, description: "Como colaborador, solo podés ver comunicaciones, no crear nuevas." },
          ],
        },
      ],
    },
    sistema: {
      title: "Comunicaciones",
      sections: [
        {
          id: "comunicaciones-sistema",
          title: "Comunicaciones del sistema",
          steps: [
            { number: 1, description: "Ves todas las comunicaciones. Podés crear nuevas si es necesario." },
          ],
        },
      ],
    },
  },

  "/auditoria": {
    admin: {
      title: "Auditoría",
      sections: [
        {
          id: "auditoria-visualizacion",
          title: "Log de auditoría",
          steps: [
            { number: 1, description: "El log de auditoría registra todas las acciones importantes del sistema: creación, modificación y eliminación de entidades." },
            { number: 2, description: "Cada entrada muestra: usuario que realizó la acción, tipo de acción, entidad afectada y fecha/hora." },
            { number: 3, description: "Usá esta vista para rastrear quién hizo qué y cuándo." },
          ],
        },
        {
          id: "auditoria-filtros",
          title: "Filtros de auditoría",
          steps: [
            { number: 1, description: "Filtrá por usuario para ver las acciones de una persona específica." },
            { number: 2, description: "Filtrá por tipo de acción: crear, actualizar, eliminar." },
            { number: 3, description: "Filtrá por rango de fechas para acotar el período a revisar." },
            { number: 4, description: "Combiná filtros para investigaciones más precisas." },
          ],
        },
        {
          id: "auditoria-exportar",
          title: "Exportar log",
          steps: [
            { number: 1, description: "Hacé clic en 'Exportar' para descargar el log de auditoría como archivo CSV." },
            { number: 2, description: "Los filtros aplicados se reflejan en la exportación." },
          ],
        },
      ],
    },
  },

  "/admin/rendimiento": {
    admin: {
      title: "Rendimiento del Sistema",
      sections: [
        {
          id: "rendimiento-visualizacion",
          title: "Rendimiento del sistema",
          steps: [
            { number: 1, description: "Esta página muestra métricas técnicas del sistema y estadísticas de uso." },
            { number: 2, description: "Tracking de visitas: cuántas veces los clientes consultan sus servicios mediante el enlace público." },
            { number: 3, description: "KPIs de servicio: tiempos de resolución, cantidad de servicios por período, tasa de conversión." },
            { number: 4, description: "Calificaciones: distribución de puntuaciones (1-5 estrellas) que los clientes asignan." },
          ],
        },
        {
          id: "rendimiento-uso",
          title: "Uso del sistema",
          steps: [
            { number: 1, description: "Usuarios activos: cantidad de usuarios que iniciaron sesión en el período." },
            { number: 2, description: "Servicios por período: gráfico de servicios creados vs. completados por día." },
            { number: 3, description: "Top colaboradores: ranking de colaboradores con mejor rendimiento y satisfacción." },
          ],
        },
        {
          id: "rendimiento-tecnico",
          title: "Métricas técnicas",
          steps: [
            { number: 1, description: "Tiempos de respuesta: latencia de la API y la base de datos." },
            { number: 2, description: "Servicios activos totales y distribución por estado." },
            { number: 3, description: "Usá esta información para detectar cuellos de botella y planificar mejoras." },
          ],
        },
      ],
    },
    sistema: {
      title: "Rendimiento del Sistema",
      sections: [
        {
          id: "rendimiento-sistema",
          title: "Métricas del sistema",
          steps: [
            { number: 1, description: "Ves las mismas métricas que el admin: rendimiento, visitas, calificaciones y uso." },
            { number: 2, description: "Usá estos datos para monitorear la salud general del sistema." },
          ],
        },
      ],
    },
  },

  // --- T-012: Manager ---
  "/manager/clientes": {
    admin: {
      title: "Gestión de Clientes",
      sections: [
        {
          id: "clientes-lista",
          title: "Gestión de clientes",
          steps: [
            { number: 1, description: "Esta página muestra la tabla de todos los clientes registrados con su información de contacto." },
            { number: 2, description: "Cada cliente muestra: nombre, teléfono, email, dirección y cantidad de servicios realizados." },
            { number: 3, description: "Usá la barra de búsqueda para encontrar clientes por nombre o teléfono." },
            { number: 4, description: "Hacé clic en un cliente para ver su historial completo." },
          ],
        },
        {
          id: "clientes-historial",
          title: "Historial del cliente",
          steps: [
            { number: 1, description: "Al seleccionar un cliente, ves todos los servicios que se le realizaron." },
            { number: 2, description: "Cada servicio muestra: código, fecha, título, área responsable y estado." },
            { number: 3, description: "Hacé clic en un servicio para ver su detalle completo." },
          ],
        },
        {
          id: "clientes-metricas",
          title: "Métricas por cliente",
          steps: [
            { number: 1, description: "Frecuencia: cada cuánto el cliente solicita servicios (semanal, mensual, etc.)." },
            { number: 2, description: "Ingresos: total facturado al cliente en el período seleccionado." },
            { number: 3, description: "Usá estos datos para identificar clientes frecuentes y oportunidades de mejora." },
          ],
        },
      ],
    },
    sistema: {
      title: "Gestión de Clientes",
      sections: [
        {
          id: "clientes-sistema",
          title: "Clientes",
          steps: [
            { number: 1, description: "Ves la lista completa de clientes y su historial de servicios." },
            { number: 2, description: "Acceso de monitoreo a los datos de clientes." },
          ],
        },
      ],
    },
  },

  "/manager/desempeno": {
    admin: {
      title: "Desempeño -- Global",
      sections: [
        {
          id: "desempeno-visualizacion",
          title: "Desempeño global",
          steps: [
            { number: 1, description: "Esta página muestra KPIs de todo el equipo: servicios completados, tiempos promedio, satisfacción y productividad." },
            { number: 2, description: "Ves gráficos comparativos por área y por colaborador." },
            { number: 3, description: "Usá los filtros de fecha y área para enfocarte en períodos o equipos específicos." },
          ],
        },
        {
          id: "desempeno-individual",
          title: "Métricas individuales",
          steps: [
            { number: 1, description: "La tabla de desempeño individual muestra a cada colaborador con sus métricas clave." },
            { number: 2, description: "Columnas: colaborador, servicios completados, tiempo promedio, puntuación y eficiencia." },
            { number: 3, description: "Ordená la tabla por cualquier columna haciendo clic en el encabezado." },
          ],
        },
        {
          id: "desempeno-exportar",
          title: "Exportar reporte de desempeño",
          steps: [
            { number: 1, description: "Hacé clic en 'Exportar Excel' para descargar el reporte de desempeño completo." },
            { number: 2, description: "El archivo incluye todas las métricas visibles en la página." },
          ],
        },
      ],
    },
    encargado: {
      title: "Desempeño -- Mi Equipo",
      sections: [
        {
          id: "desempeno-visualizacion-encargado",
          title: "Desempeño de tu área",
          steps: [
            { number: 1, description: "Ves los KPIs de tu equipo: servicios completados, tiempos y satisfacción." },
            { number: 2, description: "Los datos están filtrados automáticamente por tu área." },
          ],
        },
        {
          id: "desempeno-individual-encargado",
          title: "Métricas individuales",
          steps: [
            { number: 1, description: "Cada colaborador de tu área muestra: servicios completados, tiempo promedio y puntuación." },
            { number: 2, description: "Usá estos datos para identificar fortalezas y áreas de mejora en tu equipo." },
          ],
        },
        {
          id: "desempeno-exportar-encargado",
          title: "Exportar",
          steps: [
            { number: 1, description: "Exportá el reporte de desempeño de tu área a Excel." },
          ],
        },
      ],
    },
    sistema: {
      title: "Desempeño",
      sections: [
        {
          id: "desempeno-sistema",
          title: "Desempeño global",
          steps: [
            { number: 1, description: "Ves los KPIs de todo el sistema con acceso completo a datos de todas las áreas." },
            { number: 2, description: "Monitoreá el rendimiento general del equipo técnico." },
          ],
        },
      ],
    },
  },
};

// --- Helper para resolver contenido con normalización de rutas ---

const ROLES_PRIORITY: HelpRol[] = ["admin", "encargado", "colaborador", "sistema"];

/**
 * Normaliza una pathname reemplazando IDs numéricos por :id
 * Ej: "/servicios/42" → "/servicios/:id"
 *     "/areas/5/servicios" → "/areas/:id/servicios"
 */
export function normalizePath(pathname: string): string {
  return pathname.replace(/\/\d+/g, "/:id");
}

/**
 * Verifica si existe contenido de ayuda registrado para esta ruta
 * (independientemente del rol).
 */
export function pageExistsInRegistry(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname);
  return normalizedPath in helpRegistry;
}

/**
 * Resuelve el contenido de ayuda para una ruta y rol.
 * 1. Normaliza la pathname
 * 2. Busca contenido exacto para el rol
 * 3. Si no hay, devuelve null
 */
export function getHelpContent(
  pathname: string,
  rol: string,
): HelpContent | null {
  const normalizedPath = normalizePath(pathname);
  const pageContent = helpRegistry[normalizedPath];

  if (!pageContent) return null;

  // Intentar con el rol exacto
  const typedRol = rol as HelpRol;
  if (pageContent[typedRol]) {
    return pageContent[typedRol] ?? null;
  }

  // No hay contenido para este rol
  return null;
}

/*
  Datos de ejemplo — extraídos del prototipo aprobado
  (design_handoff_storage_control/Bodega Ramos iPad.dc.html, const ITEMS / MUDANZAS / USUARIOS).
  Son ficticios, per el README: "sustitúyelos por los reales".
*/

import type { Cliente, Usuario, Objeto, Movimiento, Mudanza, MudanzaObjeto } from './schema'

export const CLIENTES: Cliente[] = [
  { id: 'cli-mendoza', nombre: 'Galería Mendoza', tipo: 'Galería', contacto: 'contacto@galeriamendoza.mx' },
  { id: 'cli-bellas-artes', nombre: 'Museo Bellas Artes', tipo: 'Museo', contacto: 'registro@bellasartes.mx' },
  { id: 'cli-arreola', nombre: 'Col. privada Arreola', tipo: 'Particular', contacto: 'arreola@correo.mx' },
  { id: 'cli-serra', nombre: 'Fundación Serra', tipo: 'Fundación', contacto: 'curaduria@fundacionserra.org' },
]

export const USUARIOS: Usuario[] = [
  { id: 'usr-1-le', nombre: 'Leonardo Escalona', iniciales: 'LE', rol: 'bodega', turno: '06:00 – 14:00' },
  { id: 'usr-2-mr', nombre: 'Ruberlai Castro', iniciales: 'RC', rol: 'bodega', turno: '14:00 – 22:00' },
  { id: 'usr-3-ar', nombre: 'Rafael Ramos', iniciales: 'RR', rol: 'admin', turno: 'Sin horario' },
]

interface PiezaSeed {
  ref: string
  desc: string
  largo: number
  ancho: number
}

interface ObjetoSeed {
  id: string
  tipo: Objeto['tipo']
  descripcion: string
  clienteId: string
  ubic: [string, string, string] | null
  entrada: string
  salida: string | null
  dims: [number, number, number]
  pesoKg: number
  estado: Objeto['estado']
  piezas?: PiezaSeed[]
  hist: Array<{
    fechaHora: string
    evento: Movimiento['evento']
    nota: string
    usuarioId: string
    mudanzaId?: string
  }>
}

const OBJETOS_SEED: ObjetoSeed[] = [
  {
    id: 'RD-1042', tipo: 'Guacal', descripcion: 'Guacal reforzado — óleo sobre tela, 3 piezas',
    clienteId: 'cli-mendoza', ubic: ['N2', 'R14', 'A3'], entrada: '2026-08-12', salida: null,
    dims: [180, 120, 60], pesoKg: 145, estado: 'En bodega',
    piezas: [
      { ref: 'P-01', desc: 'Sin título — óleo sobre tela', largo: 110, ancho: 80 },
      { ref: 'P-02', desc: 'Retrato en gris — óleo sobre tela', largo: 90, ancho: 70 },
      { ref: 'P-03', desc: 'Estudio de manos — carboncillo', largo: 50, ancho: 40 },
    ],
    hist: [
      { fechaHora: '2026-08-12T09:14', evento: 'Entrada', nota: 'Recibido de bodega Norte, sin daños', usuarioId: 'usr-1-le' },
      { fechaHora: '2026-08-12T10:02', evento: 'Ubicado', nota: 'Asignado a N2 · R14 · A3', usuarioId: 'usr-1-le' },
      { fechaHora: '2026-08-24T15:40', evento: 'Inspección', nota: 'Revisión mensual de condición', usuarioId: 'usr-2-mr' },
    ],
  },
  {
    id: 'RD-1043', tipo: 'Pedestal', descripcion: 'Pedestal MDF blanco 40 × 40 × 110',
    clienteId: 'cli-bellas-artes', ubic: ['N1', 'R04', 'B2'], entrada: '2026-08-14', salida: null,
    dims: [40, 40, 110], pesoKg: 28, estado: 'En bodega',
    hist: [
      { fechaHora: '2026-08-14T11:20', evento: 'Entrada', nota: 'Lote de 6 pedestales, este es el 3/6', usuarioId: 'usr-2-mr' },
    ],
  },
  {
    id: 'RD-1047', tipo: 'Obra', descripcion: 'Escultura en bronce — base incluida',
    clienteId: 'cli-arreola', ubic: ['N2', 'R02', 'A1'], entrada: '2026-08-18', salida: null,
    dims: [60, 60, 175], pesoKg: 210, estado: 'Reservado',
    hist: [
      { fechaHora: '2026-08-18T08:05', evento: 'Entrada', nota: 'Traslado desde taller de fundición', usuarioId: 'usr-1-le' },
      { fechaHora: '2026-08-29T12:00', evento: 'Reservado', nota: 'Apartado para MD-204', usuarioId: 'usr-3-ar', mudanzaId: 'MD-204' },
    ],
  },
  {
    id: 'RD-1051', tipo: 'Guacal', descripcion: 'Guacal climatizado — 2 acuarelas enmarcadas',
    clienteId: 'cli-mendoza', ubic: ['N2', 'R14', 'A4'], entrada: '2026-08-20', salida: null,
    dims: [150, 20, 110], pesoKg: 62, estado: 'En bodega',
    piezas: [
      { ref: 'P-01', desc: 'Marina — acuarela enmarcada', largo: 70, ancho: 50 },
      { ref: 'P-02', desc: 'Puerto al alba — acuarela enmarcada', largo: 70, ancho: 50 },
    ],
    hist: [
      { fechaHora: '2026-08-20T16:30', evento: 'Entrada', nota: 'Guacal climatizado, humedad 48%', usuarioId: 'usr-2-mr' },
    ],
  },
  {
    id: 'RD-1055', tipo: 'Vitrina', descripcion: 'Vitrina de cristal templado con base',
    clienteId: 'cli-bellas-artes', ubic: ['N1', 'R07', 'A2'], entrada: '2026-08-22', salida: null,
    dims: [120, 60, 190], pesoKg: 96, estado: 'En bodega',
    hist: [
      { fechaHora: '2026-08-22T09:45', evento: 'Entrada', nota: 'Cristal revisado, sin astillas', usuarioId: 'usr-1-le' },
    ],
  },
  {
    id: 'RD-1060', tipo: 'Guacal', descripcion: 'Guacal de tránsito — políptico 4 tableros',
    clienteId: 'cli-serra', ubic: null, entrada: '2026-08-25', salida: '2026-08-30',
    dims: [220, 40, 160], pesoKg: 188, estado: 'Fuera',
    piezas: [
      { ref: 'P-01', desc: 'Tablero I — acrílico sobre madera', largo: 100, ancho: 150 },
      { ref: 'P-02', desc: 'Tablero II — acrílico sobre madera', largo: 100, ancho: 150 },
      { ref: 'P-03', desc: 'Tablero III — acrílico sobre madera', largo: 100, ancho: 150 },
      { ref: 'P-04', desc: 'Tablero IV — acrílico sobre madera', largo: 100, ancho: 150 },
    ],
    hist: [
      { fechaHora: '2026-08-25T07:50', evento: 'Entrada', nota: 'Recepción en muelle 2', usuarioId: 'usr-2-mr' },
      { fechaHora: '2026-08-30T06:15', evento: 'Salida', nota: 'Cargado en MD-201 — recibe A. Serra (curaduría)', usuarioId: 'usr-1-le', mudanzaId: 'MD-201' },
    ],
  },
  {
    id: 'RD-1062', tipo: 'Obra', descripcion: 'Instalación textil — 3 bultos enrollados',
    clienteId: 'cli-arreola', ubic: ['N3', 'R01', 'C1'], entrada: '2026-08-27', salida: null,
    dims: [300, 45, 45], pesoKg: 54, estado: 'En bodega',
    hist: [
      { fechaHora: '2026-08-27T13:10', evento: 'Entrada', nota: 'Bultos enrollados sobre tubo de cartón', usuarioId: 'usr-2-mr' },
    ],
  },
  {
    id: 'RD-1066', tipo: 'Pedestal', descripcion: 'Pedestal metálico negro 50 × 50 × 90',
    clienteId: 'cli-serra', ubic: ['N1', 'R04', 'B3'], entrada: '2026-08-29', salida: null,
    dims: [50, 50, 90], pesoKg: 41, estado: 'En bodega',
    hist: [
      { fechaHora: '2026-08-29T10:35', evento: 'Entrada', nota: 'Pintura retocada antes de almacenar', usuarioId: 'usr-1-le' },
    ],
  },
]

function ubicacionDe(ubic: [string, string, string] | null): Objeto['ubicacion'] {
  if (!ubic) return null
  const [nave, rack, nivel] = ubic
  return { nave, rack, nivel }
}

export function construirObjetosYMovimientos(): { objetos: Objeto[]; movimientos: Movimiento[] } {
  const objetos: Objeto[] = []
  const movimientos: Movimiento[] = []

  for (const s of OBJETOS_SEED) {
    objetos.push({
      id: s.id,
      tipo: s.tipo,
      descripcion: s.descripcion,
      clienteId: s.clienteId,
      ubicacion: ubicacionDe(s.ubic),
      medidas: { largo: s.dims[0], ancho: s.dims[1], alto: s.dims[2] },
      pesoKg: s.pesoKg,
      fotoUrl: null,
      estado: s.estado,
      fechaEntrada: s.entrada,
      fechaSalida: s.salida,
      contenedorId: null,
      ref: null,
    })

    s.piezas?.forEach((p) => {
      objetos.push({
        id: `${s.id}-${p.ref}`,
        tipo: 'Obra',
        descripcion: p.desc,
        clienteId: s.clienteId,
        ubicacion: ubicacionDe(s.ubic),
        medidas: { largo: p.largo, ancho: p.ancho, alto: null },
        pesoKg: null,
        fotoUrl: null,
        estado: s.estado,
        fechaEntrada: s.entrada,
        fechaSalida: s.salida,
        contenedorId: s.id,
        ref: p.ref,
      })
    })

    s.hist.forEach((h, i) => {
      movimientos.push({
        id: `${s.id}-mov-${i + 1}`,
        objetoId: s.id,
        evento: h.evento,
        fechaHora: h.fechaHora,
        nota: h.nota,
        usuarioId: h.usuarioId,
        recibeNombre: null,
        recibeDoc: null,
        firmaUrl: null,
        mudanzaId: h.mudanzaId ?? null,
      })
    })
  }

  return { objetos, movimientos }
}

export const MUDANZAS: Mudanza[] = [
  { codigo: 'MD-201', clienteId: 'cli-serra', fecha: '2026-08-30', destino: 'Sala 3, Fundación Serra', cuadrilla: '4 personas · camión 7t', estado: 'En tránsito' },
  { codigo: 'MD-204', clienteId: 'cli-arreola', fecha: '2026-09-03', destino: 'Residencia Lomas, planta baja', cuadrilla: '3 personas · camioneta', estado: 'Reservado' },
  { codigo: 'MD-198', clienteId: 'cli-bellas-artes', fecha: '2026-08-21', destino: 'Bodega Norte', cuadrilla: '5 personas · camión 12t', estado: 'Cerrada' },
]

export const MUDANZA_OBJETOS: MudanzaObjeto[] = [
  { mudanzaId: 'MD-201', objetoId: 'RD-1060', estadoCarga: 'Cargado' },
  { mudanzaId: 'MD-201', objetoId: 'RD-1066', estadoCarga: 'Cargado' },
  { mudanzaId: 'MD-201', objetoId: 'RD-1055', estadoCarga: 'Pendiente' },
  { mudanzaId: 'MD-201', objetoId: 'RD-1051', estadoCarga: 'Pendiente' },
  { mudanzaId: 'MD-204', objetoId: 'RD-1047', estadoCarga: 'Pendiente' },
  { mudanzaId: 'MD-204', objetoId: 'RD-1062', estadoCarga: 'Pendiente' },
  { mudanzaId: 'MD-198', objetoId: 'RD-1043', estadoCarga: 'Devuelto' },
  { mudanzaId: 'MD-198', objetoId: 'RD-1055', estadoCarga: 'Devuelto' },
]

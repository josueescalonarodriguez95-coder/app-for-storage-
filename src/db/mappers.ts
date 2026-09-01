/*
  Supabase/Postgres usa columnas snake_case (ver supabase/schema.sql); el resto de la app usa
  camelCase (ver schema.ts). Estas funciones son la única frontera entre los dos mundos —
  repo.ts y mutations.ts no deberían tocar nombres de columna directamente.
*/
import type { Cliente, Mudanza, MudanzaObjeto, Movimiento, Objeto, Usuario } from './schema'

type Fila = Record<string, unknown>

export function filaAObjeto(f: Fila): Objeto {
  return {
    id: f.id as string,
    tipo: f.tipo as Objeto['tipo'],
    descripcion: f.descripcion as string,
    clienteId: f.cliente_id as string,
    ubicacion: (f.ubicacion as Objeto['ubicacion']) ?? null,
    medidas: f.medidas as Objeto['medidas'],
    pesoKg: (f.peso_kg as number | null) ?? null,
    fotoUrl: (f.foto_url as string | null) ?? null,
    estado: f.estado as Objeto['estado'],
    fechaEntrada: f.fecha_entrada as string,
    fechaSalida: (f.fecha_salida as string | null) ?? null,
    contenedorId: (f.contenedor_id as string | null) ?? null,
    ref: (f.ref as string | null) ?? null,
  }
}

export function objetoAFila(o: Objeto): Fila {
  return {
    id: o.id,
    tipo: o.tipo,
    descripcion: o.descripcion,
    cliente_id: o.clienteId,
    ubicacion: o.ubicacion,
    medidas: o.medidas,
    peso_kg: o.pesoKg,
    foto_url: o.fotoUrl,
    estado: o.estado,
    fecha_entrada: o.fechaEntrada,
    fecha_salida: o.fechaSalida,
    contenedor_id: o.contenedorId,
    ref: o.ref,
  }
}

export function filaAMovimiento(f: Fila): Movimiento {
  return {
    id: f.id as string,
    objetoId: f.objeto_id as string,
    evento: f.evento as Movimiento['evento'],
    fechaHora: f.fecha_hora as string,
    nota: f.nota as string,
    usuarioId: f.usuario_id as string,
    recibeNombre: (f.recibe_nombre as string | null) ?? null,
    recibeDoc: (f.recibe_doc as string | null) ?? null,
    firmaUrl: (f.firma_url as string | null) ?? null,
    mudanzaId: (f.mudanza_id as string | null) ?? null,
  }
}

export function movimientoAFila(m: Movimiento): Fila {
  return {
    id: m.id,
    objeto_id: m.objetoId,
    evento: m.evento,
    fecha_hora: m.fechaHora,
    nota: m.nota,
    usuario_id: m.usuarioId,
    recibe_nombre: m.recibeNombre,
    recibe_doc: m.recibeDoc,
    firma_url: m.firmaUrl,
    mudanza_id: m.mudanzaId,
  }
}

export function filaAMudanza(f: Fila): Mudanza {
  return {
    codigo: f.codigo as string,
    clienteId: f.cliente_id as string,
    fecha: f.fecha as string,
    destino: f.destino as string,
    cuadrilla: f.cuadrilla as string,
    estado: f.estado as Mudanza['estado'],
  }
}

export function mudanzaAFila(m: Mudanza): Fila {
  return {
    codigo: m.codigo,
    cliente_id: m.clienteId,
    fecha: m.fecha,
    destino: m.destino,
    cuadrilla: m.cuadrilla,
    estado: m.estado,
  }
}

export function filaAMudanzaObjeto(f: Fila): MudanzaObjeto {
  return {
    mudanzaId: f.mudanza_id as string,
    objetoId: f.objeto_id as string,
    estadoCarga: f.estado_carga as MudanzaObjeto['estadoCarga'],
  }
}

export function mudanzaObjetoAFila(m: MudanzaObjeto): Fila {
  return {
    mudanza_id: m.mudanzaId,
    objeto_id: m.objetoId,
    estado_carga: m.estadoCarga,
  }
}

// clientes y usuarios tienen las mismas columnas en camelCase y snake_case (nombres de una sola
// palabra), así que no hace falta mapear — sólo tipar lo que devuelve Supabase.
export function filaACliente(f: Fila): Cliente {
  return f as unknown as Cliente
}

export function filaAUsuario(f: Fila): Usuario {
  return f as unknown as Usuario
}

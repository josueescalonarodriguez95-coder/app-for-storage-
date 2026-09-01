import { useEffect, useState } from 'react'
import { EstadoCargaBadge, EstadoMudanzaBadge } from '../components/ui/Badge'
import { DataCard } from '../components/ui/DataCard'
import { listObjetosDeMudanza } from '../db/repo'
import type { Objeto } from '../db/schema'
import { useAppState } from '../state/AppStateContext'
import { nombreCliente } from '../state/selectors'
import { formatFecha } from '../utils/fecha'
import { formatUbicacion } from '../utils/formato'

const COLUMNAS = '104px 1fr 128px 118px'

interface Vinculo {
  objeto: Objeto
  carga: 'Pendiente' | 'Cargado' | 'Devuelto'
}

export function MovesScreen() {
  const { state, dispatch } = useAppState()
  const [porMudanza, setPorMudanza] = useState<Record<string, Vinculo[]>>({})

  const mud = state.mudanzas.find((m) => m.codigo === state.mudSel) ?? null
  const vinculados = mud ? (porMudanza[mud.codigo] ?? []) : []

  useEffect(() => {
    let cancelado = false
    Promise.all(
      state.mudanzas.map(async (m) => {
        const filas = await listObjetosDeMudanza(m.codigo)
        return [m.codigo, filas.map((f) => ({ objeto: f.objeto as Objeto, carga: f.vinculo.estadoCarga }))] as const
      }),
    ).then((entradas) => {
      if (!cancelado) setPorMudanza(Object.fromEntries(entradas))
    })
    return () => {
      cancelado = true
    }
  }, [state.mudanzas])

  if (!mud) {
    return (
      <div style={{ padding: '18px 26px 30px' }}>
        <p style={{ font: 'var(--text-body)', color: 'var(--color-text-dim)' }}>No hay mudanzas registradas.</p>
      </div>
    )
  }

  const cargados = vinculados.filter((v) => v.carga === 'Cargado').length
  const progreso =
    mud.estado === 'Cerrada'
      ? `Mudanza cerrada el ${formatFecha(mud.fecha)} · acta firmada`
      : `${cargados} de ${vinculados.length} objetos cargados`

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 'var(--width-mudanzas-list)', flex: 'none', padding: 16, minHeight: 0, overflow: 'auto' }}>
        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface-strong)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
          {state.mudanzas.map((m) => {
            const activo = state.mudSel === m.codigo
            const filas = porMudanza[m.codigo] ?? []
            return (
              <button
                key={m.codigo}
                onClick={() => dispatch({ type: 'SET_MUD_SEL', mudSel: m.codigo })}
                style={{
                  appearance: 'none',
                  border: 0,
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '15px 16px',
                  borderBottom: '.5px solid var(--color-hairline)',
                  fontFamily: 'inherit',
                  background: activo ? 'rgba(224,71,47,.1)' : 'transparent',
                  color: 'var(--color-text-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 17, fontWeight: 680, letterSpacing: '-0.025em' }}>{m.codigo}</span>
                  <span style={{ fontSize: 13, opacity: 0.65, fontVariantNumeric: 'tabular-nums' }}>{formatFecha(m.fecha)}</span>
                </div>
                <div style={{ fontSize: 15, letterSpacing: '-0.015em', marginTop: 3 }}>{nombreCliente(state.clientes, m.clienteId)}</div>
                <div style={{ fontSize: 13, opacity: 0.62, marginTop: 5 }}>
                  {filas.length} objetos · {filas.filter((v) => v.carga === 'Cargado').length} cargados
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, padding: '18px 26px 26px 6px', minWidth: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em' }}>{mud.codigo}</div>
          <EstadoMudanzaBadge estado={mud.estado} size="lg" />
        </div>
        <div style={{ fontSize: 16, color: 'var(--color-text-secondary)', letterSpacing: '-0.015em', margin: '5px 0 16px' }}>
          {nombreCliente(state.clientes, mud.clienteId)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <DataCard etiqueta="Fecha" valor={formatFecha(mud.fecha)} />
          <DataCard etiqueta="Destino" valor={mud.destino} />
          <DataCard etiqueta="Cuadrilla" valor={mud.cuadrilla} />
        </div>

        <div style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-card-surface)', boxShadow: 'var(--shadow-card-strong)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)' }}>OBJETOS VINCULADOS</span>
            <button
              className="boton-cristal"
              onClick={() => dispatch({ type: 'IR_A', screen: 'scan' })}
              style={{ appearance: 'none', border: 0, cursor: 'pointer', minHeight: 34, padding: '0 14px', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, fontWeight: 560, color: 'var(--color-accent)' }}
            >
              + Vincular escaneando
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: COLUMNAS, padding: '11px 18px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-dim)', borderBottom: '.5px solid var(--color-hairline-strong)' }}>
            <span>N.º</span>
            <span>Descripción</span>
            <span>Ubicación</span>
            <span>Cargado</span>
          </div>
          {vinculados.map(({ objeto, carga }) => (
            <div key={objeto.id} style={{ display: 'grid', gridTemplateColumns: COLUMNAS, alignItems: 'center', padding: '13px 18px', borderBottom: '.5px solid var(--color-hairline)', fontSize: 15, letterSpacing: '-0.015em' }}>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{objeto.id}</span>
              <span style={{ paddingRight: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objeto.descripcion}</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{formatUbicacion(objeto.ubicacion)}</span>
              <span>
                <EstadoCargaBadge estado={carga} />
              </span>
            </div>
          ))}
        </div>

        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-text-dim)', letterSpacing: '-0.01em' }}>{progreso}</p>
      </div>
    </div>
  )
}

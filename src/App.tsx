import { useEffect, useState } from 'react'
import { seedIfEmpty, listObjetos, listClientes, listUsuarios, listMudanzas } from './db/repo'

function App() {
  const [resumen, setResumen] = useState<string>('Cargando IndexedDB…')

  useEffect(() => {
    seedIfEmpty()
      .then(async () => {
        const [objetos, clientes, usuarios, mudanzas] = await Promise.all([
          listObjetos(),
          listClientes(),
          listUsuarios(),
          listMudanzas(),
        ])
        setResumen(
          `${objetos.length} objetos · ${clientes.length} clientes · ${usuarios.length} usuarios · ${mudanzas.length} mudanzas — cargados desde IndexedDB`,
        )
      })
      .catch((err) => setResumen(`Error al sembrar IndexedDB: ${String(err)}`))
  }, [])

  return (
    <div style={{ padding: 'var(--space-9)' }}>
      <p style={{ font: 'var(--text-screen-title)', letterSpacing: 'var(--tracking-screen-title)' }}>
        Storage Control
      </p>
      <p style={{ font: 'var(--text-secondary-meta)', color: 'var(--color-text-dim)' }}>
        Paso 2: modelo de datos e IndexedDB. La navegación llega en el paso siguiente.
      </p>
      <p data-testid="resumen-seed" style={{ font: 'var(--text-body)' }}>
        {resumen}
      </p>
    </div>
  )
}

export default App

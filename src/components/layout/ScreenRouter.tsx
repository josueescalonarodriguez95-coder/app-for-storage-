import { useAppState } from '../../state/AppStateContext'
import { Placeholder } from '../../screens/Placeholder'
import { InventoryScreen } from '../../screens/InventoryScreen'

export function ScreenRouter() {
  const { state } = useAppState()

  switch (state.screen) {
    case 'inv':
      return <InventoryScreen />
    case 'scan':
      return <Placeholder nombre="Escáner QR" />
    case 'entrada':
      return <Placeholder nombre="Registrar entrada" />
    case 'salida':
      return <Placeholder nombre="Registrar salida" />
    case 'detalle':
      return <Placeholder nombre="Ficha del objeto" />
    case 'mud':
      return <Placeholder nombre="Mudanzas" />
    case 'etq':
      return <Placeholder nombre="Etiquetas QR" />
  }
}

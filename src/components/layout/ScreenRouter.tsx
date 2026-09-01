import { useAppState } from '../../state/AppStateContext'
import { Placeholder } from '../../screens/Placeholder'
import { InventoryScreen } from '../../screens/InventoryScreen'
import { ItemDetailScreen } from '../../screens/ItemDetailScreen'
import { CheckInScreen } from '../../screens/CheckInScreen'
import { CheckOutScreen } from '../../screens/CheckOutScreen'

export function ScreenRouter() {
  const { state } = useAppState()

  switch (state.screen) {
    case 'inv':
      return <InventoryScreen />
    case 'detalle':
      return <ItemDetailScreen />
    case 'scan':
      return <Placeholder nombre="Escáner QR" />
    case 'entrada':
      return <CheckInScreen />
    case 'salida':
      return <CheckOutScreen />
    case 'mud':
      return <Placeholder nombre="Mudanzas" />
    case 'etq':
      return <Placeholder nombre="Etiquetas QR" />
  }
}

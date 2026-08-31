import { AppShell } from './components/layout/AppShell'
import { AppStateProvider } from './state/AppStateContext'

function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  )
}

export default App

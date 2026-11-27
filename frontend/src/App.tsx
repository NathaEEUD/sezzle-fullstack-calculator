import { createCalculatorClient } from './api/client'
import { Calculator } from './components/Calculator'

const client = createCalculatorClient(fetch.bind(globalThis))

export function App() {
  return <Calculator client={client} />
}

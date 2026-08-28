// Límite de errores genérico: sin esto, un error de render en cualquier
// parte del árbol (p. ej. el cerebro 3D) hace que React desmonte TODO lo
// que hay por encima de él sin avisar — la vista entera se queda en
// blanco de golpe, exactamente como "si hubiera crusheado". Con esto, el
// fallo queda contenido en el panel que falló y el resto de la interfaz
// sigue funcionando.
import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("Error capturado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

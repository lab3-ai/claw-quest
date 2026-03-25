/// <reference types="vite/client" />

// react-helmet-async v2/v3 ships React 19 types incompatible with React 18's JSX element type.
declare module 'react-helmet-async' {
  import * as React from 'react'
  export interface HelmetProps {
    children?: React.ReactNode
  }
  export interface ProviderProps {
    context?: object
    children?: React.ReactNode
  }
  export const Helmet: React.FC<HelmetProps>
  export const HelmetProvider: React.FC<ProviderProps>
}

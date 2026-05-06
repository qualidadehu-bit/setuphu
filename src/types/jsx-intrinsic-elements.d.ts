import type * as React from 'react';

declare global {
  namespace JSX {
    /**
     * Ensure global JSX elements resolve through React's type map.
     * If React types fail to load in the editor, keep a permissive fallback.
     */
    interface IntrinsicElements extends React.JSX.IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

/// <reference types="react" />
/// <reference types="react-dom" />

declare global {
  namespace JSX {
    // Extend the IntrinsicElements interface if needed
    interface IntrinsicElements extends React.JSX.IntrinsicElements {
      // Add custom elements here if needed
      // Example: 'my-custom-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'custom-element'?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
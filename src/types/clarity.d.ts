import React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "cds-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        shape?: string;
        solid?: string;
        inverse?: string;
        direction?: string;
        size?: string;

        [key: `data-${string}`]: string | undefined;
        [key: `aria-${string}`]: string | undefined;
      };
    }
  }
}
